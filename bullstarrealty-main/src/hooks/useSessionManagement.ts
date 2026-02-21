import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const SESSION_TOKEN_KEY = "bsr_session_token";
const SESSION_CHECK_INTERVAL = 60000; // Check every 60 seconds
const SESSION_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes idle timeout

interface SessionInfo {
  sessionToken: string;
  userId: string;
  country?: string;
}

export const useSessionManagement = () => {
  const navigate = useNavigate();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate a unique session token
  const generateSessionToken = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  // Create a new session and invalidate previous ones (SSO enforcement)
  const createSession = useCallback(async (userId: string, country?: string): Promise<string | null> => {
    try {
      const sessionToken = generateSessionToken();
      
      // First, invalidate all existing sessions for this user
      const { error: invalidateError } = await supabase.rpc('invalidate_user_sessions', {
        p_user_id: userId,
        p_exclude_token: null
      });

      if (invalidateError) {
        console.error("Error invalidating sessions:", invalidateError);
      }

      // Get device info
      const userAgent = navigator.userAgent;
      const deviceInfo = getDeviceInfo(userAgent);

      // Create new session
      const { error: insertError } = await supabase
        .from("user_sessions")
        .insert({
          user_id: userId,
          session_token: sessionToken,
          user_agent: userAgent,
          device_info: deviceInfo,
          country: country || null,
          is_active: true,
          expires_at: new Date(Date.now() + SESSION_IDLE_TIMEOUT).toISOString() // 30 minutes
        });

      if (insertError) {
        console.error("Error creating session:", insertError);
        return null;
      }

      // Store session token locally
      localStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
      
      return sessionToken;
    } catch (error) {
      console.error("Session creation error:", error);
      return null;
    }
  }, []);

  // Validate current session
  const validateSession = useCallback(async (): Promise<boolean> => {
    const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    
    if (!sessionToken) {
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('check_session_valid', {
        p_session_token: sessionToken
      });

      if (error) {
        console.error("Session validation error:", error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error("Session check error:", error);
      return false;
    }
  }, []);

  // End current session (logout)
  const endSession = useCallback(async (): Promise<void> => {
    const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    
    if (sessionToken) {
      try {
        await supabase
          .from("user_sessions")
          .update({ 
            is_active: false, 
            logged_out_at: new Date().toISOString(),
            logout_reason: 'user_logout'
          })
          .eq("session_token", sessionToken);
      } catch (error) {
        console.error("Error ending session:", error);
      }
    }
    
    localStorage.removeItem(SESSION_TOKEN_KEY);
  }, []);

  // Start session monitoring
  const startSessionMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Refresh session expiry on user activity
    const refreshActivity = async () => {
      const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
      if (sessionToken) {
        await supabase
          .from("user_sessions")
          .update({ 
            last_activity_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + SESSION_IDLE_TIMEOUT).toISOString()
          })
          .eq("session_token", sessionToken)
          .eq("is_active", true);
      }
    };

    // Listen for user activity to extend session
    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"];
    let activityTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleActivity = () => {
      if (activityTimeout) clearTimeout(activityTimeout);
      activityTimeout = setTimeout(refreshActivity, 5000);
    };
    activityEvents.forEach(evt => window.addEventListener(evt, handleActivity));

    intervalRef.current = setInterval(async () => {
      const isValid = await validateSession();
      
      if (!isValid) {
        clearInterval(intervalRef.current!);
        activityEvents.forEach(evt => window.removeEventListener(evt, handleActivity));
        localStorage.removeItem(SESSION_TOKEN_KEY);
        await supabase.auth.signOut();
        toast.error("Your session has expired due to inactivity. Please log in again.", {
          description: "Sessions expire after 30 minutes of inactivity."
        });
        navigate("/admin");
      }
    }, SESSION_CHECK_INTERVAL);
  }, [validateSession, navigate]);

  // Stop session monitoring
  const stopSessionMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Get current session token
  const getSessionToken = useCallback((): string | null => {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    createSession,
    validateSession,
    endSession,
    startSessionMonitoring,
    stopSessionMonitoring,
    getSessionToken
  };
};

// Helper function to get device info from user agent
function getDeviceInfo(userAgent: string): string {
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
  const isTablet = /iPad|Tablet/i.test(userAgent);
  
  let browser = "Unknown";
  if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Safari")) browser = "Safari";
  else if (userAgent.includes("Edge")) browser = "Edge";
  
  let os = "Unknown";
  if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("Mac")) os = "macOS";
  else if (userAgent.includes("Linux")) os = "Linux";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
  
  const deviceType = isTablet ? "Tablet" : isMobile ? "Mobile" : "Desktop";
  
  return `${deviceType} - ${browser} on ${os}`;
}

export default useSessionManagement;
