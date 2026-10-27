import { Check } from 'lucide-react';
import { useAppStore } from '../../../store';
import type { SplitPresetId, TrainingSettings } from '../../../types';
import { describeSchedule, presetPreview, presetsFor } from '../../../utils/routine';

interface PresetPickerProps {
  settings: TrainingSettings;
}

/**
 * Presets valid for the selected number of days, each with a preview of the week.
 * Applying one only changes weekday assignments, never workout contents.
 */
export function PresetPicker({ settings }: PresetPickerProps) {
  const exercises = useAppStore((state) => state.exercises);
  const applyPreset = useAppStore((state) => state.applyPreset);
  const days = settings.trainingWeekdays.length;
  const current = settings.routine.presetId;

  const options: { id: SplitPresetId | 'custom'; label: string; detail: string; preview: string }[] = [
    ...presetsFor(days).map((preset) => ({
      id: preset.id,
      label: preset.label,
      detail: preset.daysLabel,
      preview: presetPreview(settings, preset.id, exercises),
    })),
    { id: 'custom', label: 'Custom', detail: 'Any number of days', preview: describeSchedule(settings) },
  ];

  return (
    <div className="space-y-2" role="radiogroup" aria-label="Split preset">
      {options.map((option) => {
        const active = option.id === current;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => applyPreset(option.id)}
            className={`flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
              active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-900">{option.label}</span>
              <span className="block text-xs text-slate-500">{option.detail}</span>
              <span className="mt-1 block text-xs text-slate-700">{option.preview}</span>
            </span>
            {active && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
          </button>
        );
      })}
      <p className="text-xs text-slate-500">
        Presets only change which workout falls on which day. Your workouts are never reset.
      </p>
    </div>
  );
}
