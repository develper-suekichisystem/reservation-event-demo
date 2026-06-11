import { useEffect, useState } from 'react';
import { fetchAllTournaments, fetchEntries, cancelEntry } from '../../lib/mockDb';
import { formatEventDate } from '../../lib/format';
import type { TournamentWithCount, Entry } from '../../types';

export function EntryAdmin() {
  const [tournaments, setTournaments] = useState<TournamentWithCount[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const list = await fetchAllTournaments();
      setTournaments(list);
      if (list.length > 0) setSelectedId(prev => prev || list[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadEntries(selectedId);
  }, [selectedId]);

  async function loadEntries(tournamentId: string) {
    setLoading(true);
    setEntries(await fetchEntries(tournamentId));
    setLoading(false);
  }

  async function refresh() {
    setTournaments(await fetchAllTournaments());
    await loadEntries(selectedId);
  }

  async function handleCancel(entry: Entry) {
    const label = entry.status === 'confirmed' ? '本予約' : 'キャンセル待ち';
    if (!confirm(`「${entry.team_name}」（${label}）をキャンセルしますか？`)) return;
    const promoted = await cancelEntry(entry.id);
    if (promoted) {
      alert(`キャンセル待ちの「${promoted.team_name}」を本予約に繰り上げました。`);
    }
    await refresh();
  }

  const selected = tournaments.find(t => t.id === selectedId);
  const confirmed = entries.filter(e => e.status === 'confirmed');
  const waitlisted = entries.filter(e => e.status === 'waitlisted');

  return (
    <div className="entry-admin">
      <div className="admin-date-picker">
        <label>大会：</label>
        <select
          className="admin-select"
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
        >
          {tournaments.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}（{t.event_date.replace(/-/g, '/')}）
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="entry-summary">
          <span>{formatEventDate(selected.event_date)}　{selected.venue}</span>
          <span className="entry-summary-count">
            本予約 {confirmed.length}/{selected.capacity}　キャンセル待ち {waitlisted.length}
          </span>
        </div>
      )}

      {loading ? (
        <div className="loading">読み込み中...</div>
      ) : entries.length === 0 ? (
        <p className="no-data">この大会のエントリーはありません</p>
      ) : (
        <div className="admin-list">
          {confirmed.length > 0 && (
            <h3 className="entry-group-heading">本予約</h3>
          )}
          {confirmed.map((e, i) => (
            <div key={e.id} className="admin-card">
              <div className="admin-time">{i + 1}</div>
              <div className="admin-info">
                <div className="admin-name">{e.team_name}</div>
                <div className="admin-menu">代表: {e.representative_name}</div>
                <div className="admin-contact">{e.phone}</div>
              </div>
              <button className="btn-cancel" onClick={() => handleCancel(e)}>
                キャンセル
              </button>
            </div>
          ))}

          {waitlisted.length > 0 && (
            <h3 className="entry-group-heading waitlist">キャンセル待ち（申込順）</h3>
          )}
          {waitlisted.map(e => (
            <div key={e.id} className="admin-card waitlist">
              <div className="admin-time waitlist">待</div>
              <div className="admin-info">
                <div className="admin-name">{e.team_name}</div>
                <div className="admin-menu">代表: {e.representative_name}</div>
                <div className="admin-contact">{e.phone}</div>
              </div>
              <button className="btn-cancel" onClick={() => handleCancel(e)}>
                キャンセル
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
