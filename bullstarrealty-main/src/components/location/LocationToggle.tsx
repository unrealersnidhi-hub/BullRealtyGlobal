 import { useEffect, useState } from "react";
 import { Card, CardContent } from "@/components/ui/card";
 import { Switch } from "@/components/ui/switch";
 import { Label } from "@/components/ui/label";
 import { Badge } from "@/components/ui/badge";
 import { MapPin, Loader2, AlertCircle } from "lucide-react";
 import { useLocationTracking } from "@/hooks/useLocationTracking";
 import { cn } from "@/lib/utils";
 
 interface LocationToggleProps {
   userId?: string;
 }
 
 export const LocationToggle = ({ userId }: LocationToggleProps) => {
  const [enabled, setEnabled] = useState(true);
    const { currentLocation, isTracking, error } = useLocationTracking(userId, enabled);

   // If the browser denies permission, reflect that by switching off the toggle.
   useEffect(() => {
     if (error && enabled) setEnabled(false);
   }, [error, enabled]);
 
   return (
     <Card className="border-border/50">
       <CardContent className="p-4">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className={cn(
               "w-10 h-10 rounded-lg flex items-center justify-center",
               isTracking ? "bg-emerald-500/10" : "bg-muted"
             )}>
               {isTracking ? (
                 <MapPin className="w-5 h-5 text-emerald-500" />
               ) : (
                 <MapPin className="w-5 h-5 text-muted-foreground" />
               )}
             </div>
             <div>
               <Label htmlFor="location-toggle" className="font-medium cursor-pointer">
                 Share Live Location
               </Label>
               <p className="text-xs text-muted-foreground">
                 {error ? (
                    <span className="text-destructive flex items-center gap-1">
                     <AlertCircle className="w-3 h-3" />
                     {error}
                   </span>
                 ) : isTracking ? (
                   "Your location is being shared with managers"
                 ) : (
                   "Enable to share your location"
                 )}
               </p>
             </div>
           </div>
           <div className="flex items-center gap-3">
             {isTracking && (
               <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                 Active
               </Badge>
             )}
             <Switch
               id="location-toggle"
               checked={enabled}
               onCheckedChange={setEnabled}
             />
           </div>
         </div>
         {isTracking && currentLocation && (
           <div className="mt-3 pt-3 border-t border-border/50">
             <p className="text-xs text-muted-foreground">
               Last updated: {currentLocation.timestamp.toLocaleTimeString()}
             </p>
           </div>
         )}
       </CardContent>
     </Card>
   );
 };