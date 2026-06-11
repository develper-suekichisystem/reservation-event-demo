export interface Tournament {
  id: string;
  name: string;
  event_date: string; // YYYY-MM-DD
  venue: string;
  capacity: number;   // 出場枠（チーム数）
  description?: string;
  is_active: boolean;
  sort_order: number;
}

// 大会一覧表示用：本予約の件数を付与
export interface TournamentWithCount extends Tournament {
  confirmed_count: number;
}

export type EntryStatus = 'confirmed' | 'waitlisted' | 'cancelled';

export interface Entry {
  id: string;
  tournament_id: string;
  line_user_id: string;
  team_name: string;
  representative_name: string;
  phone: string;
  status: EntryStatus;
  created_at: string;
  tournament?: Tournament;
}

export interface EntryState {
  selectedTournament: TournamentWithCount | null;
  teamName: string;
  representativeName: string;
  phone: string;
}

export type Step = 'tournament' | 'form' | 'confirm' | 'complete';
