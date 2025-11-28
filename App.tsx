import React, { useState, useEffect } from 'react';
import { ViewState, AppSettings, Appointment } from './types';
import { Calculator } from './components/Calculator';
import { ScheduleList } from './components/ScheduleList';
import { SettingsForm } from './components/SettingsForm';
import { 
  PawPrint, 
  Cat, 
  Calendar, 
  SlidersHorizontal 
} from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  baseAddress: '上海市静安寺',
  pricingTiers: [
    { maxDistance: 1, price: 20 },
    { maxDistance: 2, price: 25 },
    { maxDistance: 3, price: 30 },
    { maxDistance: 5, price: 40 }
  ],
  holidaySurcharge: 10,
  extraCatSurcharge: 5
};

// Simple Toast Component
const Toast = ({ message, onClose }: { message: string; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-800/80 text-white px-6 py-3 rounded-2xl backdrop-blur-xl shadow-2xl z-50 animate-fade-in flex items-center gap-3 border border-white/10">
      <PawPrint className="w-5 h-5 text-blue-300" />
      <span className="font-medium tracking-wide">{message}</span>
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.CALCULATOR);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Load persistence
  useEffect(() => {
    const savedSettings = localStorage.getItem('meow_settings');
    if (savedSettings) setSettings(JSON.parse(savedSettings));

    const savedApts = localStorage.getItem('meow_appointments');
    if (savedApts) {
      const parsed = JSON.parse(savedApts);
      // Migration: Add status if missing
      const migrated = parsed.map((a: any) => ({
        ...a,
        status: a.status || 'pending'
      }));
      setAppointments(migrated);
    }
  }, []);

  // Save persistence
  useEffect(() => {
    localStorage.setItem('meow_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('meow_appointments', JSON.stringify(appointments));
  }, [appointments]);

  // Request Notification Permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Check for reminders every minute
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      appointments.forEach(apt => {
        if (apt.status === 'completed') return;

        const aptDate = new Date(apt.date);
        // Check if it's today
        if (aptDate.toDateString() === now.toDateString()) {
           const [aptHour, aptMinute] = apt.time.split(':').map(Number);
           const aptMinutes = aptHour * 60 + aptMinute;
           
           // Notify 30 minutes before
           if (aptMinutes - currentMinutes === 30) {
              showNotification(`喂猫提醒: ${apt.clientName}`, `30分钟后前往 ${apt.address}`);
           }
           // Notify exact time
           if (aptMinutes === currentMinutes) {
              showNotification(`喂猫时间到!`, `现在前往: ${apt.clientName}家`);
           }
        }
      });
    };

    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [appointments]);

  const showNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    } else {
      showToast(`${title}: ${body}`);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
  };

  const addAppointment = (newApts: Appointment[]) => {
    setAppointments(prev => [...prev, ...newApts]);
    showToast(`已添加 ${newApts.length} 个喂猫日程`);
    setView(ViewState.SCHEDULE);
  };

  // Simplified delete logic that takes state update correctly
  const deleteAppointment = (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
    showToast('日程已删除');
  };

  const completeAppointment = (id: string) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'completed' } : a));
    showToast('太棒了！又完成了一单喂猫任务 🐱');
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    showToast("配置已保存，准备计算喵！");
    setTimeout(() => setView(ViewState.CALCULATOR), 1000);
  };

  return (
    // Use h-[100dvh] for mobile browsers to handle address bar correctly
    <div className="h-[100dvh] w-full bg-[#F2F6FF] flex justify-center text-gray-800 font-sans overflow-hidden relative">
      
      {/* BACKGROUND DECORATION BLOBS (Visible through frosted glass) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] bg-blue-200/40 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[30%] bg-indigo-200/40 rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] bg-purple-100/40 rounded-full blur-3xl animate-pulse delay-2000"></div>

      <div className="w-full max-w-md bg-white/60 h-full shadow-2xl relative flex flex-col backdrop-blur-sm z-10">
        
        {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}

        {/* Header - Safe Area Top Padding */}
        <header className="bg-white/70 backdrop-blur-xl z-20 px-6 py-4 border-b border-white/40 flex justify-between items-center shadow-sm shrink-0 pt-[max(1rem,env(safe-area-inset-top))]">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              MeowWalker <span className="text-blue-500 text-xs px-2 py-0.5 bg-blue-50/80 rounded-full font-bold border border-blue-100">Pro</span>
            </h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-100 to-blue-50 flex items-center justify-center text-xl shadow-inner border border-white">
            <Cat className="w-6 h-6 text-blue-500 fill-blue-500/20" />
          </div>
        </header>

        {/* Content Area */}
        <main className="p-4 flex-1 overflow-y-auto no-scrollbar pb-32">
          {view === ViewState.CALCULATOR && (
            <Calculator 
              settings={settings} 
              onSaveAppointment={addAppointment} 
              showToast={showToast}
              appointments={appointments}
            />
          )}
          {view === ViewState.SCHEDULE && (
            <ScheduleList 
              appointments={appointments} 
              onDelete={deleteAppointment} 
              onComplete={completeAppointment}
              // Removed onAddClick
            />
          )}
          {view === ViewState.SETTINGS && (
            <SettingsForm 
              settings={settings} 
              onSave={handleSaveSettings} 
            />
          )}
        </main>

        {/* Bottom Navigation - Safe Area Bottom Spacing */}
        <nav className="absolute bottom-[calc(0.8rem+env(safe-area-inset-bottom))] left-6 right-6 bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/50 px-2 py-1 flex justify-between items-center z-30 h-[72px]">
          
          <button 
            onClick={() => setView(ViewState.CALCULATOR)}
            className="flex-1 flex flex-col items-center justify-center h-full rounded-2xl active:scale-95 transition-all duration-200 hover:bg-white/40"
          >
            <div className={`transition-all duration-300 ${view === ViewState.CALCULATOR ? '-translate-y-1' : ''}`}>
              <PawPrint className={`w-6 h-6 transition-colors duration-300 ${view === ViewState.CALCULATOR ? 'text-blue-600 fill-blue-600' : 'text-gray-400'}`} />
            </div>
            <span className={`text-[10px] font-bold mt-1 transition-all duration-300 ${view === ViewState.CALCULATOR ? 'text-blue-600 opacity-100' : 'text-gray-400 opacity-60'}`}>估价</span>
          </button>
          
          <div className="w-[1px] h-6 bg-gray-300/40"></div>

          <button 
            onClick={() => setView(ViewState.SCHEDULE)}
            className="flex-1 flex flex-col items-center justify-center h-full rounded-2xl active:scale-95 transition-all duration-200 hover:bg-white/40"
          >
             <div className={`transition-all duration-300 ${view === ViewState.SCHEDULE ? '-translate-y-1' : ''}`}>
              <Calendar className={`w-6 h-6 transition-colors duration-300 ${view === ViewState.SCHEDULE ? 'text-blue-600' : 'text-gray-400'}`} />
            </div>
            <span className={`text-[10px] font-bold mt-1 transition-all duration-300 ${view === ViewState.SCHEDULE ? 'text-blue-600 opacity-100' : 'text-gray-400 opacity-60'}`}>日程</span>
          </button>

          <div className="w-[1px] h-6 bg-gray-300/40"></div>

          <button 
            onClick={() => setView(ViewState.SETTINGS)}
            className="flex-1 flex flex-col items-center justify-center h-full rounded-2xl active:scale-95 transition-all duration-200 hover:bg-white/40"
          >
             <div className={`transition-all duration-300 ${view === ViewState.SETTINGS ? '-translate-y-1' : ''}`}>
              <SlidersHorizontal className={`w-6 h-6 transition-colors duration-300 ${view === ViewState.SETTINGS ? 'text-blue-600 fill-blue-600' : 'text-gray-400'}`} />
            </div>
            <span className={`text-[10px] font-bold mt-1 transition-all duration-300 ${view === ViewState.SETTINGS ? 'text-blue-600 opacity-100' : 'text-gray-400 opacity-60'}`}>设置</span>
          </button>
        </nav>

      </div>
    </div>
  );
};

export default App;