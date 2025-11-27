import React, { useState } from 'react';
import { AppSettings, PricingTier } from '../types';
import { Button } from './Button';
import { Save, Home, DollarSign, PlusCircle, Trash, Settings, ArrowLeft } from 'lucide-react';
import { AddressInput } from './AddressInput';

interface SettingsFormProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({ settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

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
      
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-blue-50/50">
        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
          <Home className="w-4 h-4 text-blue-500" /> 出发位置
        </h3>
        <AddressInput 
          value={localSettings.baseAddress}
          onChange={(e) => setLocalSettings({...localSettings, baseAddress: e.target.value})}
          className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none text-sm transition-all"
          placeholder="请输入您的常驻地址"
        />
        <p className="text-xs text-gray-400 mt-2 px-1">所有行程距离将以此地址为起点进行计算（电动车骑行距离）。</p>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-blue-50/50">
        <h3 className="font-bold text-slate-700 mb-5 flex items-center gap-2 text-sm uppercase tracking-wide">
          <DollarSign className="w-4 h-4 text-green-500" /> 基础收费标准
        </h3>
        
        <div className="space-y-3 mb-6">
          <div className="flex justify-between px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
             <span>骑行距离 (公里以内)</span>
             <span className="pr-12">价格 (¥)</span>
          </div>
          
          {localSettings.pricingTiers.map((tier, idx) => (
            <div key={idx} className="flex items-center gap-3 group animate-fade-in">
              <div className="relative w-28">
                <input 
                  type="number" 
                  value={tier.maxDistance}
                  onChange={(e) => handleTierChange(idx, 'maxDistance', e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 text-center font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none"
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
                  className="w-full p-3 pl-7 rounded-xl border border-gray-100 bg-gray-50 font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none"
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

        <div className="border-t border-gray-50 pt-6 space-y-4">
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block px-1">附加费用配置</label>
             <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                <span className="text-sm text-slate-700 font-bold">节假日 / 周末</span>
                <div className="relative w-24">
                    <span className="absolute left-3 top-2.5 text-xs text-gray-400">¥</span>
                    <input 
                        type="number" 
                        value={localSettings.holidaySurcharge}
                        onChange={(e) => setLocalSettings({...localSettings, holidaySurcharge: parseFloat(e.target.value) || 0})}
                        className="w-full p-2 pl-7 rounded-xl border border-gray-200 shadow-sm text-sm font-bold text-blue-600 outline-none focus:border-blue-400 text-right" 
                    />
                </div>
             </div>
             <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
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
                        className="w-full p-2 pl-7 rounded-xl border border-gray-200 shadow-sm text-sm font-bold text-blue-600 outline-none focus:border-blue-400 text-right" 
                    />
                </div>
             </div>
        </div>
      </div>

      <Button onClick={save} className="w-full shadow-xl shadow-blue-200 py-4 text-base">
        <Save className="w-5 h-5" /> 保存并返回
      </Button>
    </div>
  );
};