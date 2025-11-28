import React, { useState, useMemo } from 'react';
import { AppSettings, Appointment, DistanceResult } from '../types';
import { calculateDistance, checkIsHoliday } from '../services/geminiService';
import { Clock, Save, Info, Plus, X, Copy, CalendarPlus, ChevronRight, Users, User, Zap, CalendarDays, MapPin } from 'lucide-react';
import { Button } from './Button';
import { AddressInput } from './AddressInput';

interface CalculatorProps {
  settings: AppSettings;
  onSaveAppointment: (apts: Appointment[]) => void;
  showToast: (msg: string) => void;
  appointments: Appointment[];
}

export const Calculator: React.FC<CalculatorProps> = ({ settings, onSaveAppointment, showToast, appointments }) => {
  const [address, setAddress] = useState('');
  const [clientName, setClientName] = useState('');
  const [catCount, setCatCount] = useState(1);
  const [selectedDates, setSelectedDates] = useState<string[]>([]); // Initialize empty
  const [time, setTime] = useState('12:00');
  const [lockCode, setLockCode] = useState('');
  const [notes, setNotes] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [showClientList, setShowClientList] = useState(false);
  
  const [quote, setQuote] = useState<{
    result: DistanceResult;
    totalPrice: number;
    singleTripPrice: number; // Base price before date multiplier
    breakdown: string[];
    dateDetails: { date: string; isHoliday: boolean; price: number }[];
  } | null>(null);

  // Derive unique clients from appointment history
  const uniqueClients = useMemo(() => {
    const map = new Map();
    appointments.forEach(apt => {
        const key = `${apt.clientName}-${apt.address}`;
        if (!map.has(key)) {
            map.set(key, { name: apt.clientName, address: apt.address, lastDate: apt.date });
        }
    });
    return Array.from(map.values());
  }, [appointments]);

  const handleSelectClient = (c: { name: string, address: string }) => {
      setClientName(c.name);
      setAddress(c.address);
      setShowClientList(false);
      showToast("已填入老客户信息");
  };

  const handleAddDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val && !selectedDates.includes(val)) {
      setSelectedDates([...selectedDates, val].sort());
    }
  };

  const removeDate = (dateToRemove: string) => {
    setSelectedDates(selectedDates.filter(d => d !== dateToRemove));
  };

  const getWeekday = (dateStr: string) => {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[new Date(dateStr).getDay()];
  };

  const calculateSingleTripPrice = (distance: number, cats: number, isHoliday: boolean) => {
    let price = 0;
    
    // Base Distance Price
    const tier = settings.pricingTiers.find(t => distance <= t.maxDistance);
    if (tier) {
      price += tier.price;
    } else {
      const maxTier = settings.pricingTiers[settings.pricingTiers.length - 1];
      price += maxTier.price;
    }

    if (isHoliday) {
      price += settings.holidaySurcharge;
    }

    if (cats > 1) {
      const extraCats = cats - 1;
      price += extraCats * settings.extraCatSurcharge;
    }

    return price;
  };

  const handleCalculate = async () => {
    if (!address) {
        showToast("请输入客户地址");
        return;
    }
    if (!settings.baseAddress) {
        showToast("请先在设置中配置出发地址");
        return;
    }
    if (selectedDates.length === 0) {
        showToast("请至少选择一个喂猫日期");
        return;
    }

    setIsLoading(true);
    try {
      const distResult = await calculateDistance(settings.baseAddress, address);
      
      let total = 0;
      const dateDetails = [];
      
      // Calculate for each date individually
      for (const d of selectedDates) {
          const isHol = await checkIsHoliday(d);
          const p = calculateSingleTripPrice(distResult.distanceKm, catCount, isHol);
          total += p;
          dateDetails.push({ date: d, isHoliday: isHol, price: p });
      }

      // Generate Breakdown Text
      const breakdown: string[] = [];
      breakdown.push(`骑行距离: ${distResult.distanceKm.toFixed(1)}km (${settings.baseAddress} → ${address})`);
      breakdown.push(`上门天数: ${selectedDates.length}天`);
      const holidayCount = dateDetails.filter(d => d.isHoliday).length;
      if (holidayCount > 0) breakdown.push(`包含节假日: ${holidayCount}天`);
      if (catCount > 1) breakdown.push(`多猫加价: ${catCount - 1}只`);

      setQuote({
        result: distResult,
        totalPrice: total,
        singleTripPrice: dateDetails[0].price, // Just for reference
        breakdown,
        dateDetails
      });
    } catch (e: any) {
      console.error(e);
      // 如果是字符串错误直接显示，否则显示通用错误
      const errorMsg = typeof e === 'string' ? e : "无法计算路线，请检查地址是否正确";
      showToast(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyQuote = () => {
    if (!quote) return;
    const lines = [
        `🐱 上门喂猫报价单`,
        `客户: ${clientName || '未填写'}`,
        `地址: ${address}`,
        `日期: ${selectedDates.map(d => d.slice(5)).join(', ')}`, // MM-DD
        `时间: ${time}`,
        `猫咪: ${catCount}只`,
        `----------------`,
        `骑行距离: ${quote.result.distanceKm.toFixed(1)}km`,
        ...quote.breakdown.filter(l => !l.startsWith('骑行距离')),
        `----------------`,
        `💰 总费用: ¥${quote.totalPrice}`
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
        showToast("报价已复制，快去发给客户吧！");
    });
  };

  const handleSave = () => {
    if (!quote) return;
    if (!clientName) {
        showToast("请输入客户称呼");
        return;
    }
    
    // Create an appointment for each date
    const newApts: Appointment[] = quote.dateDetails.map(detail => ({
      id: Date.now() + Math.random().toString(), // unique id
      clientName: clientName,
      address,
      date: detail.date,
      time,
      catCount,
      distanceKm: quote.result.distanceKm,
      durationMin: quote.result.durationMin,
      totalPrice: detail.price, // Price for this specific day
      lockCode: lockCode || '未填写',
      notes: notes || '无',
      isHoliday: detail.isHoliday,
      status: 'pending'
    }));

    onSaveAppointment(newApts);
    setQuote(null);
    setClientName('');
    setAddress('');
    setNotes('');
    setLockCode('');
    setSelectedDates([]);
  };

  return (
    <div className="space-y-6 relative pb-10">
      {/* Old Client Modal */}
      {showClientList && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-md animate-fade-in p-4" onClick={() => setShowClientList(false)}>
              <div className="bg-white/95 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col border border-white/40" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-500" />
                          选择老客户
                      </h3>
                      <button onClick={() => setShowClientList(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                          <X className="w-4 h-4 text-gray-600" />
                      </button>
                  </div>
                  <div className="overflow-y-auto p-4 space-y-2">
                      {uniqueClients.length === 0 ? (
                          <div className="text-center py-8 text-gray-400">
                              暂无老客户记录
                          </div>
                      ) : (
                          uniqueClients.map((c, i) => (
                              <button 
                                key={i} 
                                onClick={() => handleSelectClient(c)}
                                className="w-full text-left p-4 rounded-xl border border-gray-100 bg-white hover:bg-blue-50 transition-all group shadow-sm"
                              >
                                  <div className="flex justify-between items-start">
                                      <span className="font-bold text-slate-700 group-hover:text-blue-700">{c.name}</span>
                                      <span className="text-[10px] bg-blue-100/80 text-blue-600 px-2 py-0.5 rounded-full font-medium">曾用</span>
                                  </div>
                                  <div className="flex items-center gap-1 mt-1 text-gray-500 text-sm">
                                      <MapPin className="w-3.5 h-3.5" />
                                      <span className="truncate">{c.address}</span>
                                  </div>
                              </button>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

      <div className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-white/40">
        
        {/* Prominent Old Client Button - Theme Blue */}
        <button 
            onClick={() => setShowClientList(true)}
            className="w-full mb-6 py-3 px-4 bg-gradient-to-r from-blue-400/90 to-blue-600/90 hover:from-blue-500 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-blue-200/50 flex items-center justify-center gap-2 font-bold transform transition-all active:scale-95 backdrop-blur-sm"
        >
            <Users className="w-5 h-5 text-white" />
            从老客户列表选择
        </button>

        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            上门信息
            </h2>
        </div>
        
        <div className="space-y-4">
           <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">客户称呼</label>
            <div className="relative">
                <input 
                    type="text" 
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="例如：张小姐"
                    className="w-full p-3 pl-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-gray-400 text-base font-medium text-slate-700 bg-white shadow-sm"
                />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">客户地址</label>
            <AddressInput
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="例如：幸福花园5号楼201"
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-gray-400 text-base font-medium text-slate-700 bg-white shadow-sm"
              enablePaste={true}
            />
          </div>

          {/* Time and Cat Count on the same row with increased gap and consistent height */}
          <div className="grid grid-cols-2 gap-6">
              <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">上门时间</label>
                    <div className="relative">
                    <input 
                        type="time" 
                        value={time} 
                        onChange={e => setTime(e.target.value)} 
                        className="w-full rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all bg-white text-base font-bold text-slate-700 shadow-sm text-center h-[54px]" 
                    />
                    </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">猫咪数量</label>
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm h-[54px]">
                    <button onClick={() => setCatCount(Math.max(1, catCount - 1))} className="w-10 h-full flex items-center justify-center rounded-lg bg-gray-50 shadow-sm text-blue-600 font-bold active:bg-blue-100 transition-colors hover:bg-gray-100 border border-gray-100">-</button>
                    <span className="flex-1 text-center font-bold text-gray-700">{catCount}</span>
                    <button onClick={() => setCatCount(catCount + 1)} className="w-10 h-full flex items-center justify-center rounded-lg bg-gray-50 shadow-sm text-blue-600 font-bold active:bg-blue-100 transition-colors hover:bg-gray-100 border border-gray-100">+</button>
                </div>
              </div>
          </div>

          <div>
             <div className="flex justify-between items-end mb-1 ml-1">
                <label className="text-xs font-bold text-gray-500 uppercase">喂猫日期</label>
                <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    共 {selectedDates.length} 天
                </span>
             </div>
             
             {/* Styled Date List */}
             <div className="bg-white border border-gray-200 rounded-xl p-3 mb-2 min-h-[50px] shadow-sm">
                 <div className="flex flex-wrap gap-2">
                    {selectedDates.length === 0 && <span className="text-sm text-gray-400 py-2">请添加日期...</span>}
                    {selectedDates.map(date => (
                        <div key={date} className="group relative bg-blue-50 border border-blue-100 text-blue-700 pl-3 pr-8 py-2 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-all hover:scale-105 hover:shadow-md">
                            <div className="flex flex-col leading-none">
                                <span className="text-sm">{date.slice(5)}</span>
                                <span className="text-[10px] text-blue-400 font-normal">{getWeekday(date)}</span>
                            </div>
                            <button 
                                onClick={() => removeDate(date)} 
                                className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-blue-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                    
                    {/* Inline Add Date Trigger */}
                    <div className="relative">
                        <input 
                            type="date"
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            onChange={handleAddDate}
                            value="" 
                        />
                        <button className="h-full px-4 py-2 bg-gray-50 border border-dashed border-gray-300 text-gray-500 rounded-xl flex items-center gap-1 hover:bg-gray-100 transition-colors">
                            <Plus className="w-4 h-4" />
                            <span className="text-xs font-bold">加一天</span>
                        </button>
                    </div>
                 </div>
             </div>
          </div>

          <Button onClick={handleCalculate} isLoading={isLoading} className="w-full mt-6 shadow-xl shadow-blue-300/40 py-4 text-base bg-blue-600 hover:bg-blue-700 border-none backdrop-blur-sm">
            开始估价
          </Button>
        </div>
      </div>

      {quote && (
        <div className="bg-gradient-to-br from-blue-600/95 to-indigo-600/95 p-6 rounded-3xl shadow-2xl text-white animate-fade-in relative overflow-hidden backdrop-blur-xl border border-white/10">
          {/* Decorative elements */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent"></div>

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
                <div>
                <p className="text-blue-100/80 text-xs mb-1 font-medium tracking-wide">预估总费用</p>
                <h3 className="text-5xl font-extrabold tracking-tight flex items-baseline drop-shadow-sm">
                    <span className="text-2xl mr-1">¥</span>{quote.totalPrice}
                </h3>
                </div>
                <div className="text-right">
                    <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 mb-1 border border-white/20 shadow-sm">
                        <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                        <span className="text-sm font-bold">{quote.result.distanceKm.toFixed(1)} km</span>
                    </div>
                    <div className="text-[10px] text-blue-200 font-medium">骑行距离</div>
                </div>
            </div>

            <div className="bg-black/20 rounded-xl p-4 backdrop-blur-md mb-6 border border-white/10 shadow-inner">
                <div className="flex justify-between items-center mb-2">
                     <h4 className="text-xs font-bold text-blue-200 uppercase tracking-wider">费用明细</h4>
                     <span className="text-[10px] bg-blue-500/30 px-2 py-0.5 rounded text-blue-100 border border-blue-400/30">
                        包含 {selectedDates.length} 次上门
                     </span>
                </div>
                <ul className="space-y-2">
                {quote.breakdown.map((item, idx) => (
                    <li key={idx} className="text-sm text-white/90 flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-300 mt-1.5 shrink-0 shadow-[0_0_5px_rgba(147,197,253,0.8)]"></div>
                    <span className="leading-snug">{item}</span>
                    </li>
                ))}
                </ul>
            </div>

            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg mb-4 text-gray-800 border border-white/50">
                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    补充信息
                </h4>
                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">门锁密码</label>
                        <input type="text" value={lockCode} onChange={e => setLockCode(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg p-2 text-base outline-none focus:ring-1 focus:ring-blue-400 transition-all shadow-sm" placeholder="未填写" />
                    </div>
                    <div>
                         <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">备注</label>
                         <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg p-2 text-base outline-none focus:ring-1 focus:ring-blue-400 transition-all shadow-sm" placeholder="特殊要求..." />
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                 <Button onClick={handleCopyQuote} variant="secondary" className="w-full bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-md">
                    <Copy className="w-4 h-4" />
                    复制报价单给客户
                </Button>
                <Button 
                  onClick={handleSave} 
                  className="w-full shadow-xl shadow-blue-900/30 py-4 text-base bg-white text-blue-600 hover:bg-blue-50 border-none transform transition-all hover:scale-[1.01]"
                >
                    <Save className="w-5 h-5" />
                    保存日程
                </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};