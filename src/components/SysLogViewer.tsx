import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

export const SysLogViewer = ({ theme, isExpanded }: { theme: any, isExpanded?: boolean }) => {
  const systemLogs = useStore((state) => state.systemLogs);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [systemLogs]);

  const renderLogs = () => {
    if (!systemLogs || systemLogs.length === 0) {
      return (
        <div className={`p-2 ${theme.group === "Dark" ? 'text-green-400/60' : 'text-emerald-800 font-semibold'} font-mono text-xs whitespace-pre-wrap`}>
          {"> Hệ thống trạng thái bình thường...\n> Không có sự kiện nào."}
        </div>
      );
    }

    return (
      <div className={`font-mono text-xs leading-relaxed break-words`}>
        {systemLogs.map((log, idx) => {
          const isNotification = log.type === 'notification' || log.message.startsWith('[Thông báo]');
          
          let textClass = isNotification 
             ? (theme.group === "Dark" ? 'text-blue-400/80' : 'text-blue-700/80')
             : (theme.group === "Dark" ? 'text-red-400/80' : 'text-red-700/80');

          const timeString = log.timestamp 
            ? new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : '00:00:00';

          return (
            <div key={`syslog-${log.id || ""}-${idx}`} className={`flex gap-3 hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 py-0.5 ${textClass}`}>
              <span className="select-none opacity-40 shrink-0 font-medium">
                [{timeString}]
              </span>
              <span className="whitespace-pre-wrap flex-1">{log.message}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (isExpanded) {
    return renderLogs();
  }

  return (
    <div
      ref={scrollRef}
      className={`flex-1 min-h-[150px] max-h-[200px] shrink-0 p-4 overflow-y-auto custom-scrollbar scroll-smooth ${theme.group === "Light" ? `border border-black/10 rounded-xl m-2 shadow-inner ${theme.sidebarClass}` : "theme-panel !border-none"}`}
    >
      {renderLogs()}
    </div>
  );
};
