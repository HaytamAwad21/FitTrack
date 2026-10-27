import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity,
  AlertCircle,
  Flame,
  Ruler,
  SlidersHorizontal,
  Target,
  TrendingDown,
  TrendingUp,
  User,
  type LucideIcon,
} from 'lucide-react';
import { ACTIVITY_LEVEL_OPTIONS } from '../../data/activityLevels';
import type { NutritionSettingsInput } from '../../store/types';
import type { ActivityLevel, Gender, Goal, NutritionSettings, UnitSystem } from '../../types';
import { ACTIVITY_MULTIPLIERS, calculateTargets } from '../../utils/macros';
import {
  formatNumber,
  heightFromDisplay,
  heightToDisplay,
  heightUnitLabel,
  roundTo,
  weightFromDisplay,
  weightToDisplay,
  weightUnitLabel,
} from '../../utils/units';
import {
  parseNumber,
  validateCustomTarget,
  validateProfile,
  type ProfileField,
} from '../../utils/validation';
import { SegmentedControl } from '../ui/SegmentedControl';
import { TextField } from '../ui/TextField';
import { primaryButtonClass, secondaryButtonClass } from '../ui/styles';
import { Section } from './Section';

interface NutritionSettingsFormProps {
  initial?: NutritionSettings | null;
  submitLabel: string;
  onSubmit: (input: NutritionSettingsInput) => void;
  onCancel?: () => void;
  /** Extra sections shown after Goal (onboarding adds the training schedule here). */
  extraSections?: ReactNode;
  /** Note under the live preview about what saving changes. */
  saveNote?: string;
}

/** Exact metric values carried across unit toggles so repeated switching does not drift. */
interface CanonicalValues {
  weightKg: number | null;
  heightCm: number | null;
}

const GOAL_OPTIONS: { value: Goal; label: string; description: string; icon: LucideIcon }[] = [
  { value: 'cutting', label: 'Cutting', description: 'Lose fat, keep muscle', icon: TrendingDown },
  { value: 'bulking', label: 'Bulking', description: 'Build muscle and strength', icon: TrendingUp },
];

