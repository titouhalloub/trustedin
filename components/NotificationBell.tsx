import { useState, useEffect } from 'react';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Bell, UserPlus, Heart, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/router';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: number;
  type: 'new_follower' | 'connection_accepted' | 'connection_request';
  read: boolean;
  created_at: string;
  actor: {
    id: string;
    full_name: string | null;
  };
}

export function NotificationBell() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!user || !supabase) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, actor:actor_id(id, full_name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching notifications:', error);
      } else {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          // Simple refetch on new notification.
          // For a more advanced implementation, you could fetch just the new notification and prepend it.
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  const getNotificationContent = (notification: Notification) => {
    const actorName = notification.actor?.full_name || 'Someone';
    switch (notification.type) {
      case 'new_follower':
        return {
          icon: <Heart className="h-5 w-5 text-red-500 mt-1" />,
          text: <><b>{actorName}</b> started following you.</>,
          href: `/profile/${notification.actor.id}`
        };
      case 'connection_accepted':
        return {
          icon: <UserCheck className="h-5 w-5 text-green-500 mt-1" />,
          text: <><b>{actorName}</b> accepted your connection request.</>,
          href: `/profile/${notification.actor.id}`
        };
      case 'connection_request':
        return {
          icon: <UserPlus className="h-5 w-5 text-primary mt-1" />,
          text: <><b>{actorName}</b> sent you a connection request.</>,
          href: '/network'
        };
      default:
        return {
          icon: <Bell className="h-5 w-5 text-muted-foreground mt-1" />,
          text: <>You have a new notification.</>,
          href: '#'
        };
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read optimistically
    const newNotifications = notifications.map(n => n.id === notification.id ? { ...n, read: true } : n);
    setNotifications(newNotifications);
    setUnreadCount(newNotifications.filter(n => !n.read).length);

    // Mark as read in DB
    supabase.from('notifications').update({ read: true }).eq('id', notification.id).then();

    // Navigate
    const { href } = getNotificationContent(notification);
    router.push(href);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 text-xs">{unreadCount}</Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length > 0 ? notifications.map(n => {
          const { icon, text } = getNotificationContent(n);
          return (
            <DropdownMenuItem key={n.id} onClick={() => handleNotificationClick(n)} className={`flex items-start gap-3 ${!n.read ? 'bg-muted/50' : ''}`}>
              {icon}
              <div>
                <p className="text-sm">{text}</p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
              </div>
            </DropdownMenuItem>
          )
        }) : <p className="p-4 text-sm text-muted-foreground text-center">No notifications yet.</p>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}