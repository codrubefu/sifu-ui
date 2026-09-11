import { X } from 'lucide-react';

type ToastProps = {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
};

export function Toast({ type, message, onClose }: ToastProps) {
  return (
    <div className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
      <button onClick={onClose} className="mr-3"><X className="inline h-4 w-4" /></button>
      {message}
    </div>
  );
}
