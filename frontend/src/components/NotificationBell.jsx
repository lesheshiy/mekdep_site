import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const nav = useNavigate();

  const refresh = async () => {
    try {
      const [list, count] = await Promise.all([
        api.get('/notifications/'),
        api.get('/notifications/unread_count/'),
      ]);
      setItems(list.data);
      setUnread(count.data.count);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const click = async (n) => {
    await api.post(`/notifications/${n.id}/mark_read/`);
    setOpen(false);
    if (n.link) nav(n.link);
    refresh();
  };

  const markAll = async () => {
    await api.post('/notifications/mark_all_read/');
    refresh();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-2 text-slate-500 hover:bg-slate-100/50 transition-colors rounded-full relative"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full grid place-items-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] bg-white rounded-2xl shadow-2xl border border-outline-variant/10 overflow-hidden z-50 animate-pop-in">
          <div className="px-5 py-3 border-b border-outline-variant/10 flex items-center justify-between">
            <span className="font-bold text-on-surface">Notifications</span>
            {items.length > 0 && (
              <button
                onClick={markAll}
                className="text-xs font-bold text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-secondary">
                You're all caught up.
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => click(n)}
                  className={`block w-full text-left px-5 py-3 border-b border-outline-variant/5 hover:bg-slate-50 transition-colors ${
                    !n.is_read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    {!n.is_read && (
                      <span className="w-2 h-2 mt-1.5 bg-primary rounded-full flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-secondary mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[10px] text-outline mt-1 font-medium uppercase tracking-wider">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
