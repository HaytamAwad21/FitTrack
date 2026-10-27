import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { iconButtonClass } from './styles';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Bottom sheet on mobile, centered dialog on larger screens. Render conditionally to open. */
export function Modal({ title, onClose, children, footer }: ModalProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className={iconButtonClass} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="border-t border-slate-100 px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}
