import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Wifi, Battery, Signal, Home, ChevronLeft,
  Settings, MessageSquare, Camera, Globe, Clock,
  CloudSun, FileText, Music, Map, Calculator,
  Calendar, Activity, Phone as PhoneIcon, User,
  Bell, Volume2, Shield, Moon, Sun, MonitorSmartphone,
  Fingerprint, Sparkles, Navigation, Search, Image, MessageCircle, Sliders, Dices
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useDeviceMode } from '../hooks/useDeviceMode';
import { toast } from '../utils/toast';
import { formatImageUrl } from '../utils/imageUtils';

import MessengerApp from './MessengerApp';
import DiscordApp from './DiscordApp';
import CasinoApp from './CasinoApp';

interface PhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ALL_APPS = [
  { id: 'camera', name: 'Máy ảnh', icon: Camera, color: 'bg-slate-700' },
  { id: 'gallery', name: 'Ảnh', icon: Image, color: 'bg-purple-500' },
  { id: 'weather', name: 'Thời tiết', icon: CloudSun, color: 'bg-sky-400' },
  { id: 'clock', name: 'Đồng hồ', icon: Clock, color: 'bg-black' },
  { id: 'calculator', name: 'Máy tính', icon: Calculator, color: 'bg-orange-500' },
  { id: 'settings', name: 'Cài đặt', icon: Settings, color: 'bg-slate-500' },
  { id: 'discord', name: 'Discord', icon: MessageCircle, color: 'bg-[#5865F2]' },
  { id: 'phone', name: 'Điện thoại', icon: PhoneIcon, color: 'bg-green-500' },
  { id: 'browser', name: 'Trình duyệt', icon: Globe, color: 'bg-blue-400' },
  { id: 'ai', name: 'Trợ lý AI', icon: Sparkles, color: 'bg-indigo-600' },
  { id: 'messenger', name: 'Messenger', icon: MessageSquare, color: 'bg-gradient-to-tr from-[#0084FF] to-[#00C6FF]' },
  { id: 'control', name: 'Control', icon: Sliders, color: 'bg-teal-500' },
  { id: 'casino', name: 'Casino', icon: Dices, color: 'bg-gradient-to-tr from-amber-500 to-red-600' },
];

