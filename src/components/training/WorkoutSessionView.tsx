import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store';
import { formatLongDate } from '../../utils/date';
import { countSessionSets, findPreviousExerciseSets } from '../../utils/workout';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { badgeClass, dangerButtonClass, iconButtonClass, primaryButtonClass, secondaryButtonClass } from '../ui/styles';
import { ExerciseCard } from './ExerciseCard';

interface WorkoutSessionViewProps {
  sessionId: string;
  onClose: () => void;
}

export function WorkoutSessionView({ sessionId, onClose }: WorkoutSessionViewProps) {
  const session = useAppStore((state) => state.sessions.find((s) => s.id === sessionId) ?? null);
  const sessions = useAppStore((state) => state.sessions);
  const exercises = useAppStore((state) => state.exercises);
  // The unit system is global and lives in the nutrition settings.
  const unit = useAppStore((state) => state.nutritionSettings?.unitSystem ?? 'metric');
  const addSet = useAppStore((state) => state.addSet);
  const updateSet = useAppStore((state) => state.updateSet);
  const deleteSet = useAppStore((state) => state.deleteSet);
  const finishSession = useAppStore((state) => state.finishSession);
  const deleteSession = useAppStore((state) => state.deleteSession);
  const [confirming, setConfirming] = useState<'finish' | 'delete' | null>(null);

  const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  if (!session) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-sm text-slate-500">This session no longer exists.</p>
        <button type="button" className={secondaryButtonClass} onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
          Back to schedule
        </button>
      </div>
    );
  }

  const totalSets = countSessionSets(session);

  const finish = () => {
    finishSession(session.id);
    onClose();
  };

  const handleFinish = () => {
    if (totalSets === 0) {
      setConfirming('finish');
      return;
    }
    finish();
  };

  const handleDelete = () => setConfirming('delete');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button type="button" className={iconButtonClass} onClick={onClose} aria-label="Back to schedule">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold text-slate-900">{session.workoutName}</h2>
          <p className="text-xs text-slate-500">{formatLongDate(session.date)}</p>
        </div>
        <span
          className={`${badgeClass} ${
            session.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {session.completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
          {session.completed ? 'Completed' : 'In progress'}
        </span>
      </div>

      {session.exercises.map((entry) => (
        <ExerciseCard
          key={entry.exerciseId}
          exercise={exercisesById.get(entry.exerciseId)}
          sets={entry.sets}
          target={
            entry.targetSets !== undefined && entry.repMin !== undefined && entry.repMax !== undefined
              ? { sets: entry.targetSets, repMin: entry.repMin, repMax: entry.repMax }
              : undefined
          }
          previous={findPreviousExerciseSets(sessions, entry.exerciseId, session.date, session.id)}
          unit={unit}
          onAddSet={(set) => addSet(session.id, entry.exerciseId, set)}
          onUpdateSet={(setId, patch) => updateSet(session.id, entry.exerciseId, setId, patch)}
          onDeleteSet={(setId) => deleteSet(session.id, entry.exerciseId, setId)}
        />
      ))}

      <div className="space-y-2 pt-2">
        {session.completed ? (
          <button type="button" className={`${primaryButtonClass} w-full`} onClick={onClose}>
            <CheckCircle2 className="h-4 w-4" />
            Done
          </button>
        ) : (
          <button type="button" className={`${primaryButtonClass} w-full`} onClick={handleFinish}>
            <CheckCircle2 className="h-4 w-4" />
            Finish workout
          </button>
        )}
        <p className="text-center text-xs text-slate-500">
          {totalSets} {totalSets === 1 ? 'set' : 'sets'} logged. Changes save automatically.
        </p>
        <button type="button" className={`${dangerButtonClass} w-full`} onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
          Delete session
        </button>
      </div>

      {confirming === 'finish' && (
        <ConfirmDialog
          title="Finish workout"
          message="No sets logged yet. Finish this workout anyway?"
          confirmLabel="Finish"
          tone="primary"
          onCancel={() => setConfirming(null)}
          onConfirm={() => {
            setConfirming(null);
            finish();
          }}
        />
      )}
      {confirming === 'delete' && (
        <ConfirmDialog
          title="Delete session"
          message="Delete this workout session and all its sets?"
          confirmLabel="Delete"
          onCancel={() => setConfirming(null)}
          onConfirm={() => {
            setConfirming(null);
            deleteSession(session.id);
            onClose();
          }}
        />
      )}
    </div>
  );
}
