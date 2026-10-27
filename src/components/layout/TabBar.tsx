import { Dumbbell, Utensils, type LucideIcon } from 'lucide-react';

export type TabKey = 'nutrition' | 'training';

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'nutrition', label: 'Nutrition', icon: Utensils },
  { key: 'training', label: 'Training', icon: Dumbbell },
];

interface TabBarProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
      aria-label="Main"
    >
      <div className="grid grid-cols-2">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition ${
                isActive ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
