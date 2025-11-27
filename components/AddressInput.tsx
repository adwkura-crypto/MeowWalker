import React, { useState, useEffect, useRef } from 'react';
import { searchPlaces, getCurrentLocation } from '../services/geminiService';
import { MapPin, Loader2, ClipboardPaste, Crosshair } from 'lucide-react';

interface AddressInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onAddressSelect?: (address: string) => void;
  enablePaste?: boolean;
  enableLocation?: boolean;
}

export const AddressInput: React.FC<AddressInputProps> = ({ 
  className, 
  value, 
  onChange, 
  onAddressSelect,
  enablePaste = false,
  enableLocation = false,
  ...props 
}) => {
  const [query, setQuery] = useState(value as string || '');
  const [suggestions, setSuggestions] = useState<Array<{name: string, address: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync internal state with prop
  useEffect(() => {
    setQuery(value as string || '');
  }, [value]);

  useEffect(() => {
    // Close dropdown if clicked outside
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const performSearch = async (searchTerm: string) => {
      if (!searchTerm || searchTerm.length < 2) {
          setSuggestions([]);
          setShowDropdown(false);
          return;
      }

      setLoading(true);
      setShowDropdown(true); 
      
      const results = await searchPlaces(searchTerm);
      
      setSuggestions(results);
      setLoading(false);
      setShowDropdown(true); 
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    updateValue(val);
  };

  const updateValue = (val: string) => {
    setQuery(val);
    
    // Create synthetic event for parent onChange
    if (onChange) {
        const event = {
          target: { value: val }
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
    }

    // Debounce search
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
        performSearch(val);
    }, 600); 
  };

  const handleSelect = (item: {name: string, address: string}) => {
    const fullAddress = item.address; 
    setQuery(fullAddress);
    setShowDropdown(false);
    
    if (onChange) {
       const event = {
         target: { value: fullAddress }
       } as React.ChangeEvent<HTMLInputElement>;
       onChange(event);
    }
    if (onAddressSelect) onAddressSelect(fullAddress);
  };

  const handlePaste = async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            updateValue(text);
        }
    } catch (err) {
        console.error('Failed to read clipboard', err);
        // Fallback or alert if needed
        alert("无法访问剪贴板，请手动粘贴");
    }
  };

  const handleLocate = async () => {
      setLocating(true);
      try {
          const address = await getCurrentLocation();
          updateValue(address);
      } catch (err) {
          alert("定位失败，请检查定位权限");
      } finally {
          setLocating(false);
      }
  };

  return (
    <div className="relative group" ref={wrapperRef}>
      <input
        {...props}
        value={query}
        onChange={handleInputChange}
        className={`${className} pr-20`} // Add padding for right buttons
        autoComplete="off"
        style={{ fontSize: '16px' }}
      />
      
      {/* Right Action Buttons */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {enablePaste && (
            <button 
                type="button"
                onClick={handlePaste}
                className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                title="粘贴地址"
            >
                <ClipboardPaste className="w-4 h-4" />
            </button>
          )}
          {enableLocation && (
             <button 
                type="button"
                onClick={handleLocate}
                disabled={locating}
                className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                title="定位当前位置"
             >
                 {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
             </button>
          )}
      </div>

      {showDropdown && (query.length > 1) && (
        <div className="absolute z-50 w-full bg-white mt-1.5 rounded-xl shadow-xl border border-gray-100 max-h-64 overflow-y-auto animate-fade-in overflow-hidden">
           {loading ? (
             <div className="p-4 text-center text-gray-400 flex items-center justify-center gap-2 text-sm">
               <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> 
               正在搜索地址...
             </div>
           ) : (
             suggestions.length > 0 ? (
                <div>
                   <div className="px-3 py-2 bg-gray-50/80 text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100 backdrop-blur-sm sticky top-0">
                      建议地址
                   </div>
                   {suggestions.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleSelect(item)}
                        className="w-full text-left p-3 hover:bg-blue-50/80 transition-colors border-b border-gray-50 last:border-0 flex items-start gap-3 group"
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 group-hover:bg-blue-100 group-hover:scale-110 transition-all">
                            <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                        <div className="font-bold text-slate-700 text-sm group-hover:text-blue-700">{item.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{item.address}</div>
                        </div>
                    </button>
                    ))}
                </div>
             ) : (
                <div className="p-4 text-center text-gray-400 text-xs">
                   未找到相关地址
                </div>
             )
           )}
        </div>
      )}
    </div>
  );
};