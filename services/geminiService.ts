import { DistanceResult } from "../types";

declare global {
  interface Window {
    AMap: any;
    _AMapSecurityConfig: any;
    [key: string]: any; // Allow dynamic callback names
  }
}

// Singleton loader promise to prevent multiple script injections
let aMapLoader: Promise<any> | null = null;

const loadAMap = (): Promise<any> => {
    // 1. If AMap is already available globally and appears valid
    if (window.AMap && window.AMap.v) {
        return Promise.resolve(window.AMap);
    }
    
    // 2. If we are already loading, return the existing promise.
    if (aMapLoader) {
        return aMapLoader;
    }

    // 3. Ensure Security Config is set before script injection.
    window._AMapSecurityConfig = {
        securityJsCode: '58d423f19a17fe7153bc8f67e513450a',
    };

    aMapLoader = new Promise((resolve, reject) => {
        const callbackName = `__AMapLoadedCallback_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // Define the global callback that AMap will call when ready
        window[callbackName] = () => {
            if (window.AMap) {
                resolve(window.AMap);
            } else {
                reject(new Error("AMap callback fired but window.AMap is undefined"));
            }
            // Cleanup
            delete window[callbackName];
        };

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        // Add random query param to prevent caching issues if previous load failed
        // Use the dynamic callback name
        script.src = `https://webapi.amap.com/maps?v=2.0&key=ad56ce5679ff34e2904876add5d51acc&plugin=AMap.Riding,AMap.Geocoder,AMap.AutoComplete&callback=${callbackName}`;
        
        script.onerror = (e) => {
            console.error("AMap Script Load Error:", e);
            // Cleanup
            delete window[callbackName];
            reject(new Error("Failed to load AMap script (Network Error)"));
        };

        document.head.appendChild(script);
    });

    return aMapLoader;
};

// Wrapper with timeout handling
const waitForAMap = async (): Promise<any> => {
    try {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("地图服务连接超时，请检查网络")), 20000)
        );
        
        const mapPromise = loadAMap();
        
        await Promise.race([mapPromise, timeoutPromise]);
        return window.AMap;
    } catch (error) {
        console.error("waitForAMap failed:", error);
        // CRITICAL: Reset loader on failure to allow retries. 
        // If we don't null this, subsequent calls return the same rejected/timed-out promise.
        aMapLoader = null;
        throw error;
    }
};

export const calculateDistance = async (
  origin: string,
  destination: string
): Promise<DistanceResult> => {
  try {
    const AMap = await waitForAMap();

    // 1. Geocoding Helper
    const getCode = (addr: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            const geocoder = new AMap.Geocoder();
            geocoder.getLocation(addr, (status: any, result: any) => {
                if (status === 'complete' && result.geocodes.length) {
                    resolve(result.geocodes[0].location);
                } else {
                    console.warn(`Geocoding failed for: ${addr}`, status, result);
                    reject(`无法定位地址: "${addr}"`);
                }
            });
        });
    };

    const startLoc = await getCode(origin);
    const endLoc = await getCode(destination);

    // 2. Riding Route Planning
    return new Promise((resolve, reject) => {
        const riding = new AMap.Riding();
        // Policy: 0 (Recommended)
        riding.search(startLoc, endLoc, (status: any, result: any) => {
            if (status === 'complete') {
                if (result.routes && result.routes.length > 0) {
                    const route = result.routes[0];
                    resolve({
                        distanceKm: parseFloat((route.distance / 1000).toFixed(2)),
                        durationMin: Math.ceil(route.time / 60)
                    });
                } else {
                    reject("未找到骑行路线");
                }
            } else {
                console.error("Riding search failed", result);
                reject("路线规划失败，可能是距离过远");
            }
        });
    });

  } catch (error) {
    console.error("AMap Distance Calculation Error:", error);
    throw error;
  }
};

export const searchPlaces = async (query: string): Promise<Array<{ name: string; address: string }>> => {
  if (!query || query.length < 1) return [];
  
  try {
      const AMap = await waitForAMap();

      return new Promise((resolve) => {
        const auto = new AMap.AutoComplete({ city: '全国' });
        auto.search(query, (status: any, result: any) => {
            if (status === 'complete' && result.tips) {
                const places = result.tips
                  .filter((tip: any) => tip.id && tip.location) // Filter out tips without location
                  .map((tip: any) => ({
                      name: tip.name,
                      address: (Array.isArray(tip.district) ? "" : (tip.district || "")) + (Array.isArray(tip.address) ? "" : (tip.address || ""))
                  }));
                resolve(places);
            } else {
                resolve([]);
            }
        });
      });
  } catch (error) {
      console.error("AMap Search Error:", error);
      // Return empty array instead of throwing to prevent UI crash
      return [];
  }
};

export const checkIsHoliday = async (dateStr: string): Promise<boolean> => {
     // Simple client-side weekend check (Saturday, Sunday)
     const date = new Date(dateStr);
     const day = date.getDay();
     return day === 0 || day === 6; // Sunday or Saturday
};