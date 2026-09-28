import { Moon, Sun, Globe, Volume2, Vibrate, Bell, Eye, Plus, Trash2, Shield } from 'lucide-react';
import { useStore } from '@/store';

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`relative h-6 w-11 rounded-full transition ${on ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

export function SettingsView() {
  const { settings, T, toggleTheme, toggleLang, toggleFocus, updateSettings } = useStore();
  const toggleNotifications = () => {
    const permissionGranted = typeof Notification !== 'undefined' && Notification.permission === 'granted';
    updateSettings({ notificationsEnabled: !settings.notificationsEnabled || !permissionGranted });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Appearance */}
      <div className="card p-5">
        <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">{T('settings')}</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.theme === 'dark' ? <Moon size={18} className="text-slate-500" /> : <Sun size={18} className="text-amber-500" />}
              <span className="text-sm text-slate-700 dark:text-slate-300">{T('theme')}</span>
            </div>
            <div className="flex gap-1.5">
              {(['light', 'dark'] as const).map(mode => (
                <button key={mode} onClick={() => updateSettings({ theme: mode })}
                  className={`chip transition ${settings.theme === mode ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>
                  {T(mode)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-blue-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">{T('language')}</span>
            </div>
            <div className="flex gap-1.5">
              {(['en', 'hi'] as const).map(l => (
                <button key={l} onClick={() => updateSettings({ lang: l })}
                  className={`chip transition ${settings.lang === l ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>
                  {l === 'en' ? T('english') : T('hindi')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alarm preferences */}
      <div className="card p-5">
        <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">{T('sound')}</h3>
        <div className="space-y-4">
          <Row icon={Volume2} label={T('sound')} on={settings.soundEnabled} onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })} />
          <Row icon={Eye} label={T('voice')} on={settings.voiceEnabled} onClick={() => updateSettings({ voiceEnabled: !settings.voiceEnabled })} />
          <Row icon={Vibrate} label={T('vibration')} on={settings.vibrationEnabled} onClick={() => updateSettings({ vibrationEnabled: !settings.vibrationEnabled })} />
          <Row icon={Bell} label={T('notifications')} on={settings.notificationsEnabled} onClick={toggleNotifications} />
        </div>
      </div>

      {/* Focus mode */}
      <div className="card p-5">
        <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">{T('focusMode')}</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={18} className={settings.focusMode ? 'text-emerald-500' : 'text-slate-400'} />
            <div>
              <span className="text-sm text-slate-700 dark:text-slate-300">{settings.focusMode ? T('focusModeOn') : T('focusModeOff')}</span>
              <p className="text-xs text-slate-400">{settings.focusMode ? '🟢' : '⚪'}</p>
            </div>
          </div>
          <Toggle on={settings.focusMode} onClick={toggleFocus} />
        </div>
      </div>

      {/* Data info */}
      <div className="card p-5">
        <p className="text-center text-xs text-slate-400">{T('savedData')}</p>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, on, onClick }: { icon: any; label: string; on: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Icon size={18} className="text-slate-500" />
        <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
      </div>
      <Toggle on={on} onClick={onClick} />
    </div>
  );
}
