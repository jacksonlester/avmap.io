import fs from 'fs/promises';
import path from 'path';
import { AuditLogger } from './auditLogger';

export interface DataStore {
  read<T>(entity: string, id: string): Promise<T | null>;
  write<T>(entity: string, id: string, data: T, actor: string, message?: string): Promise<void>;
  list<T>(entity: string): Promise<Record<string, T>>;
  delete(entity: string, id: string, actor: string, message?: string): Promise<void>;
  getVersions<T>(entity: string, id: string): Promise<Array<{ timestamp: string; data: T }>>;
  restore<T>(entity: string, id: string, timestamp: string, actor: string): Promise<void>;
}

export class FileJsonStore implements DataStore {
  private readonly basePath: string;

  constructor(basePath: string = './data') {
    this.basePath = basePath;
  }

  private getEntityPath(entity: string): string {
    return path.join(this.basePath, `${entity}.json`);
  }

  private getVersionsPath(entity: string, id: string): string {
    return path.join(this.basePath, '.versions', entity, id);
  }

  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  private async saveVersion<T>(entity: string, id: string, data: T): Promise<string> {
    const timestamp = new Date().toISOString();
    const versionsDir = this.getVersionsPath(entity, id);
    await this.ensureDir(versionsDir);
    
    const versionFile = path.join(versionsDir, `${timestamp}.json`);
    await fs.writeFile(versionFile, JSON.stringify(data, null, 2));
    
    return timestamp;
  }

  async read<T>(entity: string, id: string): Promise<T | null> {
    try {
      const entityPath = this.getEntityPath(entity);
      const content = await fs.readFile(entityPath, 'utf-8');
      const data = JSON.parse(content);
      return data[id] || null;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async write<T>(entity: string, id: string, data: T, actor: string, message?: string): Promise<void> {
    // Check if read-only mode
    if (this.isReadOnly()) {
      throw new Error('System is in read-only mode');
    }

    const entityPath = this.getEntityPath(entity);
    
    // Read existing data
    let existingData: Record<string, T> = {};
    try {
      const content = await fs.readFile(entityPath, 'utf-8');
      existingData = JSON.parse(content);
    } catch (error) {
      // File might not exist yet
    }

    const oldValue = existingData[id];
    
    // Save version before updating
    if (oldValue) {
      await this.saveVersion(entity, id, oldValue);
    }

    // Update data
    existingData[id] = data;
    
    // Ensure directory exists
    await this.ensureDir(path.dirname(entityPath));
    
    // Write updated data
    await fs.writeFile(entityPath, JSON.stringify(existingData, null, 2));

    // Save new version
    const timestamp = await this.saveVersion(entity, id, data);

    // Log to audit
    await AuditLogger.log({
      entity,
      entityId: id,
      action: oldValue ? 'update' : 'create',
      actor,
      message: message || `${oldValue ? 'Updated' : 'Created'} ${entity} ${id}`,
      timestamp,
      diff: this.computeDiff(oldValue, data)
    });
  }

  async list<T>(entity: string): Promise<Record<string, T>> {
    try {
      const entityPath = this.getEntityPath(entity);
      const content = await fs.readFile(entityPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }

  async delete(entity: string, id: string, actor: string, message?: string): Promise<void> {
    if (this.isReadOnly()) {
      throw new Error('System is in read-only mode');
    }

    const entityPath = this.getEntityPath(entity);
    
    // Read existing data
    let existingData: Record<string, any> = {};
    try {
      const content = await fs.readFile(entityPath, 'utf-8');
      existingData = JSON.parse(content);
    } catch (error) {
      return; // Nothing to delete
    }

    const oldValue = existingData[id];
    if (!oldValue) return;

    // Save final version
    await this.saveVersion(entity, id, oldValue);

    // Remove from data
    delete existingData[id];
    
    // Write updated data
    await fs.writeFile(entityPath, JSON.stringify(existingData, null, 2));

    // Log to audit
    await AuditLogger.log({
      entity,
      entityId: id,
      action: 'delete',
      actor,
      message: message || `Deleted ${entity} ${id}`,
      timestamp: new Date().toISOString(),
      diff: { deleted: oldValue }
    });
  }

  async getVersions<T>(entity: string, id: string): Promise<Array<{ timestamp: string; data: T }>> {
    try {
      const versionsDir = this.getVersionsPath(entity, id);
      const files = await fs.readdir(versionsDir);
      
      const versions = await Promise.all(
        files
          .filter(f => f.endsWith('.json'))
          .sort((a, b) => b.localeCompare(a)) // Latest first
          .slice(0, 10) // Last 10 versions
          .map(async (file) => {
            const timestamp = file.replace('.json', '');
            const content = await fs.readFile(path.join(versionsDir, file), 'utf-8');
            return { timestamp, data: JSON.parse(content) };
          })
      );

      return versions;
    } catch (error) {
      return [];
    }
  }

  async restore<T>(entity: string, id: string, timestamp: string, actor: string): Promise<void> {
    if (this.isReadOnly()) {
      throw new Error('System is in read-only mode');
    }

    const versionFile = path.join(this.getVersionsPath(entity, id), `${timestamp}.json`);
    
    try {
      const content = await fs.readFile(versionFile, 'utf-8');
      const versionData = JSON.parse(content);
      
      await this.write(entity, id, versionData, actor, `Restored from version ${timestamp}`);
    } catch (error) {
      throw new Error(`Failed to restore version ${timestamp}: ${error}`);
    }
  }

  private isReadOnly(): boolean {
    const readOnly = process.env.READ_ONLY;
    const allowWrites = process.env.ALLOW_WRITES_IN_PROD;
    
    if (process.env.NODE_ENV === 'development') {
      return false; // Writes always allowed in dev
    }

    if (readOnly === 'true') {
      return true; // Explicitly read-only
    }

    if (process.env.NODE_ENV === 'production' && allowWrites !== 'true') {
      return true; // Prod requires explicit write permission
    }

    return false;
  }

  private computeDiff(oldValue: any, newValue: any): any {
    if (!oldValue) return { created: newValue };
    
    const diff: any = {};
    
    // Simple shallow diff
    const allKeys = new Set([...Object.keys(oldValue || {}), ...Object.keys(newValue || {})]);
    
    for (const key of allKeys) {
      if (oldValue[key] !== newValue[key]) {
        diff[key] = { from: oldValue[key], to: newValue[key] };
      }
    }

    return Object.keys(diff).length > 0 ? diff : null;
  }
}