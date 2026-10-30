import { Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { primaryButtonClass } from '../ui/styles';
import { EnterFoodForm } from './EnterFoodForm';

const FORM_ID = 'enter-food-form';

interface LogFoodModalProps {
  date: string;
  onClose: () => void;
}

export function LogFoodModal({ date, onClose }: LogFoodModalProps) {
  return (
    <Modal
      title="Enter food"
      onClose={onClose}
      footer={
        <button type="submit" form={FORM_ID} className={`${primaryButtonClass} w-full`}>
          <Check className="h-4 w-4" />
          Add to log
        </button>
      }
    >
      <EnterFoodForm formId={FORM_ID} date={date} onLogged={onClose} />
    </Modal>
  );
}
