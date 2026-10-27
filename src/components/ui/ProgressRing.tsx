import { AlertTriangle, type LucideIcon } from 'lucide-react';
import { formatNumber } from '../../utils/units';

type RingTone = 'emerald' | 'sky';

const TONE_CLASSES: Record<RingTone, { stroke: string; text: string }> = {
  emerald: { stroke: 'stroke-emerald-500', text: 'text-emerald-600' },
  sky: { stroke: 'stroke-sky-500', text: 'text-sky-600' },
};

interface ProgressRingProps {
  label: string;
  consumed: number;
  target: number;
  unit: string;
  icon: LucideIcon;
  tone: RingTone;
  decimals?: number;
  size?: number;
}

export function ProgressRing({
  label,
  consumed,
  target,
  unit,
  icon: Icon,
  tone,
  decimals = 0,
  size = 136,
}: ProgressRingProps) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = target > 0 ? consumed / target : 0;
  const progress = Math.min(Math.max(ratio, 0), 1);
  const isOver = target > 0 && consumed > target;
  const difference = Math.abs(target - consumed);
  const toneClasses = TONE_CLASSES[tone];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-slate-100"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            className={`${isOver ? 'stroke-amber-500' : toneClasses.stroke} transition-[stroke-dashoffset] duration-500 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <Icon className={`mb-1 h-4 w-4 ${isOver ? 'text-amber-500' : toneClasses.text}`} />
          <span className="text-2xl font-bold leading-none tabular-nums text-slate-900">
            {formatNumber(consumed, decimals)}
          </span>
          <span className="mt-1 text-xs tabular-nums text-slate-500">
            / {formatNumber(target, decimals)} {unit}
          </span>
        </div>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-800">{label}</p>
      <p
        className={`flex items-center gap-1 text-xs font-medium tabular-nums ${
          isOver ? 'text-amber-600' : 'text-slate-500'
        }`}
        aria-live="polite"
      >
        {isOver && <AlertTriangle className="h-3.5 w-3.5" />}
        {formatNumber(difference, decimals)} {unit} {isOver ? 'over' : 'remaining'}
      </p>
    </div>
  );
}
