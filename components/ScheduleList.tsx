import React, { useState } from 'react';
import { Appointment } from '../types';
import { MapPin, Key, StickyNote, Trash2, Cat, CheckCircle, History, BellRing, CalendarCheck } from 'lucide-react';

interface ScheduleListProps {
  appointments: Appointment[];
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  // onAddClick removed as requested
}

export const ScheduleList: React.FC<ScheduleListProps> = ({ appointments, onDelete, onComplete }) => {
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');

  const filteredAppointments = appointments.filter(a => {
      if (viewMode === 'active') return a.status !== 'completed';
      return a.status === 'completed';
  });

  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
  });

  // Calculate total income for history view
  const totalIncome = appointments
    .filter(a => a.status === 'completed')
    .reduce((sum, current) => sum + current.totalPrice, 0);

  const getDayLabel = (dateStr: string) => {
      const date = new Date(dateStr);
      const today = new Date();
      if (date.toDateString() === today.toDateString()) return '今天';
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (date.toDateString() === tomorrow.toDateString()) return '明天';

      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return weekdays[date.getDay()];
  };

  const addToSystemCalendar = (apt: Appointment) => {
    // Format date string for ICS (YYYYMMDDTHHmm00)
    const startDateTime = new Date(`${apt.date}T${apt.time}`).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    // End time (assume 30 mins later)
    const endDateObj = new Date(new Date(`${apt.date}T${apt.time}`).getTime() + 30 * 60000);
    const endDateTime = endDateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const description = `客户: ${apt.clientName}\\n猫咪: ${apt.catCount}只\\n密码: ${apt.lockCode}\\n备注: ${apt.notes || '无'}\\n费用: ¥${apt.totalPrice}`;
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${startDateTime}`,
      `DTEND:${endDateTime}`,
      `SUMMARY:喂猫 - ${apt.clientName}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${apt.address}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `meow_walker_${apt.date}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const EmptyState = () => (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 min-h-[50vh] animate-fade-in">
      <div className="w-32 h-32 bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center mb-6 shadow-lg border border-white/40">
          {viewMode === 'active' ? (
             <Cat className="w-16 h-16 text-blue-300" />
          ) : (
             <History className="w-16 h-16 text-blue-300" />
          )}
      </div>
      <p className="text-lg font-bold text-slate-600/80">
          {viewMode === 'active' ? '暂无待办喂猫安排' : '暂无历史订单'}
      </p>
    </div>
  );

  const groupAppointmentsByDate = (apts: Appointment[]) => {
      const groups: { [key: string]: Appointment[] } = {};
      apts.forEach(apt => {
          if (!groups[apt.date]) groups[apt.date] = [];
          groups[apt.date].push(apt);
      });
      return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  };

  return (
    <div className="flex flex-col h-full">
      {/* Glassy Segmented Control */}
      <div className="flex items-center justify-center mb-6 sticky top-0 z-10 shrink-0">
         <div className="flex bg-white/40 backdrop-blur-xl p-1.5 rounded-2xl relative w-full border border-white/40 shadow-sm">
            {/* Sliding Background */}
            <div 
                className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-md transition-all duration-300 ease-spring ${viewMode === 'active' ? 'left-1.5' : 'left-[calc(50%+3px)]'}`}
            ></div>

            <button 
                onClick={() => setViewMode('active')}
                className={`flex-1 relative z-10 text-sm font-bold py-2.5 rounded-xl transition-colors duration-200 text-center flex items-center justify-center gap-2 ${viewMode === 'active' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <CalendarCheck className="w-4 h-4" />
                待办行程
            </button>
            <button 
                onClick={() => setViewMode('history')}
                className={`flex-1 relative z-10 text-sm font-bold py-2.5 rounded-xl transition-colors duration-200 text-center flex items-center justify-center gap-2 ${viewMode === 'history' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <History className="w-4 h-4" />
                历史记录
            </button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20 no-scrollbar">
          {viewMode === 'history' && sortedAppointments.length > 0 && (
              <div className="bg-gradient-to-r from-emerald-500/90 to-teal-500/90 backdrop-blur-md rounded-2xl p-5 text-white shadow-lg mb-6 flex justify-between items-center animate-fade-in border border-white/20">
                  <div>
                      <p className="text-emerald-100 text-xs font-bold mb-1 uppercase tracking-wide">累计收入</p>
                      <p className="text-3xl font-extrabold flex items-baseline"><span className="text-lg mr-1">¥</span>{totalIncome}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md shadow-inner border border-white/20">
                      <History className="w-6 h-6 text-white" />
                  </div>
              </div>
          )}
          
          {sortedAppointments.length === 0 ? <EmptyState /> : (
            <div className="space-y-4 animate-fade-in">
                {viewMode === 'active' ? (
                    // ACTIVE VIEW
                    sortedAppointments.map((apt) => (
                        <div key={apt.id} className="bg-white/70 backdrop-blur-xl rounded-3xl p-5 shadow-lg border border-white/50 relative overflow-hidden group transition-all hover:scale-[1.01]">
                            {/* Status Indicator Bar */}
                            <div className={`absolute top-0 left-0 w-1.5 h-full ${apt.isHoliday ? 'bg-orange-400' : 'bg-blue-500'}`}></div>
                            
                            <div className="flex justify-between items-start mb-4 pl-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="font-extrabold text-3xl tracking-tight text-slate-800 font-mono">{apt.time}</span>
                                        <div className="flex flex-col leading-none ml-1">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{getDayLabel(apt.date)}</span>
                                            <span className="text-sm font-bold text-blue-600">
                                                {new Date(apt.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-700 flex items-center gap-1">
                                        {apt.clientName}
                                    </h3>
                                </div>
                                <div className="text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="font-extrabold text-2xl block text-blue-600">¥{apt.totalPrice}</span>
                                        {apt.isHoliday && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold border border-orange-200">节假日</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="pl-3 space-y-3">
                                <div className="flex items-start gap-2 text-sm text-gray-600 bg-white/50 p-3 rounded-2xl border border-white/50 shadow-sm">
                                    <MapPin className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
                                    <span className="leading-tight font-bold text-slate-600">{apt.address}</span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-orange-50/60 rounded-2xl p-3 border border-orange-100/50 backdrop-blur-sm">
                                        <div className="flex items-center gap-1.5 text-orange-400 mb-1">
                                            <Key className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-bold uppercase">密码</span>
                                        </div>
                                        <span className="text-sm font-mono font-bold text-slate-700 block truncate tracking-wide select-all">{apt.lockCode}</span>
                                    </div>
                                    <div className="bg-blue-50/60 rounded-2xl p-3 border border-blue-100/50 backdrop-blur-sm">
                                        <div className="flex items-center gap-1.5 text-blue-400 mb-1">
                                            <Cat className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-bold uppercase">猫咪</span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 block">{apt.catCount} 只</span>
                                    </div>
                                </div>

                                {apt.notes && apt.notes !== '无' && (
                                    <div className="mt-2 text-sm text-gray-600 bg-yellow-50/40 p-3 rounded-2xl border border-yellow-100/50 relative backdrop-blur-sm">
                                        <div className="flex items-start gap-2">
                                            <StickyNote className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                                            <div>
                                                <span className="text-[10px] font-bold text-yellow-600/80 block mb-0.5 uppercase">备注</span>
                                                <p className="line-clamp-2 leading-relaxed text-slate-600 text-xs font-medium">{apt.notes}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100/50">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            addToSystemCalendar(apt);
                                        }}
                                        className="px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50/60 hover:bg-blue-100/80 rounded-xl transition-colors flex items-center gap-1.5 border border-blue-100/50"
                                    >
                                        <BellRing className="w-3.5 h-3.5" />
                                        加入日历
                                    </button>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if(window.confirm('确定要删除这条日程吗？')) {
                                                    onDelete(apt.id);
                                                }
                                            }}
                                            className="px-4 py-2 text-xs font-bold text-red-500 hover:text-red-600 bg-red-50/60 hover:bg-red-100/80 rounded-xl transition-colors flex items-center gap-1.5 border border-red-100/50"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            删除
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onComplete(apt.id);
                                            }}
                                            className="px-4 py-2 text-xs font-bold text-emerald-600 bg-emerald-50/60 hover:bg-emerald-100/80 border border-emerald-100/50 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                                        >
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            完成
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    // HISTORY VIEW
                    <div className="space-y-6">
                        {groupAppointmentsByDate(sortedAppointments).map(([date, items]) => (
                            <div key={date}>
                                <div className="flex items-center gap-2 mb-2 px-1">
                                    <div className="w-1.5 h-1.5 bg-blue-300 rounded-full"></div>
                                    <h4 className="text-sm font-bold text-slate-500">{date} <span className="text-xs font-normal ml-1 text-slate-400">{getDayLabel(date)}</span></h4>
                                </div>
                                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-sm border border-white/50 divide-y divide-gray-100 overflow-hidden">
                                    {items.map(apt => (
                                        <div key={apt.id} className="p-4 flex items-center justify-between group hover:bg-white/40 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col items-center justify-center w-12 bg-gray-50/80 rounded-xl py-2 border border-gray-100">
                                                    <span className="text-xs font-bold text-slate-600">{apt.time}</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700">{apt.clientName}</p>
                                                    <p className="text-[10px] text-gray-400 max-w-[150px] truncate mt-0.5">{apt.address}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-emerald-500 text-sm">¥{apt.totalPrice}</span>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if(window.confirm('删除这条历史记录？')) {
                                                            onDelete(apt.id);
                                                        }
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          )}
      </div>
    </div>
  );
};