import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthService } from '@/lib/auth';
import { CSRFService } from '@/lib/csrf';
import { RateLimiter } from '@/lib/rateLimiter';
import { AuditLogger } from '@/lib/auditLogger';
import { LoginSchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [csrfToken, setCsrfToken] = useState('');
  const [lockoutTime, setLockoutTime] = useState(0);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    // Check if already authenticated
    if (AuthService.isAuthenticated()) {
      const redirectTo = searchParams.get('redirect') || '/admin';
      navigate(redirectTo);
      return;
    }

    // Generate CSRF token
    const token = CSRFService.generateToken();
    CSRFService.setToken(token);
    setCsrfToken(token);

    // Check if rate limited
    updateLockoutStatus();
    const interval = setInterval(updateLockoutStatus, 1000);
    return () => clearInterval(interval);
  }, [navigate, searchParams]);

  const updateLockoutStatus = () => {
    const remaining = RateLimiter.getRemainingLockoutTime('127.0.0.1');
    setLockoutTime(remaining);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Check rate limiting
      if (RateLimiter.isRateLimited('127.0.0.1')) {
        setError('Too many failed attempts. Please try again later.');
        setLoading(false);
        return;
      }

      // Validate form
      const formData = { email, password, csrf_token: csrfToken };
      const validation = LoginSchema.safeParse(formData);
      
      if (!validation.success) {
        setError('Please check your input.');
        setLoading(false);
        return;
      }

      // Validate credentials
      const isValid = await AuthService.validateCredentials(email, password);
      
      if (isValid) {
        // Create session
        await AuthService.createSession(email);
        
        // Record successful attempt
        RateLimiter.recordAttempt('127.0.0.1', true);
        
        // Audit log
        await AuditLogger.log({
          entity: 'auth',
          entityId: email,
          action: 'login',
          actor: email,
          message: 'Successful login',
          ip: '127.0.0.1'
        });

        toast({
          title: 'Login successful',
          description: 'Welcome to the admin panel'
        });

        // Redirect
        const redirectTo = searchParams.get('redirect') || '/admin';
        navigate(redirectTo);
      } else {
        // Record failed attempt
        RateLimiter.recordAttempt('127.0.0.1', false);
        
        // Audit log
        await AuditLogger.log({
          entity: 'auth',
          entityId: email,
          action: 'login',
          actor: email,
          message: 'Failed login attempt',
          ip: '127.0.0.1'
        });

        setError('Invalid credentials. Please try again.');
        updateLockoutStatus();
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatLockoutTime = (ms: number): string => {
    const minutes = Math.ceil(ms / 60000);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
          <p className="text-muted-foreground">Access the AV Map admin panel</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {lockoutTime > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  Account temporarily locked. Try again in {formatLockoutTime(lockoutTime)}.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@avmap.com"
                required
                disabled={loading || lockoutTime > 0}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || lockoutTime > 0}
              />
            </div>

            <input type="hidden" name="csrf_token" value={csrfToken} />

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || lockoutTime > 0}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-xs text-muted-foreground text-center">
            <p>Demo credentials: admin@avmap.com / admin123</p>
            <p className="mt-1">Rate limit: 5 attempts per 10 minutes</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}