import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '@/lib/auth';
import { AuditLogger } from '@/lib/auditLogger';
import { FileJsonStore } from '@/lib/dataStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  Users, 
  MapPin, 
  Calendar, 
  Newspaper, 
  FileText, 
  Activity,
  AlertTriangle,
  LogOut,
  Shield,
  Menu
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface DashboardStats {
  deployments: number;
  events: number;
  shapes: number;
  news: number;
  pages: number;
}

interface AuditStats {
  totalEntries: number;
  recentActivity: { date: string; count: number }[];
  topActors: { actor: string; count: number }[];
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    deployments: 0,
    events: 0,
    shapes: 0,
    news: 0,
    pages: 0
  });
  const [auditStats, setAuditStats] = useState<AuditStats>({
    totalEntries: 0,
    recentActivity: [],
    topActors: []
  });
  const [loading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const dataStore = new FileJsonStore();

  useEffect(() => {
    // Check authentication
    if (!AuthService.isAuthenticated()) {
      navigate('/admin/login');
      return;
    }

    loadDashboardData();
  }, [navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load entity counts
      const [deployments, events, shapes, news, pages] = await Promise.all([
        dataStore.list('deployments'),
        dataStore.list('events'),
        dataStore.list('service_area_shapes'),
        dataStore.list('news'),
        dataStore.list('pages')
      ]);

      setStats({
        deployments: Object.keys(deployments).length,
        events: Object.keys(events).length,
        shapes: Object.keys(shapes).length,
        news: Object.keys(news).length,
        pages: Object.keys(pages).length
      });

      // Load audit stats
      const auditData = await AuditLogger.getStats();
      setAuditStats(auditData);

      // Check if read-only
      const isReadOnly = process.env.NODE_ENV === 'production' && 
        process.env.ALLOW_WRITES_IN_PROD !== 'true';
      setReadOnly(isReadOnly);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const session = AuthService.validateSession();
    
    if (session) {
      await AuditLogger.log({
        entity: 'auth',
        entityId: session.email,
        action: 'logout',
        actor: session.email,
        message: 'User logged out'
      });
    }

    AuthService.logout();
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out'
    });
    navigate('/admin/login');
  };

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <Icon className={`h-8 w-8 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">AV Map Admin</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {readOnly && !isMobile && (
              <Badge variant="destructive" className="mr-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Read Only
              </Badge>
            )}
            
            {/* Desktop Logout */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="hidden md:flex"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="md:hidden"
                >
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Toggle admin menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Admin Menu
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-6">
                  {readOnly && (
                    <Badge variant="destructive" className="self-start">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Read Only
                    </Badge>
                  )}
                  
                  <div className="border-t pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full justify-start"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Read-only banner */}
      {readOnly && (
        <Alert className="m-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This is a preview environment. All write operations are disabled.
          </AlertDescription>
        </Alert>
      )}

      <div className="container mx-auto p-4">
        <Tabs defaultValue="overview" className="space-y-6">
          {/* Mobile Tab Navigation */}
          {isMobile ? (
            <div className="overflow-x-auto">
              <TabsList className="inline-flex min-w-full">
                <TabsTrigger value="overview" className="min-w-0 flex-1">Overview</TabsTrigger>
                <TabsTrigger value="deployments" className="min-w-0 flex-1">Deploy</TabsTrigger>
                <TabsTrigger value="events" className="min-w-0 flex-1">Events</TabsTrigger>
                <TabsTrigger value="shapes" className="min-w-0 flex-1">Areas</TabsTrigger>
                <TabsTrigger value="news" className="min-w-0 flex-1">News</TabsTrigger>
                <TabsTrigger value="pages" className="min-w-0 flex-1">Pages</TabsTrigger>
              </TabsList>
            </div>
          ) : (
            /* Desktop Tab Navigation */
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="deployments">Deployments</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="shapes">Service Areas</TabsTrigger>
              <TabsTrigger value="news">News</TabsTrigger>
              <TabsTrigger value="pages">Pages</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard
                title="Deployments"
                value={stats.deployments}
                icon={MapPin}
                color="text-blue-500"
              />
              <StatCard
                title="Events"
                value={stats.events}
                icon={Calendar}
                color="text-green-500"
              />
              <StatCard
                title="Service Areas"
                value={stats.shapes}
                icon={Users}
                color="text-purple-500"
              />
              <StatCard
                title="News Articles"
                value={stats.news}
                icon={Newspaper}
                color="text-orange-500"
              />
              <StatCard
                title="Pages"
                value={stats.pages}
                icon={FileText}
                color="text-red-500"
              />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {auditStats.recentActivity.slice(0, 7).map((activity) => (
                      <div key={activity.date} className="flex justify-between text-sm">
                        <span>{activity.date}</span>
                        <span className="font-medium">{activity.count} actions</span>
                      </div>
                    ))}
                    {auditStats.recentActivity.length === 0 && (
                      <p className="text-muted-foreground text-sm">No recent activity</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Environment</span>
                    <Badge variant={process.env.NODE_ENV === 'production' ? 'destructive' : 'default'}>
                      {process.env.NODE_ENV || 'development'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Write Access</span>
                    <Badge variant={readOnly ? 'destructive' : 'default'}>
                      {readOnly ? 'Disabled' : 'Enabled'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Audit Entries</span>
                    <span className="text-sm font-medium">{auditStats.totalEntries}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="deployments">
            <Card>
              <CardHeader>
                <CardTitle>Deployments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Deployment management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>Events</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Event management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shapes">
            <Card>
              <CardHeader>
                <CardTitle>Service Area Shapes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Service area management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="news">
            <Card>
              <CardHeader>
                <CardTitle>News</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">News management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pages">
            <Card>
              <CardHeader>
                <CardTitle>Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Page management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}