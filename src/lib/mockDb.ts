// ============================================================
// モックデータベース
// localStorage に永続化し、Supabase の代わりに動作するデモ用データ層。
// 各関数は実際のAPI通信を模して少し待ってから結果を返す。
// ============================================================
import type { Tournament, TournamentWithCount, Entry } from '../types';

const STORAGE_KEY = 'reservation_event_demo_db_v1';
const LATENCY_MS = 400;

interface DbData {
  tournaments: Tournament[];
  entries: Entry[];
}

const delay = () => new Promise(resolve => setTimeout(resolve, LATENCY_MS));
const uuid = () => crypto.randomUUID();

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

// ── 初期データ生成 ──────────────────────────────────────────
function seed(): DbData {
  const today = new Date();
  const eventDate = (offset: number) => formatDate(addDays(today, offset));

  const tournaments: Tournament[] = [
    {
      id: uuid(), name: '第12回 サマーカップ', event_date: eventDate(20),
      venue: '市民総合体育館', capacity: 16,
      description: '夏恒例のオープン大会。初心者チームも歓迎です。',
      is_active: true, sort_order: 1,
    },
    {
      id: uuid(), name: 'ビーチボールバレー交流大会', event_date: eventDate(34),
      venue: '海浜公園 特設コート', capacity: 8,
      description: '交流をメインとしたレクリエーション大会です。',
      is_active: true, sort_order: 2,
    },
    {
      id: uuid(), name: 'ナイターカップ', event_date: eventDate(48),
      venue: '中央スポーツセンター', capacity: 10,
      description: '夜間開催のお仕事帰りでも参加しやすい大会です。',
      is_active: true, sort_order: 3,
    },
    {
      id: uuid(), name: '秋季リーグ 開幕戦', event_date: eventDate(76),
      venue: '県立アリーナ', capacity: 12,
      description: '秋季リーグの開幕戦。上位チームは決勝大会へ進出します。',
      is_active: true, sort_order: 4,
    },
  ];

  // ダミーエントリー
  // - ビーチボールバレー交流大会（capacity 8）: 8件で満員 → キャンセル待ちデモ用
  // - 秋季リーグ（capacity 12）: 11件 → 残り1枠
  const TEAM_NAMES = [
    'チームサンダー', 'ブルーウェーブ', 'スマッシュキングス', 'レッドスターズ',
    'シーガルズ', 'ファイヤーボールズ', 'グリーンホッパーズ', 'ウィングス',
    'タイガーアタック', 'ホワイトベアーズ', 'コスモス', 'ライジングサン',
    'オーシャンズ', 'サンライズ', 'ストライカーズ', 'ピースフル',
    'ゴールデンイーグルス', 'ミラクルズ', 'ハリケーンズ',
  ];
  const REP_NAMES = [
    '田中 一郎', '鈴木 健太', '高橋 直美', '伊藤 大輔', '渡辺 さくら',
    '山本 翔太', '中村 美穂', '小林 拓也', '加藤 由紀', '吉田 浩二',
    '佐々木 蓮', '山口 真央', '松本 剛', '井上 千夏', '木村 亮',
    '林 美咲', '斎藤 大地', '清水 結衣', '森 健一',
  ];

  const entries: Entry[] = [];
  let teamIdx = 0;
  const baseTime = today.getTime() - 1000 * 60 * 60 * 24 * 7; // 1週間前から順に申込
  let seq = 0;

  function pushEntries(tournamentId: string, count: number) {
    for (let i = 0; i < count; i++) {
      entries.push({
        id: uuid(),
        tournament_id: tournamentId,
        line_user_id: `demo-seed-user-${teamIdx}`,
        team_name: TEAM_NAMES[teamIdx % TEAM_NAMES.length],
        representative_name: REP_NAMES[teamIdx % REP_NAMES.length],
        phone: `090-${String(1000 + teamIdx).padStart(4, '0')}-${String(5000 + teamIdx).padStart(4, '0')}`,
        status: 'confirmed',
        created_at: new Date(baseTime + seq * 1000 * 60 * 30).toISOString(),
      });
      teamIdx++;
      seq++;
    }
  }

  pushEntries(tournaments[0].id, 6);  // サマーカップ: 16枠中6
  pushEntries(tournaments[1].id, 8);  // 交流大会: 8枠中8 → 満員
  pushEntries(tournaments[2].id, 3);  // ナイターカップ: 10枠中3
  pushEntries(tournaments[3].id, 11); // 秋季リーグ: 12枠中11 → 残り1枠

  return { tournaments, entries };
}

