import { useEffect } from 'react';
import { useToastStore } from '../../store/toastStore';

const TOAST_MS = 5000;

/** Shows the current toast above the tab bar for 5 seconds. */
export function ToastHost() {
  const toast = useToastStore((state) => state.toast);
  const dismissToast = useToastStore((state) => state.dismissToast);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(dismissToast, TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast, dismissToast]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4">
      <div
        className="pointer-events-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"
        role="status"
      >
        <span className="min-w-0 truncate">{toast.message}</span>
        {toast.actionLabel && (
          <button
            type="button"
            className="shrink-0 font-semibold text-emerald-300 hover:underline"
            onClick={() => {
              toast.onAction?.();
              dismissToast();
            }}
          >
            {toast.actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
