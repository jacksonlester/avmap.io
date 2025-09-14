import crypto from 'crypto';

// In production, these would come from Supabase secrets
// For now, using localStorage for demo purposes
const ADMIN_EMAIL = 'admin@avmap.com';
const ADMIN_PASSWORD = 'admin123'; // This should be hashed in production

export interface SessionData {
  email: string;
  loginTime: number;
  sessionId: string;
}

export class AuthService {
  private static readonly STORAGE_KEY = 'avmap_admin_session';
  private static readonly SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours

  static async validateCredentials(email: string, password: string): Promise<boolean> {
    // Constant-time comparison to prevent timing attacks
    const emailMatch = this.constantTimeCompare(email, ADMIN_EMAIL);
    const passwordMatch = this.constantTimeCompare(password, ADMIN_PASSWORD);
    
    return emailMatch && passwordMatch;
  }

  private static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  static async createSession(email: string): Promise<string> {
    const sessionData: SessionData = {
      email,
      loginTime: Date.now(),
      sessionId: crypto.randomUUID()
    };

    // Store in localStorage (for demo - in production use secure HTTP-only cookies)
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData));
    }

    return sessionData.sessionId;
  }

  static validateSession(): SessionData | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const sessionData: SessionData = JSON.parse(stored);
      
      // Check if session has expired
      if (Date.now() - sessionData.loginTime > this.SESSION_DURATION) {
        this.logout();
        return null;
      }

      return sessionData;
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  static logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  static getClientIP(): string {
    // In a real implementation, this would be handled server-side
    return '127.0.0.1';
  }

  static checkIPAllowlist(ip: string): boolean {
    // For demo purposes, always return true
    // In production, this would check against ADMIN_IP_ALLOWLIST
    return true;
  }

  static isAuthenticated(): boolean {
    return this.validateSession() !== null;
  }
}