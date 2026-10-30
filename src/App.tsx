import { useState, type ReactNode } from 'react';
import { Header } from './components/layout/Header';
import { TabBar, type TabKey } from './components/layout/TabBar';
import { NutritionTab } from './components/nutrition/NutritionTab';
import { NutritionSettingsForm } from './components/settings/NutritionSettingsForm';
import { Onboarding } from './components/settings/Onboarding';
import { TrainingSettingsScreen } from './components/settings/TrainingSettingsScreen';
import { TrainingTab } from './components/training/TrainingTab';
import { Modal } from './components/ui/Modal';
import { ToastHost } from './components/ui/ToastHost';
import { useAppStore } from './store';

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen justify-center bg-slate-100">
      <div className="relative flex min-h-screen w-full max-w-md flex-col bg-slate-50 shadow-sm">{children}</div>
    </div>
  );
}

export default function App() {
  const nutritionSettings = useAppStore((state) => state.nutritionSettings);
  const trainingSettings = useAppStore((state) => state.trainingSettings);
  const saveNutritionSettings = useAppStore((state) => state.saveNutritionSettings);
  const [tab, setTab] = useState<TabKey>('nutrition');
  /** Which settings screen is open; the header icon opens the one for the current tab. */
  const [settingsOpen, setSettingsOpen] = useState<TabKey | null>(null);

  if (!nutritionSettings || !trainingSettings) {
    return (
      <AppShell>
        <Header />
        <main className="flex-1 px-4 pb-10 pt-4">
          <Onboarding initial={nutritionSettings} />
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header
        onOpenSettings={() => setSettingsOpen(tab)}
        settingsLabel={tab === 'nutrition' ? 'Nutrition settings' : 'Training settings'}
      />
      <main className="flex-1 px-4 pb-28 pt-4">{tab === 'nutrition' ? <NutritionTab /> : <TrainingTab />}</main>
      <TabBar active={tab} onChange={setTab} />
      {settingsOpen === 'nutrition' && (
        <Modal title="Nutrition settings" onClose={() => setSettingsOpen(null)}>
          <NutritionSettingsForm
            initial={nutritionSettings}
            submitLabel="Save changes"
            onCancel={() => setSettingsOpen(null)}
            onSubmit={(input) => {
              saveNutritionSettings(input);
              setSettingsOpen(null);
            }}
          />
        </Modal>
      )}
      {settingsOpen === 'training' && <TrainingSettingsScreen onClose={() => setSettingsOpen(null)} />}
      <ToastHost />
    </AppShell>
  );
}
