import { useState } from 'react';
import { useLoading } from './contexts/LoadingContext';
import { useLiff } from './hooks/useLiff';
import { StepIndicator } from './components/StepIndicator';
import { TournamentSelect } from './components/TournamentSelect';
import { EntryForm } from './components/EntryForm';
import { Confirmation } from './components/Confirmation';
import { Complete } from './components/Complete';
import { AdminPage } from './components/admin/AdminPage';
import { LoadingSpinner } from './components/LoadingSpinner';
import { createEntry } from './lib/mockDb';
import { IS_MOCK_LIFF } from './lib/liff';
import type { Step, EntryState, TournamentWithCount } from './types';

const INITIAL_STATE: EntryState = {
  selectedTournament: null,
  teamName: '',
  representativeName: '',
  phone: '',
};

function EntryApp() {
  const { isReady, isLoggedIn, userId, displayName, pictureUrl, error } = useLiff();
  const { withLoading } = useLoading();
  const [step, setStep] = useState<Step>('tournament');
  const [state, setState] = useState<EntryState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [completedId, setCompletedId] = useState('');
  const [completedWaitlist, setCompletedWaitlist] = useState(false);

  if (!isReady || (!isLoggedIn && !error)) return <LoadingSpinner />;
  if (error)    return <div className="error-screen">エラー: {error}</div>;
  if (!userId)  return <LoadingSpinner />;

  const name = displayName ?? 'ゲスト';

  // 選択中の大会が満員 → キャンセル待ち予約になる
  const isWaitlist = state.selectedTournament
    ? state.selectedTournament.confirmed_count >= state.selectedTournament.capacity
    : false;

  function update(updates: Partial<EntryState>) {
    setState(prev => ({ ...prev, ...updates }));
  }

  function handleTournamentSelect(tournament: TournamentWithCount) {
    update({ selectedTournament: tournament });
    setStep('form');
  }

  async function handleConfirm() {
    if (!state.selectedTournament) return;
    const tournament = state.selectedTournament;
    setSubmitting(true);

    await withLoading(async () => { try {
      const entry = await createEntry({
        tournamentId: tournament.id,
        lineUserId: userId!,
        teamName: state.teamName,
        representativeName: state.representativeName,
        phone: state.phone,
      });
      const waitlisted = entry.status === 'waitlisted';

      // Messaging API で申込控えを送信（失敗してもエントリーは成功扱い）。
      // モックLIFF時はLINEユーザーIDが実在しないためスキップ。
      if (!IS_MOCK_LIFF) {
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            tournamentName: tournament.name,
            eventDate: tournament.event_date,
            venue: tournament.venue,
            teamName: entry.team_name,
            representativeName: entry.representative_name,
            isWaitlisted: waitlisted,
            entryId: entry.id,
          }),
        }).catch(console.error);
      }

      setCompletedId(entry.id);
      setCompletedWaitlist(waitlisted);
      setStep('complete');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エントリーに失敗しました');
    } finally {
      setSubmitting(false);
    } });
  }

  function restart() {
    setState(INITIAL_STATE);
    setCompletedId('');
    setCompletedWaitlist(false);
    setStep('tournament');
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">大会予約デモ</h1>
        <p className="app-subtitle">大会エントリー受付</p>
      </header>

      {step !== 'complete' && <StepIndicator currentStep={step} />}

      <main className="app-main">
        {step === 'tournament' && (
          <TournamentSelect onSelect={handleTournamentSelect} />
        )}
        {step === 'form' && (
          <EntryForm
            state={state}
            isWaitlist={isWaitlist}
            displayName={name}
            pictureUrl={pictureUrl}
            onChange={update}
            onNext={() => setStep('confirm')}
            onBack={() => setStep('tournament')}
          />
        )}
        {step === 'confirm' && (
          <Confirmation
            state={state}
            isWaitlist={isWaitlist}
            displayName={name}
            pictureUrl={pictureUrl}
            onConfirm={handleConfirm}
            onBack={() => setStep('form')}
            submitting={submitting}
          />
        )}
        {step === 'complete' && (
          <Complete
            entryId={completedId}
            isWaitlist={completedWaitlist}
            onRestart={restart}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  if (window.location.pathname === '/admin') return <AdminPage />;
  return <EntryApp />;
}
