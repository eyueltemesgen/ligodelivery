import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function NotificationsCenter() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["header-notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`header-notif-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["header-notifications"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  const unread = notifications.filter((n) => !n.is_read).length;

  // Badge should clear when the tray is opened; the records themselves are
  // only marked read explicitly.
  const visibleUnread = open ? 0 : unread;

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    void qc.invalidateQueries({ queryKey: ["header-notifications"] });
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {visibleUnread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {visibleUnread > 9 ? "9+" : visibleUnread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {notifications.some((n) => !n.is_read) && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs font-medium text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <ul className="max-h-80 overflow-y-auto">
          {notifications.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nothing here yet.
            </li>
          )}
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`border-b border-border px-3 py-2.5 last:border-0 ${
                n.is_read ? "bg-card" : "bg-primary-soft"
              }`}
            >
              <p className="text-sm font-semibold">{n.title}</p>
              {n.body && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(n.created_at)}</p>
            </li>
          ))}
        </ul>
        <div className="border-t border-border px-3 py-2 text-center">
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="text-xs font-medium text-primary hover:underline"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
