import crypto from 'crypto';

export class CSRFService {
  private static readonly TOKEN_KEY = 'csrf_token';

  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static setToken(token: string): void {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  static validateToken(formData: FormData | string): boolean {
    const sessionToken = this.getToken();
    if (!sessionToken) return false;

    const formToken = typeof formData === 'string' 
      ? formData 
      : formData.get('csrf_token')?.toString();

    return formToken === sessionToken;
  }

  static validateOrigin(currentOrigin: string, expectedOrigin: string): boolean {
    return currentOrigin === expectedOrigin;
  }

  static createTokenInput(): string {
    const token = this.getToken();
    if (!token) return '';
    return `<input type="hidden" name="csrf_token" value="${token}" />`;
  }

  static getTokenForForm(): string {
    return this.getToken() || '';
  }
}