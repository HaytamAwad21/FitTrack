import { useState } from 'react';
import { Calendar, Dumbbell } from 'lucide-react';
import { useToday } from '../../hooks/useToday';
import { startOfWeekISO } from '../../utils/date';
import { SegmentedControl } from '../ui/SegmentedControl';
import { ExerciseLibrary } from './ExerciseLibrary';
import { ScheduleView } from './ScheduleView';
import { WorkoutSessionView } from './WorkoutSessionView';

type TrainingView = 'schedule' | 'library';

export function TrainingTab() {
  const today = useToday();
  const [view, setView] = useState<TrainingView>('schedule');
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(() => startOfWeekISO(today));
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);

  if (openSessionId) {
    return <WorkoutSessionView sessionId={openSessionId} onClose={() => setOpenSessionId(null)} />;
  }

  return (
    <div className="space-y-4">
      <SegmentedControl
        ariaLabel="Training view"
        value={view}
        onChange={setView}
        options={[
          { value: 'schedule', label: 'Schedule', icon: Calendar },
          { value: 'library', label: 'Exercises', icon: Dumbbell },
        ]}
      />
      {view === 'schedule' ? (
        <ScheduleView
          today={today}
          selectedDate={selectedDate}
          weekStart={weekStart}
          onSelectDate={setSelectedDate}
          onWeekStartChange={setWeekStart}
          onOpenSession={setOpenSessionId}
        />
      ) : (
        <ExerciseLibrary />
      )}
    </div>
  );
}
