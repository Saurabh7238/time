import { useStore } from '@/store';
import { CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

export function Toasts() {
  const { toasts } = useStore();
  const icons = {
    success: CheckCircle,
    warning: AlertTriangle,
    error: XCircle,
    info: Info,
  };
  const colors = {
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    error: 'text-rose-500',
    info: 'text-blue-500',
  };
  return (
    <div className="fixed bottom-4 right-4 z-[80] flex flex-col gap-2">
      {toasts.map(toast => {
        const Icon = icons[toast.type];
        return (
          <div key={toast.id} className="card animate-slide-in flex items-center gap-3 px-4 py-3 shadow-lg">
            <Icon size={18} className={colors[toast.type]} />
            <span className="text-sm text-slate-700 dark:text-slate-200">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
