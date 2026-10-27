import { Activity, Settings } from 'lucide-react';
import { iconButtonClass } from '../ui/styles';

interface HeaderProps {
  onOpenSettings?: () => void;
  /** Accessible name of the settings button, for example "Training settings". */
  settingsLabel?: string;
}

export function Header({ onOpenSettings, settingsLabel = 'Settings' }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Activity className="h-5 w-5" />
        </span>
        <h1 className="text-lg font-bold tracking-tight text-slate-900">FitTrack</h1>
      </div>
      {onOpenSettings && (
        <button
          type="button"
          onClick={onOpenSettings}
          className={iconButtonClass}
          aria-label={settingsLabel}
          title={settingsLabel}
        >
          <Settings className="h-5 w-5" />
        </button>
      )}
    </header>
  );
}
