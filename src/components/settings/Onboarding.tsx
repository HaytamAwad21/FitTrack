import { useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import { useAppStore } from '../../store';
import type { NutritionSettings, Weekday } from '../../types';
import { createInitialTrainingSettings, describeSchedule } from '../../utils/routine';
import { getDefaultWeekdays, toggleWeekday } from '../../utils/schedule';
import { NutritionSettingsForm } from './NutritionSettingsForm';
import { Section } from './Section';
import { TrainingScheduleFields } from './TrainingScheduleFields';

interface OnboardingProps {
  /** Prefills the form when nutrition settings already exist (for example after a partial setup). */
  initial?: NutritionSettings | null;
}

/** Single setup flow that saves into the nutrition settings and training settings separately. */
export function Onboarding({ initial }: OnboardingProps) {
  const exercises = useAppStore((state) => state.exercises);
  const saveNutritionSettings = useAppStore((state) => state.saveNutritionSettings);
  const initializeTraining = useAppStore((state) => state.initializeTraining);
  const [weekdays, setWeekdays] = useState<Weekday[]>(() => getDefaultWeekdays(3));

  const planPreview = useMemo(
    () => describeSchedule(createInitialTrainingSettings(weekdays, exercises)),
    [weekdays, exercises],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 p-5 text-white shadow-sm">
        <h2 className="text-xl font-bold">Set up your plan</h2>
        <p className="mt-1 text-sm text-emerald-50">
          Enter your stats and schedule. Your daily calorie and protein targets and a weekly
          training plan are built from them. You can change both later in Settings.
        </p>
      </div>
      <NutritionSettingsForm
        initial={initial}
        submitLabel="Create my plan"
        saveNote="You can edit your nutrition and training settings separately later."
        onSubmit={(input) => {
          saveNutritionSettings(input);
          initializeTraining(weekdays);
        }}
        extraSections={
          <Section icon={Calendar} title="Training schedule">
            <TrainingScheduleFields
              weekdays={weekdays}
              onDaysPerWeek={(count) => setWeekdays(getDefaultWeekdays(count))}
              onToggleWeekday={(day) => setWeekdays((prev) => toggleWeekday(prev, day))}
            />
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">Plan: {planPreview}</p>
          </Section>
        }
      />
    </div>
  );
}
