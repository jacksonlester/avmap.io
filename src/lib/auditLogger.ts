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
  private static readonly STORAGE_KEY = 'avmap_admin_audit_log';

  static async log(entry: Omit<AuditEntry, 'timestamp'> & { timestamp?: string }): Promise<void> {
    try {
      const auditEntry: AuditEntry = {
        timestamp: entry.timestamp || new Date().toISOString(),
        ...entry
      };

      // Get existing logs
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const logs = stored ? JSON.parse(stored) : [];
      
      // Add new entry
      logs.push(auditEntry);
      
      // Keep only last 1000 entries
      const trimmedLogs = logs.slice(-1000);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedLogs));
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  static async getRecentEntries(limit: number = 100): Promise<AuditEntry[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];

      const logs = JSON.parse(stored) as AuditEntry[];
      return logs
        .slice(-limit)
        .reverse(); // Most recent first
    } catch (error) {
      console.error('Failed to read audit log:', error);
      return [];
    }
  }

  static async getEntitiesHistory(entity: string, entityId: string, limit: number = 50): Promise<AuditEntry[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];

      const logs = JSON.parse(stored) as AuditEntry[];
      return logs
        .filter(entry => entry.entity === entity && entry.entityId === entityId)
        .slice(-limit)
        .reverse();
    } catch (error) {
      console.error('Failed to read entity history:', error);
      return [];
    }
  }

  static async getStats(): Promise<{
    totalEntries: number;
    recentActivity: { date: string; count: number }[];
    topActors: { actor: string; count: number }[];
  }> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return {
          totalEntries: 0,
          recentActivity: [],
          topActors: []
        };
      }

      const logs = JSON.parse(stored) as AuditEntry[];

      // Recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentEntries = logs.filter(entry => 
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
      const actorCounts = logs.reduce((acc, entry) => {
        acc[entry.actor] = (acc[entry.actor] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topActors = Object.entries(actorCounts)
        .map(([actor, count]) => ({ actor, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalEntries: logs.length,
        recentActivity,
        topActors
      };
    } catch (error) {
      console.error('Failed to get audit stats:', error);
      return {
        totalEntries: 0,
        recentActivity: [],
        topActors: []
      };
    }
  }
}
