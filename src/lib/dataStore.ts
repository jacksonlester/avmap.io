import { AuditLogger } from './auditLogger';

export interface DataStore {
  read<T>(entity: string, id: string): Promise<T | null>;
  write<T>(entity: string, id: string, data: T, actor: string, message?: string): Promise<void>;
  list<T>(entity: string): Promise<Record<string, T>>;
  delete(entity: string, id: string, actor: string, message?: string): Promise<void>;
  getVersions<T>(entity: string, id: string): Promise<Array<{ timestamp: string; data: T }>>;
  restore<T>(entity: string, id: string, timestamp: string, actor: string): Promise<void>;
}

export class BrowserJsonStore implements DataStore {
  private readonly storagePrefix: string;

  constructor(storagePrefix: string = 'avmap_admin') {
    this.storagePrefix = storagePrefix;
  }

  private getStorageKey(entity: string): string {
    return `${this.storagePrefix}_${entity}`;
  }

  private getVersionKey(entity: string, id: string): string {
    return `${this.storagePrefix}_versions_${entity}_${id}`;
  }

  async read<T>(entity: string, id: string): Promise<T | null> {
    try {
      const key = this.getStorageKey(entity);
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      
      const data = JSON.parse(stored);
      return data[id] || null;
    } catch (error) {
      console.error(`Failed to read ${entity}:${id}`, error);
      return null;
    }
  }

  async write<T>(entity: string, id: string, data: T, actor: string, message?: string): Promise<void> {
    // Check if read-only mode
    if (this.isReadOnly()) {
      throw new Error('System is in read-only mode');
    }

    try {
      const key = this.getStorageKey(entity);
      
      // Read existing data
      let existingData: Record<string, T> = {};
      const stored = localStorage.getItem(key);
      if (stored) {
        existingData = JSON.parse(stored);
      }

      const oldValue = existingData[id];
      
      // Save version before updating
      if (oldValue) {
        await this.saveVersion(entity, id, oldValue);
      }

      // Update data
      existingData[id] = data;
      localStorage.setItem(key, JSON.stringify(existingData));

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
    } catch (error) {
      console.error(`Failed to write ${entity}:${id}`, error);
      throw error;
    }
  }

  async list<T>(entity: string): Promise<Record<string, T>> {
    try {
      const key = this.getStorageKey(entity);
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error(`Failed to list ${entity}`, error);
      return {};
    }
  }

  async delete(entity: string, id: string, actor: string, message?: string): Promise<void> {
    if (this.isReadOnly()) {
      throw new Error('System is in read-only mode');
    }

    try {
      const key = this.getStorageKey(entity);
      const stored = localStorage.getItem(key);
      if (!stored) return;

      const existingData = JSON.parse(stored);
      const oldValue = existingData[id];
      if (!oldValue) return;

      // Save final version
      await this.saveVersion(entity, id, oldValue);

      // Remove from data
      delete existingData[id];
      localStorage.setItem(key, JSON.stringify(existingData));

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
    } catch (error) {
      console.error(`Failed to delete ${entity}:${id}`, error);
      throw error;
    }
  }

  async getVersions<T>(entity: string, id: string): Promise<Array<{ timestamp: string; data: T }>> {
    try {
      const key = this.getVersionKey(entity, id);
      const stored = localStorage.getItem(key);
      if (!stored) return [];

      const versions = JSON.parse(stored) as Array<{ timestamp: string; data: T }>;
      return versions.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 10);
    } catch (error) {
      console.error(`Failed to get versions for ${entity}:${id}`, error);
      return [];
    }
  }

  async restore<T>(entity: string, id: string, timestamp: string, actor: string): Promise<void> {
    if (this.isReadOnly()) {
      throw new Error('System is in read-only mode');
    }

    try {
      const versions = await this.getVersions<T>(entity, id);
      const version = versions.find(v => v.timestamp === timestamp);
      
      if (!version) {
        throw new Error(`Version ${timestamp} not found`);
      }

      await this.write(entity, id, version.data, actor, `Restored from version ${timestamp}`);
    } catch (error) {
      console.error(`Failed to restore ${entity}:${id} to ${timestamp}`, error);
      throw error;
    }
  }

  private async saveVersion<T>(entity: string, id: string, data: T): Promise<string> {
    const timestamp = new Date().toISOString();
    const key = this.getVersionKey(entity, id);
    
    try {
      const stored = localStorage.getItem(key);
      const versions = stored ? JSON.parse(stored) : [];
      
      versions.push({ timestamp, data });
      
      // Keep only last 20 versions
      const sortedVersions = versions
        .sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 20);
      
      localStorage.setItem(key, JSON.stringify(sortedVersions));
      
      return timestamp;
    } catch (error) {
      console.error(`Failed to save version for ${entity}:${id}`, error);
      return timestamp;
    }
  }

  private isReadOnly(): boolean {
    // For demo purposes, always allow writes in browser
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

// Export browser-compatible store
export const FileJsonStore = BrowserJsonStore;
