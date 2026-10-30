import { Modal } from '../ui/Modal';
import { primaryButtonClass, secondaryButtonClass } from '../ui/styles';

export type EntryUpdateScope = 'today' | 'all' | 'none';

interface UpdateEntriesDialogProps {
  todayCount: number;
  allCount: number;
  onChoose: (scope: EntryUpdateScope) => void;
  /** Goes back to the food without saving. */
  onCancel: () => void;
}

function entryCount(count: number): string {
  return `${count} ${count === 1 ? 'entry' : 'entries'}`;
}

/** Asks how far a library edit reaches into the log. Today only is the default choice. */
export function UpdateEntriesDialog({ todayCount, allCount, onChoose, onCancel }: UpdateEntriesDialogProps) {
  const hasToday = todayCount > 0;

  return (
    <Modal title="Logged entries" onClose={onCancel}>
      <div className="space-y-3">
        <p className="text-sm text-slate-700">Update logged entries with the new values?</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className={`${primaryButtonClass} w-full`}
            disabled={!hasToday}
            autoFocus={hasToday}
            onClick={() => onChoose('today')}
          >
            Today only ({entryCount(todayCount)})
          </button>
          <button
            type="button"
            className={`${hasToday ? secondaryButtonClass : primaryButtonClass} w-full`}
            autoFocus={!hasToday}
            onClick={() => onChoose('all')}
          >
            All entries ({entryCount(allCount)})
          </button>
          <button type="button" className={`${secondaryButtonClass} w-full`} onClick={() => onChoose('none')}>
            Don&apos;t update
          </button>
        </div>
      </div>
    </Modal>
  );
}
