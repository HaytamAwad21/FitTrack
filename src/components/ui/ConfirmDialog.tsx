import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { dangerButtonClass, primaryButtonClass, secondaryButtonClass } from './styles';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  /** "danger" styles the confirm button for destructive actions. */
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app replacement for window.confirm, which some embedded browsers
 * block silently (it then returns false and the action never runs).
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <div className="flex gap-3">
          <button type="button" className={`${secondaryButtonClass} flex-1`} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`${tone === 'danger' ? dangerButtonClass : primaryButtonClass} flex-1`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p className="flex items-start gap-2 text-sm text-slate-700">
        <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${tone === 'danger' ? 'text-red-500' : 'text-amber-500'}`} />
        {message}
      </p>
    </Modal>
  );
}
