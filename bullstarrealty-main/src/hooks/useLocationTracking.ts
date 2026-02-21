 import { useEffect, useState, useCallback, useRef } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 
 interface LocationData {
   latitude: number;
   longitude: number;
   accuracy: number;
   timestamp: Date;
 }
 
 export const useLocationTracking = (userId?: string, enabled: boolean = true) => {
   const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
   const [isTracking, setIsTracking] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const watchIdRef = useRef<number | null>(null);
   const lastSentRef = useRef<number>(0);
 
   const sendLocation = useCallback(async (position: GeolocationPosition) => {
     if (!userId) return;
 
     // Throttle updates to once every 30 seconds
     const now = Date.now();
     if (now - lastSentRef.current < 30000) return;
     lastSentRef.current = now;
 
     const locationData = {
       user_id: userId,
       latitude: position.coords.latitude,
       longitude: position.coords.longitude,
       accuracy: position.coords.accuracy,
       recorded_at: new Date().toISOString(),
     };
 
     try {
       const { error } = await supabase.from("user_locations").insert(locationData);
       if (error) throw error;
 
       setCurrentLocation({
         latitude: position.coords.latitude,
         longitude: position.coords.longitude,
         accuracy: position.coords.accuracy,
         timestamp: new Date(),
       });
     } catch (err) {
       console.error("Error saving location:", err);
     }
   }, [userId]);
 
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const startTracking = useCallback(() => {
     if (!navigator.geolocation) {
       setError("Geolocation is not supported by your browser");
       toast.error("Geolocation is not supported");
       return;
     }
 
     setError(null);
 
     // Get initial position
    navigator.geolocation.getCurrentPosition(
       (position) => {
        setIsTracking(true);
         sendLocation(position);
       },
       (err) => {
        // Permission denied (or other errors) should NOT break the app.
        // Stop tracking and show a friendly message.
        stopTracking();
        const friendly =
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Enable it in your browser settings to share your live location."
            : err.message;
        setError(friendly);
         console.error("Location error:", err);
       },
       { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
     );
 
     // Watch for position changes
    watchIdRef.current = navigator.geolocation.watchPosition(
       (position) => {
        setIsTracking(true);
         sendLocation(position);
       },
       (err) => {
        stopTracking();
        const friendly =
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Enable it in your browser settings to share your live location."
            : err.message;
        setError(friendly);
         console.error("Location watch error:", err);
       },
       { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
     );
  }, [sendLocation, stopTracking]);
 
   useEffect(() => {
     if (enabled && userId) {
       startTracking();
     }
 
     return () => {
       stopTracking();
     };
   }, [enabled, userId, startTracking, stopTracking]);
 
   return {
     currentLocation,
     isTracking,
     error,
     startTracking,
     stopTracking,
   };
 };