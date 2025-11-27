import React, { useState, useEffect, useRef } from 'react';
import { searchPlaces } from '../services/geminiService';
import { MapPin, Loader2 } from 'lucide-react';

interface AddressInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onAddressSelect?: (address: string) => void;
}

export const AddressInput: React.FC<AddressInputProps> = ({ 
  className, 
  value, 
  onChange, 
  onAddressSelect,
  ...props 
}) => {
  const [query, setQuery] = useState(value as string || '');
  const [suggestions, setSuggestions] = useState<Array<{name: string, address: string}>>([]);
  const [loading, setLoading] = useState(false);
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
      setShowDropdown(true); // Show loader
      
      const results = await searchPlaces(searchTerm);
      
      setSuggestions(results);
      setLoading(false);
      setShowDropdown(true); // Ensure dropdown is open to show results
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (onChange) onChange(e);

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
    
    // Propagate change
    if (onChange) {
       const event = {
         target: { value: fullAddress }
       } as React.ChangeEvent<HTMLInputElement>;
       onChange(event);
    }
    // Also propagate just the string if convenient for parent
    if (onAddressSelect) onAddressSelect(fullAddress);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        {...props}
        value={query}
        onChange={handleInputChange}
        className={className}
        autoComplete="off"
      />
      
      {showDropdown && (query.length > 1) && (
        <div className="absolute z-50 w-full bg-white mt-1.5 rounded-xl shadow-xl border border-blue-100 max-h-64 overflow-y-auto animate-fade-in overflow-hidden">
           {loading ? (
             <div className="p-4 text-center text-gray-400 flex items-center justify-center gap-2 text-sm">
               <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> 
               正在搜索地址...
             </div>
           ) : (
             suggestions.length > 0 ? (
                <div>
                   <div className="px-3 py-2 bg-gray-50 text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100">
                      建议地址
                   </div>
                   {suggestions.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleSelect(item)}
                        className="w-full text-left p-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 flex items-start gap-3 group"
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