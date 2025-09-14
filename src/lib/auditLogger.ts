import fs from 'fs/promises';
import path from 'path';

export interface AuditEntry {
  timestamp: string;
  actor: string;
  entity: string;
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'restore' | 'login' | 'logout';
  message: string;
  diff?: any;
  ip?: string;
}

export class AuditLogger {
  private static readonly AUDIT_DIR = './data/.audit';
  private static readonly LOG_FILE = 'log.jsonl';

  private static async ensureAuditDir(): Promise<void> {
    try {
      await fs.mkdir(this.AUDIT_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  static async log(entry: Omit<AuditEntry, 'timestamp'> & { timestamp?: string }): Promise<void> {
    await this.ensureAuditDir();
    
    const auditEntry: AuditEntry = {
      timestamp: entry.timestamp || new Date().toISOString(),
      ...entry
    };

    const logLine = JSON.stringify(auditEntry) + '\n';
    const logPath = path.join(this.AUDIT_DIR, this.LOG_FILE);
    
    try {
      await fs.appendFile(logPath, logLine);
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  static async getRecentEntries(limit: number = 100): Promise<AuditEntry[]> {
    try {
      const logPath = path.join(this.AUDIT_DIR, this.LOG_FILE);
      const content = await fs.readFile(logPath, 'utf-8');
      
      const lines = content.trim().split('\n').filter(Boolean);
      const entries = lines
        .slice(-limit) // Get last N lines
        .map(line => JSON.parse(line))
        .reverse(); // Most recent first

      return entries;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  static async getEntitiesHistory(entity: string, entityId: string, limit: number = 50): Promise<AuditEntry[]> {
    try {
      const logPath = path.join(this.AUDIT_DIR, this.LOG_FILE);
      const content = await fs.readFile(logPath, 'utf-8');
      
      const lines = content.trim().split('\n').filter(Boolean);
      const entries = lines
        .map(line => JSON.parse(line))
        .filter((entry: AuditEntry) => entry.entity === entity && entry.entityId === entityId)
        .slice(-limit)
        .reverse();

      return entries;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  static async getStats(): Promise<{
    totalEntries: number;
    recentActivity: { date: string; count: number }[];
    topActors: { actor: string; count: number }[];
  }> {
    try {
      const logPath = path.join(this.AUDIT_DIR, this.LOG_FILE);
      const content = await fs.readFile(logPath, 'utf-8');
      
      const lines = content.trim().split('\n').filter(Boolean);
      const entries: AuditEntry[] = lines.map(line => JSON.parse(line));

      // Recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentEntries = entries.filter(entry => 
        new Date(entry.timestamp) > sevenDaysAgo
      );

      const activityByDate = recentEntries.reduce((acc, entry) => {
        const date = entry.timestamp.split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const recentActivity = Object.entries(activityByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Top actors
      const actorCounts = entries.reduce((acc, entry) => {
        acc[entry.actor] = (acc[entry.actor] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topActors = Object.entries(actorCounts)
        .map(([actor, count]) => ({ actor, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalEntries: entries.length,
        recentActivity,
        topActors
      };
    } catch (error) {
      return {
        totalEntries: 0,
        recentActivity: [],
        topActors: []
      };
    }
  }
}