export default function PhoneModal({ isOpen, onClose }: PhoneModalProps) {
  const theme = useStore((state) => state.theme);
  const isMobile = useDeviceMode();
  const [time, setTime] = useState(new Date());
  const [activeApp, setActiveApp] = useState<string | null>(null);
  
  const phoneWallpaper = useStore((state) => state.phoneWallpaper);
  const setPhoneWallpaper = useStore((state) => state.setPhoneWallpaper);
  const phoneTheme = useStore((state) => state.phoneTheme);
  const setPhoneTheme = useStore((state) => state.setPhoneTheme);
  const phoneAppControl = useStore((state) => state.phoneAppControl) || { messenger: true, discord: true };
  const setPhoneAppControl = useStore((state) => state.setPhoneAppControl);
  const unreadMessages = useStore((state) => state.unreadMessages);
  const setUnreadMessages = useStore((state) => state.setUnreadMessages);

  const ACTIVE_APPS = ALL_APPS.filter(app => {
    if (app.id === 'messenger' && !phoneAppControl.messenger) return false;
    if (app.id === 'discord' && !phoneAppControl.discord) return false;
    return true;
  });

  const DOCK_APPS = ['settings', 'casino', 'discord', 'messenger'].map(id => ALL_APPS.find(a => a.id === id)!);
  const GRID_APPS = ACTIVE_APPS.filter(app => !['settings', 'casino', 'discord', 'messenger'].includes(app.id));

  const wallpapers = [
    { id: 'nature1', url: 'https://images.unsplash.com/photo-1510784722466-f2aa9c52fff6?q=80&w=2560&auto=format&fit=crop' },
    { id: 'nature2', url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2560&auto=format&fit=crop' },
    { id: 'abstract1', url: 'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?q=80&w=2560&auto=format&fit=crop' },
    { id: 'city1', url: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?q=80&w=2560&auto=format&fit=crop' }
  ];

  useEffect(() => {
    if (!isOpen) {
      setActiveApp(null);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: any;
    if (isOpen) {
      interval = setInterval(() => setTime(new Date()), 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const renderTopBar = (isDarkBg = false) => (
    <div className={`flex justify-between items-center px-4 py-2 text-xs font-medium z-50 relative ${isDarkBg ? 'text-white' : 'text-current'}`}>
      <span>{time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
      <div className="flex items-center gap-1.5">
        <Signal size={12} />
        <Wifi size={12} />
        <Battery size={14} className="ml-0.5" />
      </div>
    </div>
  );

  const renderHome = () => (
    <div 
      className="flex-1 flex flex-col relative overflow-hidden bg-cover bg-center text-white bg-indigo-950"
      style={{ backgroundImage: `url(${phoneWallpaper})` }}
    >
      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
      {renderTopBar(true)}
      <div className="px-4 pt-8 pb-4 flex flex-col items-center relative z-10 pointer-events-none">
        <div className="text-5xl font-light mb-1">
          {time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
        </div>
        <div className="text-sm font-medium text-white/80">
          {time.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      <div className="flex-1 p-4 relative z-10">
        <div className="grid grid-cols-4 gap-y-6 gap-x-2">
          {GRID_APPS.map((app) => (
            <button
              key={app.id}
              className="flex flex-col items-center gap-1.5 cursor-pointer group bg-transparent border-none outline-none relative"
              onClick={() => {
                setActiveApp(app.id);
                if (app.id === 'messenger') setUnreadMessages(0);
              }}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform ${app.color} pointer-events-none`}>
                <app.icon size={24} strokeWidth={1.5} />
              </div>
              {app.id === 'messenger' && unreadMessages > 0 && (
                <div className="absolute top-0 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold border border-white/20 pointer-events-none z-10">
                  {unreadMessages}
                </div>
              )}
              <span className="text-[10px] font-medium text-white/90 truncate w-full text-center drop-shadow-md pointer-events-none mt-1">
                {app.name}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Dock */}
      <div className="mx-4 mb-6 p-3 rounded-3xl bg-white/20 backdrop-blur-md border border-white/10 flex justify-between relative z-10">
        {DOCK_APPS.map((app) => {
          const isDisabled = (app.id === 'messenger' && !phoneAppControl.messenger) || (app.id === 'discord' && !phoneAppControl.discord);
          
          return (
            <button
              key={`dock-${app.id}`}
              className={`flex flex-col items-center cursor-pointer group relative bg-transparent border-none outline-none ${isDisabled ? 'opacity-50 grayscale' : ''}`}
              onClick={() => {
                if (isDisabled) {
                  toast.error('Ứng dụng hiện đang bị khóa!');
                  return;
                }
                setActiveApp(app.id);
                if (app.id === 'messenger') setUnreadMessages(0);
              }}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${!isDisabled ? 'group-hover:scale-105' : ''} transition-transform ${app.color} pointer-events-none`}>
                <app.icon size={24} strokeWidth={1.5} />
              </div>
              {app.id === 'messenger' && unreadMessages > 0 && !isDisabled && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold border border-white/20 pointer-events-none">
                  {unreadMessages}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className={`flex flex-col h-full ${phoneTheme === 'dark' ? 'bg-zinc-950 text-white' : 'bg-white text-slate-900'} relative`}>
      {renderTopBar(phoneTheme === 'dark')}
      
      <div className={`flex items-center px-4 py-3 border-b ${phoneTheme === 'dark' ? 'border-white/10' : 'border-black/10'} shadow-sm`}>
        <button 
          onClick={() => setActiveApp(null)}
          className={`p-1 -ml-1 mr-2 rounded-full ${phoneTheme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-100'} transition-colors`}
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="font-semibold text-lg flex-1 text-center pr-8">Cài đặt</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        {/* Theme Settings */}
        <div>
          <h3 className={`text-sm font-semibold mb-3 uppercase tracking-wider ${phoneTheme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>Giao diện</h3>
          <div className={`rounded-2xl overflow-hidden ${phoneTheme === 'dark' ? 'bg-zinc-900' : 'bg-slate-50'}`}>
            <div className={`flex items-center justify-between p-4 border-b ${phoneTheme === 'dark' ? 'border-white/5' : 'border-black/5'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg text-white"><Moon size={18} /></div>
                <span className="font-medium">Chế độ tối</span>
              </div>
              <button 
                onClick={() => setPhoneTheme('dark')}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${phoneTheme === 'dark' ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`}
              >
                {phoneTheme === 'dark' && <div className="w-2 h-2 bg-white rounded-full"></div>}
              </button>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-400 rounded-lg text-white"><Sun size={18} /></div>
                <span className="font-medium">Chế độ sáng</span>
              </div>
              <button 
                onClick={() => setPhoneTheme('light')}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${phoneTheme === 'light' ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`}
              >
                {phoneTheme === 'light' && <div className="w-2 h-2 bg-white rounded-full"></div>}
              </button>
            </div>
          </div>
        </div>

        {/* Wallpaper Settings */}
        <div>
          <h3 className={`text-sm font-semibold mb-3 uppercase tracking-wider ${phoneTheme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>Hình nền</h3>
          
          <div className="mb-4">
             <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${phoneTheme === 'dark' ? 'border-white/20 hover:bg-white/10' : 'border-black/20 hover:bg-black/5'}`}>
                <Image size={18} />
                <span className="font-medium text-sm">Tải ảnh lên từ thiết bị</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = URL.createObjectURL(file);
                    setPhoneWallpaper(url);
                  }
                }} />
             </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {wallpapers.map(wp => (
              <div 
                key={wp.id}
                onClick={() => setPhoneWallpaper(wp.url)}
                className={`relative rounded-xl overflow-hidden aspect-[9/16] cursor-pointer border-2 transition-all ${phoneWallpaper === wp.url ? 'border-blue-500 scale-[0.98]' : 'border-transparent hover:scale-[1.02]'}`}
              >
                <img src={formatImageUrl(wp.url)} alt="Wallpaper" className="w-full h-full object-cover" />
                {phoneWallpaper === wp.url && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Home Indicator */}
      <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 h-1 w-1/3 rounded-full cursor-pointer z-[200] ${phoneTheme === 'dark' ? 'bg-white/20 hover:bg-white/40' : 'bg-black/20 hover:bg-black/40'}`} onClick={() => setActiveApp(null)} />
    </div>
  );

  const renderControl = () => (
    <div className={`flex flex-col h-full ${phoneTheme === 'dark' ? 'bg-zinc-950 text-white' : 'bg-white text-slate-900'} relative`}>
      {renderTopBar(phoneTheme === 'dark')}
      
      <div className={`flex items-center px-4 py-3 border-b ${phoneTheme === 'dark' ? 'border-white/10' : 'border-black/10'} shadow-sm`}>
        <button 
          onClick={() => setActiveApp(null)}
          className={`p-1 -ml-1 mr-2 rounded-full ${phoneTheme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-100'} transition-colors`}
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="font-semibold text-lg flex-1 text-center pr-8">Control</h2>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-6">
        <div>
          <h3 className={`text-sm font-semibold mb-3 uppercase tracking-wider ${phoneTheme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>Quản lý Ứng dụng</h3>
          <div className={`rounded-2xl overflow-hidden ${phoneTheme === 'dark' ? 'bg-zinc-900' : 'bg-slate-50'}`}>
            <div className={`flex items-center justify-between p-4 border-b ${phoneTheme === 'dark' ? 'border-white/5' : 'border-black/5'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg text-white"><MessageSquare size={18} /></div>
                <span className="font-medium">Messenger</span>
              </div>
              <button 
                onClick={() => setPhoneAppControl({ messenger: !phoneAppControl.messenger })}
                className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${phoneAppControl.messenger ? 'bg-green-500 justify-end' : 'bg-gray-400 justify-start'}`}
              >
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </button>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#5865F2] rounded-lg text-white"><MessageCircle size={18} /></div>
                <span className="font-medium">Discord</span>
              </div>
              <button 
                onClick={() => setPhoneAppControl({ discord: !phoneAppControl.discord })}
                className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${phoneAppControl.discord ? 'bg-green-500 justify-end' : 'bg-gray-400 justify-start'}`}
              >
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 h-1 w-1/3 rounded-full cursor-pointer z-[200] ${phoneTheme === 'dark' ? 'bg-white/20 hover:bg-white/40' : 'bg-black/20 hover:bg-black/40'}`} onClick={() => setActiveApp(null)} />
    </div>
  );

  const renderAppContent = () => {
    const app = ACTIVE_APPS.find(a => a.id === activeApp);
    if (!app && activeApp) {
        // App is hidden but active, close it
        setActiveApp(null);
        return null;
    }
    if (!app) return null;

    if (app.id === 'discord') {
      return (
        <div className={`flex flex-col h-full ${phoneTheme === 'dark' ? 'bg-[#313338]' : 'bg-slate-100'} relative`}>
          <DiscordApp onClose={() => setActiveApp(null)} theme={phoneTheme} />
          <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 h-1 w-1/3 rounded-full cursor-pointer z-[200] ${phoneTheme === 'dark' ? 'bg-white/20 hover:bg-white/40' : 'bg-black/20 hover:bg-black/40'}`} onClick={() => setActiveApp(null)} />
        </div>
      );
    }

    if (app.id === 'messenger') {
      return (
        <div className={`flex flex-col h-full ${phoneTheme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'} relative`}>
          <MessengerApp onClose={() => setActiveApp(null)} theme={phoneTheme} />
          {/* Home Indicator */}
          <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 h-1 w-1/3 rounded-full cursor-pointer z-[200] ${phoneTheme === 'dark' ? 'bg-white/20 hover:bg-white/40' : 'bg-black/20 hover:bg-black/40'}`} onClick={() => setActiveApp(null)} />
        </div>
      );
    }

    if (app.id === 'settings') {
      return renderSettings();
    }
    
    if (app.id === 'control') {
      return renderControl();
    }
    
    if (app.id === 'casino') {
      return (
        <div className={`flex flex-col h-full ${phoneTheme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'} relative`}>
          <CasinoApp onBack={() => setActiveApp(null)} isDark={phoneTheme === 'dark'} />
          <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 h-1 w-1/3 rounded-full cursor-pointer z-[200] ${phoneTheme === 'dark' ? 'bg-white/20 hover:bg-white/40' : 'bg-black/20 hover:bg-black/40'}`} onClick={() => setActiveApp(null)} />
        </div>
      );
    }

    return (
      <div className={`flex flex-col h-full ${phoneTheme === 'dark' ? 'bg-zinc-950 text-white' : 'bg-white text-slate-900'} relative`}>
        {renderTopBar(phoneTheme === 'dark')}
        
        <div className={`flex items-center px-4 py-3 border-b ${phoneTheme === 'dark' ? 'border-white/10' : 'border-black/10'} shadow-sm`}>
          <button 
            onClick={() => setActiveApp(null)}
            className={`p-1 -ml-1 mr-2 rounded-full ${phoneTheme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-100'} transition-colors`}
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="font-semibold text-lg flex-1 text-center pr-8">{app.name}</h2>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto flex flex-col items-center justify-center text-center opacity-60">
          <app.icon size={64} className="mb-4" strokeWidth={1} />
          <h3 className="text-xl font-medium mb-2">{app.name}</h3>
          <p className="text-sm max-w-[200px]">Ứng dụng chưa được cài đặt đầy đủ trong phiên bản này.</p>
        </div>
        
        {/* Home Indicator */}
        <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 h-1 w-1/3 rounded-full cursor-pointer z-[200] ${phoneTheme === 'dark' ? 'bg-white/20 hover:bg-white/40' : 'bg-black/20 hover:bg-black/40'}`} onClick={() => setActiveApp(null)} />
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm ${isMobile ? 'p-0' : 'p-4'}`}
        onClick={onClose}
        style={isMobile ? { height: '100%', width: '100%' } : {}}
      >
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`relative overflow-hidden bg-black shadow-2xl ${
            isMobile 
              ? 'w-full h-full rounded-none' 
              : 'w-[360px] h-[720px] rounded-[3rem] border-[8px] border-zinc-800'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Screen Content */}
          <div className={`w-full h-full bg-black overflow-hidden flex flex-col ${isMobile ? 'rounded-none' : 'rounded-3xl'}`}>
            {activeApp ? renderAppContent() : renderHome()}
          </div>

          {/* Close button - external to phone on desktop, integrated on mobile */}
          {!isMobile && (
            <button
              onClick={onClose}
              className="absolute -right-12 top-0 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-md transition-colors"
            >
              <X size={24} />
            </button>
          )}
          {isMobile && (
            <button
              onClick={onClose}
              className="absolute top-12 right-4 p-2 bg-black/50 rounded-full text-white backdrop-blur-md z-[100]"
            >
              <X size={20} />
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
