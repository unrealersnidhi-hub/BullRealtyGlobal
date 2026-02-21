import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  LogOut, 
  RefreshCw, 
  Search,
  Clock,
  MapPin,
  Shield,
  AlertTriangle,
  User
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address: string | null;
  user_agent: string | null;
  device_info: string | null;
  country: string | null;
  is_active: boolean;
  created_at: string;
  last_activity_at: string;
  expires_at: string;
  logged_out_at: string | null;
  logout_reason: string | null;
  user_email?: string;
  user_name?: string;
}

interface SessionManagementProps {
  currentUserId: string;
}

export const SessionManagement = ({ currentUserId }: SessionManagementProps) => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [confirmLogout, setConfirmLogout] = useState<{ userId: string; userName: string } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      // Fetch sessions
      let query = supabase
        .from("user_sessions")
        .select("*")
        .order("last_activity_at", { ascending: false });

      if (showActiveOnly) {
        query = query.eq("is_active", true);
      }

      const { data: sessionsData, error: sessionsError } = await query;

      if (sessionsError) throw sessionsError;

      // Fetch user profiles for email/name
      const userIds = [...new Set(sessionsData?.map(s => s.user_id) || [])];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .in("user_id", userIds);

      // Merge profiles with sessions
      const enrichedSessions = sessionsData?.map(session => {
        const profile = profiles?.find(p => p.user_id === session.user_id);
        return {
          ...session,
          user_email: profile?.email || "Unknown",
          user_name: profile?.full_name || profile?.email || "Unknown User"
        };
      }) || [];

      setSessions(enrichedSessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to load sessions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [showActiveOnly]);

  const handleForceLogout = async (userId: string) => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.rpc('admin_force_logout', {
        p_user_id: userId,
        p_admin_id: currentUserId,
        p_reason: 'admin_force_logout'
      });

      if (error) throw error;

      toast.success("User has been logged out from all devices");
      fetchSessions();
    } catch (error) {
      console.error("Error forcing logout:", error);
      toast.error("Failed to logout user");
    } finally {
      setIsLoggingOut(false);
      setConfirmLogout(null);
    }
  };

  const getDeviceIcon = (deviceInfo: string | null) => {
    if (!deviceInfo) return <Monitor className="w-4 h-4" />;
    if (deviceInfo.includes("Mobile")) return <Smartphone className="w-4 h-4" />;
    if (deviceInfo.includes("Tablet")) return <Tablet className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  const getCountryFlag = (country: string | null) => {
    if (country === "dubai") return "🇦🇪";
    if (country === "india") return "🇮🇳";
    return "🌍";
  };

  const filteredSessions = sessions.filter(session => {
    const searchLower = searchQuery.toLowerCase();
    return (
      session.user_email?.toLowerCase().includes(searchLower) ||
      session.user_name?.toLowerCase().includes(searchLower) ||
      session.device_info?.toLowerCase().includes(searchLower) ||
      session.country?.toLowerCase().includes(searchLower)
    );
  });

  // Group sessions by user for easier management
  const sessionsByUser = filteredSessions.reduce((acc, session) => {
    if (!acc[session.user_id]) {
      acc[session.user_id] = {
        userId: session.user_id,
        userName: session.user_name || "Unknown",
        userEmail: session.user_email || "Unknown",
        sessions: []
      };
    }
    acc[session.user_id].sessions.push(session);
    return acc;
  }, {} as Record<string, { userId: string; userName: string; userEmail: string; sessions: UserSession[] }>);

  const activeSessions = sessions.filter(s => s.is_active);
  const uniqueActiveUsers = new Set(activeSessions.map(s => s.user_id)).size;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <User className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{uniqueActiveUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Monitor className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Sessions</p>
                <p className="text-2xl font-bold">{activeSessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Shield className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">SSO Enforced</p>
                <p className="text-2xl font-bold">Yes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Session Management Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[hsl(var(--gold))]" />
                Session Management
              </CardTitle>
              <CardDescription>
                Monitor and manage user login sessions. Only one active session allowed per user (SSO).
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowActiveOnly(!showActiveOnly)}
              >
                {showActiveOnly ? "Show All" : "Active Only"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSessions}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by user name, email, device, or country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Sessions Table */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>User</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredSessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No sessions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSessions.map((session) => (
                    <TableRow key={session.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{session.user_name}</span>
                          <span className="text-xs text-muted-foreground">{session.user_email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(session.device_info)}
                          <span className="text-sm">{session.device_info || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{getCountryFlag(session.country)}</span>
                          <span className="capitalize">{session.country || "N/A"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span>{formatDistanceToNow(new Date(session.last_activity_at), { addSuffix: true })}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {session.is_active ? (
                          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-muted">
                            {session.logout_reason === 'admin_force_logout' ? 'Force Logged Out' : 
                             session.logout_reason === 'new_session_login' ? 'Replaced' : 'Logged Out'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {session.is_active && session.user_id !== currentUserId && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setConfirmLogout({ 
                              userId: session.user_id, 
                              userName: session.user_name || "this user" 
                            })}
                          >
                            <LogOut className="w-4 h-4 mr-1" />
                            Force Logout
                          </Button>
                        )}
                        {session.user_id === currentUserId && (
                          <Badge variant="outline" className="text-xs">
                            Your Session
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* SSO Info */}
          <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium text-amber-500">Single Sign-On (SSO) Enabled</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Each user can only have one active session at a time. Logging in from a new device will automatically terminate the previous session.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmLogout} onOpenChange={() => setConfirmLogout(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force Logout User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to force logout <strong>{confirmLogout?.userName}</strong> from all devices? 
              They will need to log in again to access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoggingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmLogout && handleForceLogout(confirmLogout.userId)}
              disabled={isLoggingOut}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoggingOut ? "Logging out..." : "Force Logout"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SessionManagement;
