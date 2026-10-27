import { useState } from 'react';
import { BookOpen, Utensils } from 'lucide-react';
import { SegmentedControl } from '../ui/SegmentedControl';
import { FoodLibrary } from './FoodLibrary';
import { TodayView } from './TodayView';

type NutritionView = 'today' | 'library';

export function NutritionTab() {
  const [view, setView] = useState<NutritionView>('today');

  return (
    <div className="space-y-4">
      <SegmentedControl
        ariaLabel="Nutrition view"
        value={view}
        onChange={setView}
        options={[
          { value: 'today', label: 'Today', icon: Utensils },
          { value: 'library', label: 'Food Library', icon: BookOpen },
        ]}
      />
      {view === 'today' ? <TodayView /> : <FoodLibrary />}
    </div>
  );
}
