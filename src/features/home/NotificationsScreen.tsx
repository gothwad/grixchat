import React from 'react';
import { ArrowLeft, Bell, MessageSquare, Heart, UserPlus, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotificationsScreen() {
  const navigate = useNavigate();

  const notifications: any[] = [];

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Section Title */}
        <div className="px-4 py-4">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Recent</h2>
        </div>

        {/* Notifications List */}
        <div className="flex flex-col">
          {notifications.map((notif) => {
            const Icon = notif.icon;
            return (
              <div 
                key={notif.id} 
                className="flex items-center gap-4 px-4 py-4 hover:bg-zinc-50 transition-colors border-b border-zinc-50"
              >
                <div className="relative shrink-0">
                  <img 
                    src={notif.avatar} 
                    alt={notif.user}
                    className="w-12 h-12 rounded-full object-cover border border-zinc-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white ${notif.bgColor}`}>
                    <Icon size={10} className={notif.iconColor} />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-zinc-900 leading-tight">
                    <span className="font-bold">{notif.user}</span> {notif.content}
                  </p>
                  <span className="text-[11px] text-zinc-400 font-medium">{notif.time}</span>
                </div>
                {notif.type === 'follow' && (
                  <button className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-colors">
                    Follow
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State Mock */}
        <div className="py-12 flex flex-col items-center justify-center opacity-20">
          <Bell size={48} className="text-zinc-400 mb-2" />
          <p className="text-sm font-medium">No more notifications</p>
        </div>
      </div>
    </div>
  );
}