/** Unit system, body stats, activity level and goal. Saving recalculates nutrition targets only. */
export function NutritionSettingsForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  extraSections,
  saveNote = 'Saving recalculates your nutrition targets. Your training plan is not changed.',
}: NutritionSettingsFormProps) {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(initial?.unitSystem ?? 'metric');
  const [weight, setWeight] = useState(() =>
    initial ? formatNumber(weightToDisplay(initial.weightKg, initial.unitSystem), 1) : '',
  );
  const [height, setHeight] = useState(() =>
    initial ? formatNumber(heightToDisplay(initial.heightCm, initial.unitSystem), 1) : '',
  );
  const [canonical, setCanonical] = useState<CanonicalValues>({
    weightKg: initial?.weightKg ?? null,
    heightCm: initial?.heightCm ?? null,
  });
  const [age, setAge] = useState(initial ? String(initial.age) : '');
  const [gender, setGender] = useState<Gender>(initial?.gender ?? 'male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    initial?.activityLevel ?? 'moderately_active',
  );
  const [goal, setGoal] = useState<Goal>(initial?.goal ?? 'cutting');
  const [useCustomTargets, setUseCustomTargets] = useState(Boolean(initial?.customTargets));
  const [customCalories, setCustomCalories] = useState(
    initial?.customTargets ? String(initial.customTargets.calories) : '',
  );
  const [customProtein, setCustomProtein] = useState(
    initial?.customTargets ? String(initial.customTargets.proteinG) : '',
  );
  const [touched, setTouched] = useState<Partial<Record<ProfileField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const errors = validateProfile({ unitSystem, weight, height, age });
  const customErrors = useCustomTargets
    ? {
        calories: validateCustomTarget(customCalories, 'calories'),
        protein: validateCustomTarget(customProtein, 'protein'),
      }
    : {};
  const hasErrors =
    Object.keys(errors).length > 0 || Boolean(customErrors.calories) || Boolean(customErrors.protein);
  const visibleError = (field: ProfileField) => (submitted || touched[field] ? errors[field] : undefined);
  const markTouched = (field: ProfileField) => setTouched((prev) => ({ ...prev, [field]: true }));

  const resolveWeightKg = (): number | null => {
    if (canonical.weightKg !== null) return canonical.weightKg;
    const value = parseNumber(weight);
    return value === null ? null : weightFromDisplay(value, unitSystem);
  };

  const resolveHeightCm = (): number | null => {
    if (canonical.heightCm !== null) return canonical.heightCm;
    const value = parseNumber(height);
    return value === null ? null : heightFromDisplay(value, unitSystem);
  };

  const handleUnitChange = (next: UnitSystem) => {
    if (next === unitSystem) return;
    const weightKg = resolveWeightKg();
    const heightCm = resolveHeightCm();
    setCanonical({ weightKg, heightCm });
    if (weightKg !== null) setWeight(formatNumber(weightToDisplay(weightKg, next), 1));
    if (heightCm !== null) setHeight(formatNumber(heightToDisplay(heightCm, next), 1));
    setUnitSystem(next);
  };

  const computePreview = () => {
    if (errors.weight || errors.height || errors.age) return null;
    const weightKg = resolveWeightKg();
    const heightCm = resolveHeightCm();
    const ageValue = parseNumber(age);
    if (weightKg === null || heightCm === null || ageValue === null) return null;
    return calculateTargets({ weightKg, heightCm, age: ageValue, gender, activityLevel, goal });
  };
  const preview = computePreview();

  /** Turning custom targets on starts from the calculated values so the user only adjusts them. */
  const handleCustomToggle = (enabled: boolean) => {
    setUseCustomTargets(enabled);
    if (enabled && customCalories === '' && preview) setCustomCalories(String(preview.calories));
    if (enabled && customProtein === '' && preview) setCustomProtein(String(preview.proteinG));
  };

  const customCaloriesValue = parseNumber(customCalories);
  const customProteinValue = parseNumber(customProtein);
  const customTargets =
    useCustomTargets && !customErrors.calories && !customErrors.protein && customCaloriesValue !== null && customProteinValue !== null
      ? { calories: customCaloriesValue, proteinG: customProteinValue }
      : undefined;
  const dailyTarget = customTargets ?? preview;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    const weightKg = resolveWeightKg();
    const heightCm = resolveHeightCm();
    const ageValue = parseNumber(age);
    if (hasErrors || weightKg === null || heightCm === null || ageValue === null) return;
    onSubmit({
      unitSystem,
      weightKg: roundTo(weightKg, 3),
      heightCm: roundTo(heightCm, 2),
      age: ageValue,
      gender,
      activityLevel,
      goal,
      customTargets,
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Section icon={Ruler} title="Unit system">
        <SegmentedControl
          ariaLabel="Unit system"
          value={unitSystem}
          onChange={handleUnitChange}
          options={[
            { value: 'metric', label: 'Metric (kg/cm)' },
            { value: 'imperial', label: 'Imperial (lbs/in)' },
          ]}
        />
        <p className="text-xs text-slate-500">Also used for weights in Training.</p>
      </Section>

      <Section icon={User} title="Body stats">
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Weight"
            inputMode="decimal"
            value={weight}
            suffix={weightUnitLabel(unitSystem)}
            placeholder={unitSystem === 'metric' ? '75' : '165'}
            error={visibleError('weight')}
            onChange={(event) => {
              setCanonical((prev) => ({ ...prev, weightKg: null }));
              setWeight(event.target.value);
            }}
            onBlur={() => markTouched('weight')}
          />
          <TextField
            label="Height"
            inputMode="decimal"
            value={height}
            suffix={heightUnitLabel(unitSystem)}
            placeholder={unitSystem === 'metric' ? '178' : '70'}
            error={visibleError('height')}
            onChange={(event) => {
              setCanonical((prev) => ({ ...prev, heightCm: null }));
              setHeight(event.target.value);
            }}
            onBlur={() => markTouched('height')}
          />
        </div>
        <TextField
          label="Age"
          inputMode="numeric"
          value={age}
          suffix="years"
          placeholder="30"
          error={visibleError('age')}
          onChange={(event) => setAge(event.target.value)}
          onBlur={() => markTouched('age')}
        />
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Gender</span>
          <SegmentedControl
            ariaLabel="Gender"
            value={gender}
            onChange={setGender}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
            ]}
          />
        </div>
      </Section>

      <Section icon={Activity} title="Activity level">
        <div className="space-y-2" role="radiogroup" aria-label="Activity level">
          {ACTIVITY_LEVEL_OPTIONS.map((option) => {
            const active = option.value === activityLevel;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setActivityLevel(option.value)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                  active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span>
                  <span className="block text-sm font-medium text-slate-900">{option.label}</span>
                  <span className="block text-xs text-slate-500">{option.description}</span>
                </span>
                <span className="text-xs font-semibold tabular-nums text-slate-500">
                  x{ACTIVITY_MULTIPLIERS[option.value]}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section icon={Target} title="Goal">
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Goal">
          {GOAL_OPTIONS.map(({ value, label, description, icon: Icon }) => {
            const active = value === goal;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setGoal(value)}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
                  active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="text-sm font-semibold text-slate-900">{label}</span>
                <span className="text-xs text-slate-500">{description}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {extraSections}

      <Section icon={SlidersHorizontal} title="Daily targets">
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-600"
            checked={useCustomTargets}
            onChange={(event) => handleCustomToggle(event.target.checked)}
          />
          <span>
            Set my own calories and protein
            <span className="block text-xs text-slate-500">
              {useCustomTargets
                ? 'Your numbers replace the calculated targets and stay fixed when your stats change.'
                : 'Off: targets are calculated from your stats, activity and goal.'}
            </span>
          </span>
        </label>
        {useCustomTargets && (
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Calories"
              inputMode="numeric"
              suffix="kcal"
              value={customCalories}
              onChange={(event) => setCustomCalories(event.target.value)}
              error={customErrors.calories}
            />
            <TextField
              label="Protein"
              inputMode="numeric"
              suffix="g"
              value={customProtein}
              onChange={(event) => setCustomProtein(event.target.value)}
              error={customErrors.protein}
            />
          </div>
        )}
      </Section>

      <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200" aria-live="polite">
        <Flame className="h-6 w-6 shrink-0 text-emerald-600" />
        <div className="text-sm">
          <p className="font-semibold text-emerald-900">
            {dailyTarget
              ? `Daily target: ${dailyTarget.calories} kcal / ${dailyTarget.proteinG} g protein${customTargets ? ' (custom)' : ''}`
              : 'Daily target: enter your stats to see it'}
          </p>
          {customTargets && preview && (
            <p className="text-xs text-emerald-800">
              Calculated: {preview.calories} kcal / {preview.proteinG} g protein.
            </p>
          )}
          <p className="text-xs text-emerald-800">{saveNote}</p>
        </div>
      </div>

      {submitted && hasErrors && (
        <p className="flex items-center gap-1.5 text-sm text-red-600" role="alert">
          <AlertCircle className="h-4 w-4" />
          Fix the highlighted fields to continue.
        </p>
      )}

      <div className="flex gap-3 pb-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className={`${secondaryButtonClass} flex-1`}>
            Cancel
          </button>
        )}
        <button type="submit" className={`${primaryButtonClass} flex-1`}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
