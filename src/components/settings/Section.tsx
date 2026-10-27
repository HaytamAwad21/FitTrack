import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface SectionProps {
  icon: LucideIcon;
  title: string;
  /** Optional control shown on the right of the title, for example a "New workout" button. */
  action?: ReactNode;
  children: ReactNode;
}

/** Card with an icon heading, used by the settings screens. */
export function Section({ icon: Icon, title, action, children }: SectionProps) {
  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Icon className="h-4 w-4 text-emerald-600" />
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}
