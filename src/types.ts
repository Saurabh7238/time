export type Priority = 'low' | 'medium' | 'high';
export type Repeat = 'none' | 'daily' | 'weekly';

export interface Task {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  priority: Priority;
  repeat: Repeat;
  done: boolean;
  snoozedUntil?: number; // epoch ms
  createdAt: number;
}

export interface ScreenDay {
  date: string; // YYYY-MM-DD
  productive: number; // ms
  wasted: number; // ms
  perSite: Record<string, number>; // ms per domain
}

export interface Settings {
  theme: 'light' | 'dark';
  lang: 'en' | 'hi';
  distractingSites: string[];
  dailyLimitMin: number;
  focusMode: boolean;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  vibrationEnabled: boolean;
  notificationsEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  lang: 'en',
  distractingSites: ['youtube.com', 'instagram.com', 'facebook.com', 'twitter.com', 'reddit.com'],
  dailyLimitMin: 60,
  focusMode: false,
  soundEnabled: true,
  voiceEnabled: true,
  vibrationEnabled: true,
  notificationsEnabled: true,
};
