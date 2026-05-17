import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord,
} from "../lib/notifications";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  async function handleRead(notification: NotificationRecord) {
    if (!notification.readAt) {
      await markNotificationRead(notification.id);
      await load();
    }
  }

  async function handleReadAll() {
    await markAllNotificationsRead();
    await load();
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Notifications</h1>
          <p className="mt-2 text-slate-600">{unreadCount} unread update(s)</p>
        </div>
        <Button variant="secondary" onClick={handleReadAll} disabled={unreadCount === 0}>
          Mark All Read
        </Button>
      </div>

      {message ? <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</div> : null}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="px-6 py-10 text-sm text-slate-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-500">No notifications yet.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {notifications.map((notification) => {
              const content = (
                <article
                  className={`block px-6 py-5 ${notification.readAt ? "bg-white" : "bg-emerald-50/60"}`}
                  onClick={() => handleRead(notification).catch(() => undefined)}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-medium text-slate-950">{notification.title}</h2>
                        {!notification.readAt ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                            New
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
                    </div>
                    <div className="text-xs text-slate-400">{formatDate(notification.createdAt)}</div>
                  </div>
                </article>
              );

              return notification.href ? (
                <Link key={notification.id} to={notification.href}>
                  {content}
                </Link>
              ) : (
                <div key={notification.id}>{content}</div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
