import { useState } from 'react';
import { Calendar, Dumbbell, LayoutGrid, Plus } from 'lucide-react';
import { useAppStore } from '../../store';
import { Modal } from '../ui/Modal';
import { secondaryButtonClass } from '../ui/styles';
import { Section } from './Section';
import { TrainingScheduleFields } from './TrainingScheduleFields';
import { NewWorkoutForm } from './training/NewWorkoutForm';
import { PresetPicker } from './training/PresetPicker';
import { WeekdayAssignments } from './training/WeekdayAssignments';
import { WorkoutEditor } from './training/WorkoutEditor';
import { WorkoutList } from './training/WorkoutList';

type View = { kind: 'main' } | { kind: 'new' } | { kind: 'edit'; workoutId: string };

interface TrainingSettingsScreenProps {
  onClose: () => void;
}

/**
 * Training schedule, split preset and workouts. Changes save immediately; none of
 * them touch nutrition settings or targets.
 */
export function TrainingSettingsScreen({ onClose }: TrainingSettingsScreenProps) {
  const settings = useAppStore((state) => state.trainingSettings);
  const setDaysPerWeek = useAppStore((state) => state.setDaysPerWeek);
  const toggleTrainingWeekday = useAppStore((state) => state.toggleTrainingWeekday);
  const [view, setView] = useState<View>({ kind: 'main' });

  if (!settings) return null;

  return (
    <Modal title="Training settings" onClose={onClose}>
      {view.kind === 'new' && (
        <NewWorkoutForm
          settings={settings}
          onCancel={() => setView({ kind: 'main' })}
          onCreated={(workoutId) => setView({ kind: 'edit', workoutId })}
        />
      )}
      {view.kind === 'edit' && <WorkoutEditor workoutId={view.workoutId} onBack={() => setView({ kind: 'main' })} />}
      {view.kind === 'main' && (
        <div className="space-y-4">
          <Section icon={Calendar} title="Training schedule">
            <TrainingScheduleFields
              weekdays={settings.trainingWeekdays}
              onDaysPerWeek={setDaysPerWeek}
              onToggleWeekday={toggleTrainingWeekday}
            />
            <WeekdayAssignments settings={settings} />
          </Section>

          <Section icon={LayoutGrid} title="Split preset">
            <PresetPicker settings={settings} />
          </Section>

          <Section
            icon={Dumbbell}
            title="Workouts"
            action={
              <button type="button" className={`${secondaryButtonClass} px-3 py-1.5 text-xs`} onClick={() => setView({ kind: 'new' })}>
                <Plus className="h-3.5 w-3.5" />
                New workout
              </button>
            }
          >
            <WorkoutList settings={settings} onEdit={(workoutId) => setView({ kind: 'edit', workoutId })} />
          </Section>
        </div>
      )}
    </Modal>
  );
}
