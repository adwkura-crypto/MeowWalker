import React, { useState, useMemo } from 'react';
import { AppSettings, Appointment, DistanceResult } from '../types';
import { calculateDistance, checkIsHoliday } from '../services/geminiService';
import { MapPin, Clock, Save, Info, Plus, X, Copy, CalendarPlus, ChevronRight, Users, User, Zap } from 'lucide-react';
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
  const [selectedDates, setSelectedDates] = useState<string[]>([new Date().toISOString().split('T')[0]]);
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
    if (selectedDates.length > 1) {
        setSelectedDates(selectedDates.filter(d => d !== dateToRemove));
    } else {
        showToast("至少需要一个日期喵");
    }
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
    setSelectedDates([new Date().toISOString().split('T')[0]]);
  };

  return (
    <div className="space-y-6 relative">
      {/* Old Client Modal */}
      {showClientList && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4" onClick={() => setShowClientList(false)}>
              <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
                      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-500" />
                          选择老客户
                      </h3>
                      <button onClick={() => setShowClientList(false)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300">
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
                                className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all group"
                              >
                                  <div className="flex justify-between items-start">
                                      <span className="font-bold text-slate-700 group-hover:text-blue-700">{c.name}</span>
                                      <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">曾用</span>
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

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-50">
        
        {/* Prominent Old Client Button - Theme Blue */}
        <button 
            onClick={() => setShowClientList(true)}
            className="w-full mb-6 py-3 px-4 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 font-bold transform transition-all active:scale-95 hover:from-blue-500 hover:to-blue-700"
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
            <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 uppercase">客户称呼</label>
            <div className="relative">
                <input 
                    type="text" 
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="例如：张小姐"
                    className="w-full p-3 pl-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-300 text-sm font-medium text-slate-700"
                />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 uppercase">客户地址</label>
            <AddressInput
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="例如：幸福花园5号楼201"
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-300 text-sm font-medium text-slate-700"
            />
          </div>

          <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 uppercase">上门时间</label>
                <div className="relative">
                <input 
                    type="time" 
                    value={time} 
                    onChange={e => setTime(e.target.value)} 
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-sm font-bold text-slate-700" 
                />
                </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 uppercase">猫咪数量</label>
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200 h-[46px]">
                <button onClick={() => setCatCount(Math.max(1, catCount - 1))} className="w-9 h-full flex items-center justify-center rounded-lg bg-white shadow-sm text-blue-600 font-bold active:bg-blue-50 transition-colors">-</button>
                <span className="flex-1 text-center font-bold text-gray-700">{catCount}</span>
                <button onClick={() => setCatCount(catCount + 1)} className="w-9 h-full flex items-center justify-center rounded-lg bg-white shadow-sm text-blue-600 font-bold active:bg-blue-50 transition-colors">+</button>
            </div>
          </div>

          <div>
             <label className="block text-xs font-bold text-gray-400 mb-1 ml-1 uppercase">喂猫日期 ({selectedDates.length}天)</label>
             <div className="flex flex-wrap gap-2 mb-2">
                {selectedDates.map(date => (
                    <div key={date} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border border-blue-100">
                        {date.slice(5)} 
                        <button onClick={() => removeDate(date)} className="text-blue-400 hover:text-blue-700 p-0.5"><X className="w-3 h-3" /></button>
                    </div>
                ))}
             </div>
             <div className="relative">
                <input 
                    type="date"
                    className="w-full p-3 pl-10 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-medium text-slate-700"
                    onChange={handleAddDate}
                    value="" // Always reset to allow picking same date if needed (though we filter dupes)
                />
                <CalendarPlus className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
             </div>
          </div>

          <Button onClick={handleCalculate} isLoading={isLoading} className="w-full mt-2 shadow-blue-300/50 py-3.5 text-base">
            开始估价
          </Button>
        </div>
      </div>

      {quote && (
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 rounded-3xl shadow-xl text-white animate-fade-in relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent"></div>

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
                <div>
                <p className="text-blue-200 text-xs mb-1 font-medium tracking-wide">预估总费用</p>
                <h3 className="text-5xl font-extrabold tracking-tight flex items-baseline">
                    <span className="text-2xl mr-1">¥</span>{quote.totalPrice}
                </h3>
                </div>
                <div className="text-right">
                    <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 mb-1 border border-white/20">
                        <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                        <span className="text-sm font-bold">{quote.result.distanceKm.toFixed(1)} km</span>
                    </div>
                    <div className="text-[10px] text-blue-200 font-medium">骑行距离</div>
                </div>
            </div>

            <div className="bg-black/20 rounded-xl p-4 backdrop-blur-sm mb-6 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                     <h4 className="text-xs font-bold text-blue-200 uppercase tracking-wider">费用明细</h4>
                     <span className="text-[10px] bg-blue-500/30 px-2 py-0.5 rounded text-blue-100 border border-blue-400/30">
                        包含 {selectedDates.length} 次上门
                     </span>
                </div>
                <ul className="space-y-2">
                {quote.breakdown.map((item, idx) => (
                    <li key={idx} className="text-sm text-white/90 flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-300 mt-1.5 shrink-0"></div>
                    <span className="leading-snug">{item}</span>
                    </li>
                ))}
                </ul>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-lg mb-4 text-gray-800">
                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    补充信息
                </h4>
                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">门锁密码</label>
                        <input type="text" value={lockCode} onChange={e => setLockCode(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-blue-400" placeholder="未填写" />
                    </div>
                    <div>
                         <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">备注</label>
                         <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-blue-400" placeholder="特殊要求..." />
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                 <Button onClick={handleCopyQuote} variant="secondary" className="w-full bg-white/20 text-white border-white/40 hover:bg-white/30 backdrop-blur-md">
                    <Copy className="w-4 h-4" />
                    复制报价单给客户
                </Button>
                <Button 
                  onClick={handleSave} 
                  className="w-full shadow-xl shadow-blue-500/40 py-4 text-base bg-blue-600 text-white hover:bg-blue-700 border-none transform transition-all hover:scale-[1.01]"
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