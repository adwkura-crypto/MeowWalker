import React, { useState } from 'react';
import { AppSettings, PricingTier } from '../types';
import { Button } from './Button';
import { Save, Home, DollarSign, PlusCircle, Trash, Settings, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { AddressInput } from './AddressInput';

interface SettingsFormProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({ settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [isPricingOpen, setIsPricingOpen] = useState(false); // Default Closed
  const [isExtraFeesOpen, setIsExtraFeesOpen] = useState(false); // Default Closed

  const handleTierChange = (index: number, field: keyof PricingTier, value: string) => {
    const newTiers = [...localSettings.pricingTiers];
    newTiers[index] = {
      ...newTiers[index],
      [field]: parseFloat(value) || 0
    };
    setLocalSettings({ ...localSettings, pricingTiers: newTiers });
  };

  const handleAddTier = () => {
    setLocalSettings({
      ...localSettings,
      pricingTiers: [...localSettings.pricingTiers, { maxDistance: 0, price: 0 }]
    });
  };

  const handleRemoveTier = (index: number) => {
    const newTiers = localSettings.pricingTiers.filter((_, i) => i !== index);
    setLocalSettings({ ...localSettings, pricingTiers: newTiers });
  };

  const save = () => {
    onSave(localSettings);
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-2 mb-4">
         <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-blue-600" />
         </div>
         <h2 className="text-xl font-bold text-slate-800">规则设置</h2>
       </div>
      
      {/* 1. Base Address - Removed overflow-hidden so autocomplete dropdown shows */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-white/60">
        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
          <Home className="w-4 h-4 text-blue-500" /> 出发位置
        </h3>
        <AddressInput 
          value={localSettings.baseAddress}
          onChange={(e) => setLocalSettings({...localSettings, baseAddress: e.target.value})}
          className="w-full p-4 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none text-sm transition-all shadow-sm"
          placeholder="点右侧定位或输入地址"
          enableLocation={true}
        />
        <p className="text-xs text-gray-400 mt-2 px-1">所有行程距离将以此地址为起点进行计算（电动车骑行距离）。</p>
      </div>

      {/* 2. Pricing Tiers - Removed overflow-hidden */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-white/60">
        <button 
          onClick={() => setIsPricingOpen(!isPricingOpen)}
          className="w-full p-6 flex justify-between items-center text-left hover:bg-white/50 transition-colors rounded-3xl"
        >
          <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wide">
            <DollarSign className="w-4 h-4 text-green-500" /> 基础收费标准
          </h3>
          {isPricingOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        
        {isPricingOpen && (
          <div className="px-6 pb-6 animate-fade-in">
             <div className="space-y-3">
              <div className="flex justify-between px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <span>骑行距离 (公里以内)</span>
                <span className="pr-12">价格 (¥)</span>
              </div>
              
              {localSettings.pricingTiers.map((tier, idx) => (
                <div key={idx} className="flex items-center gap-3 group">
                  <div className="relative w-28">
                    <input 
                      type="number" 
                      value={tier.maxDistance}
                      onChange={(e) => handleTierChange(idx, 'maxDistance', e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-200 bg-white text-center font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none shadow-sm"
                    />
                    <span className="absolute right-3 top-3.5 text-xs text-gray-400 font-medium">km</span>
                  </div>
                  <span className="text-gray-300">→</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-3.5 text-xs text-gray-400">¥</span>
                    <input 
                      type="number" 
                      value={tier.price}
                      onChange={(e) => handleTierChange(idx, 'price', e.target.value)}
                      className="w-full p-3 pl-7 rounded-xl border border-gray-200 bg-white font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none shadow-sm"
                    />
                  </div>
                  <button onClick={() => handleRemoveTier(idx)} className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              <button onClick={handleAddTier} className="w-full py-3 rounded-xl border border-dashed border-blue-200 text-blue-500 text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition-all mt-2">
                <PlusCircle className="w-4 h-4" /> 添加距离阶梯
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Extra Fees - Removed overflow-hidden */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-white/60">
        <button 
            onClick={() => setIsExtraFeesOpen(!isExtraFeesOpen)}
            className="w-full p-6 flex justify-between items-center text-left hover:bg-white/50 transition-colors rounded-3xl"
          >
            <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wide">
              <Zap className="w-4 h-4 text-orange-500" /> 附加费用配置
            </h3>
            {isExtraFeesOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        
        {isExtraFeesOpen && (
          <div className="px-6 pb-6 animate-fade-in space-y-4">
             <div className="flex justify-between items-center bg-white/50 p-4 rounded-2xl border border-gray-100/50">
                <span className="text-sm text-slate-700 font-bold">节假日 / 周末</span>
                <div className="relative w-24">
                    <span className="absolute left-3 top-2.5 text-xs text-gray-400">¥</span>
                    <input 
                        type="number" 
                        value={localSettings.holidaySurcharge}
                        onChange={(e) => setLocalSettings({...localSettings, holidaySurcharge: parseFloat(e.target.value) || 0})}
                        className="w-full p-2 pl-7 rounded-xl border border-gray-200 shadow-sm text-sm font-bold text-blue-600 outline-none focus:border-blue-400 text-right bg-white" 
                    />
                </div>
             </div>
             <div className="flex justify-between items-center bg-white/50 p-4 rounded-2xl border border-gray-100/50">
                <div className="flex flex-col">
                    <span className="text-sm text-slate-700 font-bold">多猫加价</span>
                    <span className="text-[10px] text-gray-400 font-medium">每增加一只收取</span>
                </div>
                <div className="relative w-24">
                    <span className="absolute left-3 top-2.5 text-xs text-gray-400">¥</span>
                    <input 
                        type="number" 
                        value={localSettings.extraCatSurcharge}
                        onChange={(e) => setLocalSettings({...localSettings, extraCatSurcharge: parseFloat(e.target.value) || 0})}
                        className="w-full p-2 pl-7 rounded-xl border border-gray-200 shadow-sm text-sm font-bold text-blue-600 outline-none focus:border-blue-400 text-right bg-white" 
                    />
                </div>
             </div>
          </div>
        )}
      </div>

      <Button onClick={save} className="w-full shadow-xl shadow-blue-200 py-4 text-base mb-10">
        <Save className="w-5 h-5" /> 保存并返回
      </Button>
    </div>
  );
};