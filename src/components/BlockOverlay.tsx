import { Shield, Clock, X } from 'lucide-react';
import { useStore } from '@/store';

export function BlockOverlay() {
  const { block, T, dismissBlock } = useStore();
  if (!block.active) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-rose-600/95 backdrop-blur-md">
      <div className="mx-4 w-full max-w-md animate-fade-in text-center text-white">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/15">
          <Shield size={40} className="text-white" />
        </div>
        <h2 className="mb-2 text-2xl font-bold">{T('blockTitle')}</h2>
        <p className="mb-6 text-rose-100">{T('blockMsg')}</p>
        <blockquote className="mx-auto mb-8 max-w-sm rounded-xl bg-white/10 p-4 text-lg font-medium italic text-white">
          "{block.quote}"
        </blockquote>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={() => dismissBlock('five')}
            className="btn bg-white/20 text-white hover:bg-white/30">
            <Clock size={18} /> {T('fiveMore')}
          </button>
          <button onClick={() => dismissBlock('hour')}
            className="btn bg-white text-rose-600 hover:bg-rose-50">
            <Shield size={18} /> {T('blockHour')}
          </button>
        </div>
      </div>
    </div>
  );
}
