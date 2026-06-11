import { useEffect, useState } from 'react';
import { fetchActiveTournaments } from '../lib/mockDb';
import { useLoading } from '../contexts/LoadingContext';
import { formatEventDate } from '../lib/format';
import type { TournamentWithCount } from '../types';

interface Props {
  onSelect: (tournament: TournamentWithCount) => void;
}

function statusBadge(t: TournamentWithCount) {
  const remaining = t.capacity - t.confirmed_count;
  if (remaining <= 0) return <span className="badge badge-full">満員（キャンセル待ちのみ）</span>;
  if (remaining <= 2) return <span className="badge badge-few">残り{remaining}枠</span>;
  return <span className="badge badge-open">受付中（残り{remaining}枠）</span>;
}

export function TournamentSelect({ onSelect }: Props) {
  const [tournaments, setTournaments] = useState<TournamentWithCount[]>([]);
  const { withLoading } = useLoading();

  useEffect(() => {
    withLoading(async () => {
      setTournaments(await fetchActiveTournaments());
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="tournament-select">
      <h2 className="section-title">大会を選択</h2>
      <div className="tournament-list">
        {tournaments.map(t => {
          const isFull = t.confirmed_count >= t.capacity;
          return (
            <button
              key={t.id}
              className={`tournament-card${isFull ? ' full' : ''}`}
              onClick={() => onSelect(t)}
            >
              <div className="tournament-header">
                <span className="tournament-name">{t.name}</span>
                {statusBadge(t)}
              </div>
              <div className="tournament-meta">
                <span>📅 {formatEventDate(t.event_date)}</span>
                <span>📍 {t.venue}</span>
                <span>👥 出場枠 {t.capacity}チーム（申込 {t.confirmed_count}チーム）</span>
              </div>
              {t.description && (
                <div className="tournament-desc">{t.description}</div>
              )}
              {isFull && (
                <div className="tournament-full-note">
                  この大会は出場枠が埋まっているため、キャンセル待ちでの予約となります。
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