// ── 永続化 ──────────────────────────────────────────────────
function load(): DbData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as DbData;
    } catch {
      // 壊れていたら作り直す
    }
  }
  const data = seed();
  save(data);
  return data;
}

function save(db: DbData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export async function resetDemoData(): Promise<void> {
  await delay();
  save(seed());
}

// ── 大会 ────────────────────────────────────────────────────
function confirmedCount(db: DbData, tournamentId: string): number {
  return db.entries.filter(e => e.tournament_id === tournamentId && e.status === 'confirmed').length;
}

function withCount(db: DbData, t: Tournament): TournamentWithCount {
  return { ...t, confirmed_count: confirmedCount(db, t.id) };
}

export async function fetchActiveTournaments(): Promise<TournamentWithCount[]> {
  await delay();
  const db = load();
  return db.tournaments
    .filter(t => t.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(t => withCount(db, t));
}

export async function fetchAllTournaments(): Promise<TournamentWithCount[]> {
  await delay();
  const db = load();
  return db.tournaments
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(t => withCount(db, t));
}

export interface TournamentPayload {
  name: string;
  event_date: string;
  venue: string;
  capacity: number;
  description: string | null;
  is_active: boolean;
}

export async function createTournament(payload: TournamentPayload): Promise<void> {
  await delay();
  const db = load();
  const maxOrder = db.tournaments.length > 0 ? Math.max(...db.tournaments.map(t => t.sort_order)) + 1 : 1;
  db.tournaments.push({
    id: uuid(),
    ...payload,
    description: payload.description ?? undefined,
    sort_order: maxOrder,
  });
  save(db);
}

export async function updateTournament(id: string, payload: TournamentPayload): Promise<void> {
  await delay();
  const db = load();
  const t = db.tournaments.find(t => t.id === id);
  if (t) {
    Object.assign(t, payload, { description: payload.description ?? undefined });
    save(db);
  }
}

export async function setTournamentActive(id: string, isActive: boolean): Promise<void> {
  await delay();
  const db = load();
  const t = db.tournaments.find(t => t.id === id);
  if (t) {
    t.is_active = isActive;
    save(db);
  }
}

export async function deleteTournament(id: string): Promise<void> {
  await delay();
  const db = load();
  db.tournaments = db.tournaments.filter(t => t.id !== id);
  db.entries = db.entries.filter(e => e.tournament_id !== id);
  save(db);
}

// ── エントリー ──────────────────────────────────────────────
export interface CreateEntryParams {
  tournamentId: string;
  lineUserId: string;
  teamName: string;
  representativeName: string;
  phone: string;
}

export async function createEntry(params: CreateEntryParams): Promise<Entry> {
  await delay();
  const db = load();

  const tournament = db.tournaments.find(t => t.id === params.tournamentId);
  if (!tournament) throw new Error('大会が見つかりません');

  // 同一大会への同名チームの重複エントリーを防止
  const duplicate = db.entries.some(e =>
    e.tournament_id === params.tournamentId &&
    e.status !== 'cancelled' &&
    e.team_name === params.teamName.trim()
  );
  if (duplicate) throw new Error('同じチーム名で既にエントリーされています。');

  // 枠が埋まっていればキャンセル待ち
  const isFull = confirmedCount(db, params.tournamentId) >= tournament.capacity;

  const entry: Entry = {
    id: uuid(),
    tournament_id: params.tournamentId,
    line_user_id: params.lineUserId,
    team_name: params.teamName.trim(),
    representative_name: params.representativeName.trim(),
    phone: params.phone.trim(),
    status: isFull ? 'waitlisted' : 'confirmed',
    created_at: new Date().toISOString(),
  };
  db.entries.push(entry);
  save(db);
  return entry;
}

export async function fetchEntries(tournamentId: string): Promise<Entry[]> {
  await delay();
  const db = load();
  return db.entries
    .filter(e => e.tournament_id === tournamentId && e.status !== 'cancelled')
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// キャンセル処理：本予約のキャンセル時はキャンセル待ちの先頭を自動繰上げ
export async function cancelEntry(id: string): Promise<Entry | null> {
  await delay();
  const db = load();
  const entry = db.entries.find(e => e.id === id);
  if (!entry) return null;

  const wasConfirmed = entry.status === 'confirmed';
  entry.status = 'cancelled';

  let promoted: Entry | null = null;
  if (wasConfirmed) {
    promoted = db.entries
      .filter(e => e.tournament_id === entry.tournament_id && e.status === 'waitlisted')
      .sort((a, b) => a.created_at.localeCompare(b.created_at))[0] ?? null;
    if (promoted) promoted.status = 'confirmed';
  }

  save(db);
  return promoted;
}
