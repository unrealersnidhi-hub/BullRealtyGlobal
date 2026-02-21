 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Bell, Check, X } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 import { Badge } from "@/components/ui/badge";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { formatDistanceToNow } from "date-fns";
 import { useNavigate } from "react-router-dom";
 import { cn } from "@/lib/utils";
 
 interface NotificationItem {
   id: string;
   user_id: string;
   title: string;
   message: string;
   type: string;
   link: string | null;
   is_read: boolean;
   created_at: string;
 }
 
 export const NotificationBell = () => {
   const [notifications, setNotifications] = useState<NotificationItem[]>([]);
   const [unreadCount, setUnreadCount] = useState(0);
   const [isOpen, setIsOpen] = useState(false);
   const navigate = useNavigate();
 
   useEffect(() => {
     fetchNotifications();
     setupRealtimeSubscription();
   }, []);
 
   const fetchNotifications = async () => {
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;
 
       const { data, error } = await supabase
         .from("notifications")
         .select("*")
         .eq("user_id", user.id)
         .order("created_at", { ascending: false })
         .limit(20);
 
       if (error) throw error;
       
       setNotifications(data || []);
       setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
     } catch (error) {
       console.error("Error fetching notifications:", error);
     }
   };
 
   const setupRealtimeSubscription = () => {
     const channel = supabase
       .channel("notifications-realtime")
       .on(
         "postgres_changes",
         {
           event: "INSERT",
           schema: "public",
           table: "notifications",
         },
         (payload) => {
           const newNotification = payload.new as NotificationItem;
           // Check if this notification is for the current user
           supabase.auth.getUser().then(({ data: { user } }) => {
             if (user && newNotification.user_id === user.id) {
               setNotifications((prev) => [newNotification, ...prev].slice(0, 20));
               setUnreadCount((prev) => prev + 1);
             }
           });
         }
       )
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   };
 
   const markAsRead = async (notificationId: string) => {
     try {
       const { error } = await supabase
         .from("notifications")
         .update({ is_read: true })
         .eq("id", notificationId);
 
       if (error) throw error;
 
       setNotifications((prev) =>
         prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
       );
       setUnreadCount((prev) => Math.max(0, prev - 1));
     } catch (error) {
       console.error("Error marking notification as read:", error);
     }
   };
 
   const markAllAsRead = async () => {
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;
 
       const { error } = await supabase
         .from("notifications")
         .update({ is_read: true })
         .eq("user_id", user.id)
         .eq("is_read", false);
 
       if (error) throw error;
 
       setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
       setUnreadCount(0);
     } catch (error) {
       console.error("Error marking all as read:", error);
     }
   };
 
   const handleNotificationClick = (notification: NotificationItem) => {
     if (!notification.is_read) {
       markAsRead(notification.id);
     }
     if (notification.link) {
       navigate(notification.link);
       setIsOpen(false);
     }
   };
 
   const getTypeColor = (type: string) => {
     switch (type) {
       case "success":
         return "bg-emerald-500";
       case "warning":
         return "bg-amber-500";
       case "error":
         return "bg-red-500";
       case "request":
         return "bg-blue-500";
       default:
         return "bg-primary";
     }
   };
 
   return (
     <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
       <DropdownMenuTrigger asChild>
         <Button variant="ghost" size="icon" className="relative">
           <Bell className="h-5 w-5" />
           {unreadCount > 0 && (
             <Badge
               variant="destructive"
               className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
             >
               {unreadCount > 9 ? "9+" : unreadCount}
             </Badge>
           )}
         </Button>
       </DropdownMenuTrigger>
       <DropdownMenuContent align="end" className="w-80">
         <DropdownMenuLabel className="flex items-center justify-between">
           <span>Notifications</span>
           {unreadCount > 0 && (
             <Button
               variant="ghost"
               size="sm"
               className="h-auto py-1 px-2 text-xs"
               onClick={markAllAsRead}
             >
               <Check className="w-3 h-3 mr-1" />
               Mark all read
             </Button>
           )}
         </DropdownMenuLabel>
         <DropdownMenuSeparator />
         <ScrollArea className="h-[300px]">
           {notifications.length === 0 ? (
             <div className="p-4 text-center text-muted-foreground">
               No notifications yet
             </div>
           ) : (
             notifications.map((notification) => (
               <DropdownMenuItem
                 key={notification.id}
                 className={cn(
                   "flex flex-col items-start p-3 cursor-pointer",
                   !notification.is_read && "bg-muted/50"
                 )}
               onClick={() => handleNotificationClick(notification)}
               >
                 <div className="flex items-start gap-2 w-full">
                   <div
                     className={cn(
                       "w-2 h-2 rounded-full mt-1.5 shrink-0",
                       getTypeColor(notification.type)
                     )}
                   />
                   <div className="flex-1 min-w-0">
                     <p className="font-medium text-sm truncate">
                       {notification.title}
                     </p>
                     <p className="text-xs text-muted-foreground line-clamp-2">
                       {notification.message}
                     </p>
                     <p className="text-xs text-muted-foreground mt-1">
                       {formatDistanceToNow(new Date(notification.created_at), {
                         addSuffix: true,
                       })}
                     </p>
                   </div>
                 </div>
               </DropdownMenuItem>
             ))
           )}
         </ScrollArea>
       </DropdownMenuContent>
     </DropdownMenu>
   );
 };