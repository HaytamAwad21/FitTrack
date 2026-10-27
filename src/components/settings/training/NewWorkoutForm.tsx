import { useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowLeft, Plus } from 'lucide-react';
import { useAppStore } from '../../../store';
import type { MuscleGroup, TrainingSettings } from '../../../types';
import { findWorkoutNameConflict } from '../../../utils/routine';
import { TextField } from '../../ui/TextField';
import { iconButtonClass, primaryButtonClass } from '../../ui/styles';
import { MuscleGroupPicker } from './MuscleGroupPicker';

interface NewWorkoutFormProps {
  settings: TrainingSettings;
  onCancel: () => void;
  onCreated: (id: string) => void;
}

/** Name, target muscle groups, and optionally an existing workout to copy exercises from. */
export function NewWorkoutForm({ settings, onCancel, onCreated }: NewWorkoutFormProps) {
  const createWorkout = useAppStore((state) => state.createWorkout);
  const workouts = settings.routine.workoutTypes;
  const [name, setName] = useState('');
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [groupsEdited, setGroupsEdited] = useState(false);
  const [startFromId, setStartFromId] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const conflict = findWorkoutNameConflict(workouts, name);
  const nameError = name.trim() === '' ? 'Enter a name' : undefined;
  const groupsError = muscleGroups.length === 0 ? 'Choose at least one muscle group' : undefined;
  const valid = !nameError && !conflict && !groupsError;

  const handleStartFrom = (id: string) => {
    setStartFromId(id);
    // Until the user picks groups themselves, follow the copied workout's groups.
    const source = workouts.find((workout) => workout.id === id);
    if (source && !groupsEdited) setMuscleGroups(source.muscleGroups);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (!valid) return;
    const id = createWorkout({ name, muscleGroups, startFromId: startFromId || undefined });
    if (id) onCreated(id);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="flex items-center gap-2">
        <button type="button" className={iconButtonClass} onClick={onCancel} aria-label="Back to training settings">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h3 className="text-base font-semibold text-slate-900">New workout</h3>
      </div>
      <div className="space-y-2">
        <TextField
          label="Name"
          placeholder="Arms"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={submitted ? nameError : undefined}
          autoFocus
        />
        {conflict && (
          <p className="flex items-center gap-1 text-xs text-amber-700" role="alert">
            <AlertTriangle className="h-3.5 w-3.5" />A workout named &apos;{conflict.name}&apos; already exists.
          </p>
        )}
      </div>
      <div className="space-y-1">
        <span className="block text-sm font-medium text-slate-700">Target muscle groups</span>
        <MuscleGroupPicker
          value={muscleGroups}
          onChange={(groups) => {
            setMuscleGroups(groups);
            setGroupsEdited(true);
          }}
        />
        {submitted && groupsError && <p className="text-xs text-red-600">{groupsError}</p>}
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Start from</span>
        <select
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
          value={startFromId}
          onChange={(event) => handleStartFrom(event.target.value)}
        >
          <option value="">Empty workout</option>
          {workouts.map((workout) => (
            <option key={workout.id} value={workout.id}>
              Copy exercises from {workout.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className={`${primaryButtonClass} w-full`} disabled={submitted && !valid}>
        <Plus className="h-4 w-4" />
        Create workout
      </button>
    </form>
  );
}
