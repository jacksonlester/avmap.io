interface RateLimitEntry {
  attempts: number;
  lastAttempt: number;
  lockedUntil?: number;
}

export class RateLimiter {
  private static attempts = new Map<string, RateLimitEntry>();
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly WINDOW_MS = 10 * 60 * 1000; // 10 minutes
  private static readonly LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

  static isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = this.attempts.get(ip);

    if (!entry) return false;

    // Check if still locked out
    if (entry.lockedUntil && now < entry.lockedUntil) {
      return true;
    }

    // Reset if window has passed
    if (now - entry.lastAttempt > this.WINDOW_MS) {
      this.attempts.delete(ip);
      return false;
    }

    return entry.attempts >= this.MAX_ATTEMPTS;
  }

  static recordAttempt(ip: string, success: boolean): void {
    const now = Date.now();
    const entry = this.attempts.get(ip) || { attempts: 0, lastAttempt: 0 };

    if (success) {
      // Clear on successful login
      this.attempts.delete(ip);
      return;
    }

    // Reset counter if window has passed
    if (now - entry.lastAttempt > this.WINDOW_MS) {
      entry.attempts = 1;
    } else {
      entry.attempts++;
    }

    entry.lastAttempt = now;

    // Lock out if max attempts reached
    if (entry.attempts >= this.MAX_ATTEMPTS) {
      entry.lockedUntil = now + this.LOCKOUT_MS;
      console.warn(`IP ${ip} locked out after ${entry.attempts} failed attempts at ${new Date(now).toISOString()}`);
    }

    this.attempts.set(ip, entry);

    // Log failed attempt
    console.warn(`Failed login attempt ${entry.attempts}/${this.MAX_ATTEMPTS} from IP ${ip} at ${new Date(now).toISOString()}`);
  }

  static getRemainingLockoutTime(ip: string): number {
    const entry = this.attempts.get(ip);
    if (!entry?.lockedUntil) return 0;
    
    const remaining = entry.lockedUntil - Date.now();
    return Math.max(0, remaining);
  }

  // Cleanup old entries periodically
  static cleanup(): void {
    const now = Date.now();
    for (const [ip, entry] of this.attempts.entries()) {
      if (now - entry.lastAttempt > this.WINDOW_MS && (!entry.lockedUntil || now > entry.lockedUntil)) {
        this.attempts.delete(ip);
      }
    }
  }
}

// Cleanup every hour
if (typeof window === 'undefined') {
  setInterval(() => RateLimiter.cleanup(), 60 * 60 * 1000);
}