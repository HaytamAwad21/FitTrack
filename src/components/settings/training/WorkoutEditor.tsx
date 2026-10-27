import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Check, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useAppStore } from '../../../store';
import type { Exercise, MuscleGroup, WorkoutExercise } from '../../../types';
import {
  REPS_RANGE,
  SETS_RANGE,
  adjustExerciseTarget,
  defaultTargetFor,
  findWorkoutNameConflict,
  sortedExercises,
  withPositions,
} from '../../../utils/routine';
import { Combobox } from '../../ui/Combobox';
import { Stepper } from '../../ui/Stepper';
import { TextField } from '../../ui/TextField';
import { dangerButtonClass, iconButtonClass, secondaryButtonClass } from '../../ui/styles';
import { ExerciseTypeBadge } from '../../training/ExerciseTypeBadge';
import { MuscleGroupPicker } from './MuscleGroupPicker';

interface WorkoutEditorProps {
  workoutId: string;
  onBack: () => void;
}

interface RemovedExercise {
  exercise: WorkoutExercise;
  /** Position it had, so Undo puts it back in place. */
  index: number;
}

const UNDO_MS = 5000;
const SAVED_MS = 1500;

/** Edits one workout. Every change saves immediately and shows a short "Saved" indicator. */
export function WorkoutEditor({ workoutId, onBack }: WorkoutEditorProps) {
  const workout = useAppStore((state) =>
    state.trainingSettings?.routine.workoutTypes.find((item) => item.id === workoutId),
  );
  const workouts = useAppStore((state) => state.trainingSettings?.routine.workoutTypes ?? []);
  const library = useAppStore((state) => state.exercises);
  const updateWorkout = useAppStore((state) => state.updateWorkout);
  const resetWorkout = useAppStore((state) => state.resetWorkout);

  const [name, setName] = useState(workout?.name ?? '');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [removed, setRemoved] = useState<RemovedExercise | null>(null);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const undoTimer = useRef<number | null>(null);

  useEffect(() => {
    if (savedAt === null) return;
    const timer = window.setTimeout(() => setSavedAt(null), SAVED_MS);
    return () => window.clearTimeout(timer);
  }, [savedAt]);

  useEffect(() => () => {
    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
  }, []);

  const exercisesById = useMemo(() => new Map(library.map((exercise) => [exercise.id, exercise])), [library]);
  const plan = workout ? sortedExercises(workout) : [];
  const nameConflict = findWorkoutNameConflict(workouts, name, workoutId);
  const nameError = name.trim() === '' ? 'Enter a name' : undefined;

  const pickerItems = useMemo(() => {
    if (!workout) return [];
    const used = new Set(workout.exercises.map((exercise) => exercise.exerciseId));
    const needle = query.trim().toLowerCase();
    return library.filter(
      (exercise) =>
        !used.has(exercise.id) &&
        (showAll || workout.muscleGroups.includes(exercise.muscleGroup)) &&
        (needle === '' || exercise.name.toLowerCase().includes(needle) || exercise.muscleGroup.toLowerCase().includes(needle)),
    );
  }, [workout, library, query, showAll]);

  if (!workout) {
    return (
      <div className="space-y-3 py-6 text-center">
        <p className="text-sm text-slate-500">This workout no longer exists.</p>
        <button type="button" className={secondaryButtonClass} onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
    );
  }

  const markSaved = () => setSavedAt(Date.now());

  const saveExercises = (exercises: WorkoutExercise[]) => {
    updateWorkout(workout.id, { exercises: withPositions(exercises) });
    markSaved();
  };

  const handleNameChange = (text: string) => {
    setName(text);
    // Only valid, unique names are saved; the field shows why otherwise.
    if (text.trim() !== '' && !findWorkoutNameConflict(workouts, text, workout.id)) {
      updateWorkout(workout.id, { name: text });
      markSaved();
    }
  };

  const handleGroups = (muscleGroups: MuscleGroup[]) => {
    updateWorkout(workout.id, { muscleGroups });
    markSaved();
  };

  const changeTarget = (index: number, patch: Partial<Pick<WorkoutExercise, 'sets' | 'repMin' | 'repMax'>>) =>
    saveExercises(plan.map((exercise, position) => (position === index ? adjustExerciseTarget(exercise, patch) : exercise)));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= plan.length) return;
    const next = [...plan];
    [next[index], next[target]] = [next[target], next[index]];
    saveExercises(next);
  };

  const remove = (index: number) => {
    saveExercises(plan.filter((_, position) => position !== index));
    setRemoved({ exercise: plan[index], index });
    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setRemoved(null), UNDO_MS);
  };

  const undoRemove = () => {
    if (!removed) return;
    const next = [...plan];
    next.splice(Math.min(removed.index, next.length), 0, removed.exercise);
    saveExercises(next);
    setRemoved(null);
    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
  };

  const addExercise = (exercise: Exercise) => {
    saveExercises([...plan, { exerciseId: exercise.id, ...defaultTargetFor(exercise), order: plan.length }]);
    setQuery('');
  };

  const handleReset = () => {
    resetWorkout(workout.id);
    const fresh = useAppStore.getState().trainingSettings?.routine.workoutTypes.find((item) => item.id === workout.id);
    setName(fresh?.name ?? name);
    setConfirmReset(false);
    markSaved();
  };

  return (
    <div className="space-y-4 pb-16">
      <div className="flex items-center gap-2">
        <button type="button" className={iconButtonClass} onClick={onBack} aria-label="Back to training settings">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h3 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-900">Edit workout</h3>
        <span
          className={`flex items-center gap-1 text-xs font-medium text-emerald-700 transition-opacity ${savedAt ? 'opacity-100' : 'opacity-0'}`}
          aria-live="polite"
        >
          <Check className="h-3.5 w-3.5" />
          {savedAt ? 'Saved' : ''}
        </span>
      </div>

      <div className="space-y-2">
        <TextField label="Name" value={name} onChange={(event) => handleNameChange(event.target.value)} error={nameError} />
        {nameConflict && (
          <p className="flex items-center gap-1 text-xs text-amber-700" role="alert">
            <AlertTriangle className="h-3.5 w-3.5" />A workout named &apos;{nameConflict.name}&apos; already exists. The
            name is not saved.
          </p>
        )}
      </div>

      <div className="space-y-1">
        <span className="block text-sm font-medium text-slate-700">Muscle groups</span>
        <MuscleGroupPicker value={workout.muscleGroups} onChange={handleGroups} requireOne />
      </div>

      <div className="space-y-2">
        <span className="block text-sm font-medium text-slate-700">Exercises</span>
        {plan.length === 0 && <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">No exercises yet.</p>}
        <ol className="space-y-2">
          {plan.map((item, index) => (
            <ExerciseRow
              key={`${item.exerciseId}-${index}`}
              item={item}
              exercise={exercisesById.get(item.exerciseId)}
              isFirst={index === 0}
              isLast={index === plan.length - 1}
              onChange={(patch) => changeTarget(index, patch)}
              onMove={(direction) => move(index, direction)}
              onRemove={() => remove(index)}
            />
          ))}
        </ol>

        {adding ? (
          <div className="space-y-2 rounded-xl p-3 ring-1 ring-emerald-200">
            <Combobox
              items={pickerItems}
              getKey={(exercise) => exercise.id}
              inputValue={query}
              onInputChange={setQuery}
              onSelect={addExercise}
              label="Add exercise"
              placeholder="Search exercises"
              noMatchText={showAll ? 'No exercises match.' : 'No match in these muscle groups. Try Show all.'}
              autoFocus
              renderOption={(exercise) => (
                <span className="flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">{exercise.name}</span>
                    <span className="block text-xs text-slate-500">{exercise.muscleGroup}</span>
                  </span>
                  <ExerciseTypeBadge type={exercise.type} />
                </span>
              )}
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                  checked={showAll}
                  onChange={(event) => setShowAll(event.target.checked)}
                />
                Show all muscle groups
              </label>
              <button type="button" className="text-xs font-semibold text-slate-600 hover:underline" onClick={() => setAdding(false)}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className={`${secondaryButtonClass} w-full py-2`} onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            Add exercise
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Changes apply from your next session. Past and in-progress sessions keep the plan they started with.
      </p>

      {workout.isBuiltIn && (
        <div className="space-y-2">
          {confirmReset ? (
            <div className="space-y-2 rounded-xl bg-red-50 p-3 ring-1 ring-red-200">
              <p className="text-xs text-red-800">
                Reset &apos;{workout.name}&apos; to its default name, muscle groups and exercises?
              </p>
              <div className="flex gap-2">
                <button type="button" className={`${secondaryButtonClass} flex-1 py-1.5 text-xs`} onClick={() => setConfirmReset(false)}>
                  Cancel
                </button>
                <button type="button" className={`${dangerButtonClass} flex-1 py-1.5 text-xs`} onClick={handleReset}>
                  Reset
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className={`${secondaryButtonClass} w-full py-2`} onClick={() => setConfirmReset(true)}>
              <RotateCcw className="h-4 w-4" />
              Reset to default
            </button>
          )}
        </div>
      )}

      {removed && (
        <div
          className="sticky bottom-0 flex items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"
          role="status"
        >
          <span className="min-w-0 truncate">Removed {exercisesById.get(removed.exercise.exerciseId)?.name ?? 'exercise'}</span>
          <button type="button" className="shrink-0 font-semibold text-emerald-300 hover:underline" onClick={undoRemove}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

interface ExerciseRowProps {
  item: WorkoutExercise;
  exercise: Exercise | undefined;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<Pick<WorkoutExercise, 'sets' | 'repMin' | 'repMax'>>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

function ExerciseRow({ item, exercise, isFirst, isLast, onChange, onMove, onRemove }: ExerciseRowProps) {
  const name = exercise?.name ?? 'Unknown exercise';
  return (
    <li className="space-y-2 rounded-xl p-3 ring-1 ring-slate-200">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{name}</p>
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            {exercise?.muscleGroup}
            {exercise && <ExerciseTypeBadge type={exercise.type} />}
          </p>
        </div>
        <button type="button" className={`${iconButtonClass} h-8 w-8`} onClick={() => onMove(-1)} disabled={isFirst} aria-label={`Move ${name} up`}>
          <ArrowUp className="h-4 w-4" />
        </button>
        <button type="button" className={`${iconButtonClass} h-8 w-8`} onClick={() => onMove(1)} disabled={isLast} aria-label={`Move ${name} down`}>
          <ArrowDown className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`${iconButtonClass} h-8 w-8 hover:bg-red-50 hover:text-red-600`}
          onClick={onRemove}
          aria-label={`Remove ${name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="flex items-center gap-2 text-xs text-slate-600">
          Sets
          <Stepper value={item.sets} min={SETS_RANGE.min} max={SETS_RANGE.max} onChange={(sets) => onChange({ sets })} label={`${name} sets`} />
        </span>
        <span className="flex items-center gap-2 text-xs text-slate-600">
          Reps
          <Stepper
            value={item.repMin}
            min={REPS_RANGE.min}
            max={item.repMax}
            onChange={(repMin) => onChange({ repMin })}
            label={`${name} minimum reps`}
          />
          <span aria-hidden="true">-</span>
          <Stepper
            value={item.repMax}
            min={item.repMin}
            max={REPS_RANGE.max}
            onChange={(repMax) => onChange({ repMax })}
            label={`${name} maximum reps`}
          />
        </span>
      </div>
    </li>
  );
}
