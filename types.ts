export interface PricingTier {
  maxDistance: number; // in km
  price: number;
}

export interface AppSettings {
  baseAddress: string;
  pricingTiers: PricingTier[];
  holidaySurcharge: number;
  extraCatSurcharge: number;
}

export interface Appointment {
  id: string;
  clientName: string;
  address: string;
  date: string; // ISO date string
  time: string;
  catCount: number;
  distanceKm: number;
  durationMin: number;
  totalPrice: number;
  lockCode: string;
  notes: string;
  isHoliday: boolean;
  status: 'pending' | 'completed';
}

export interface DistanceResult {
  distanceKm: number;
  durationMin: number;
}

export enum ViewState {
  CALCULATOR = 'CALCULATOR',
  SCHEDULE = 'SCHEDULE',
  SETTINGS = 'SETTINGS',
}