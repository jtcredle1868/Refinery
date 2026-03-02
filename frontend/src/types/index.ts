export interface User {
  id: number;
  email: string;
  full_name: string;
  tier: string;
  organization?: string;
  created_at?: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Manuscript {
  id: number;
  title: string;
  original_filename: string;
  file_type: string;
  status: 'PENDING' | 'EXTRACTING' | 'ANALYZING' | 'COMPLETE' | 'ERROR';
  word_count: number;
  chapter_count: number;
  progress_percent: number;
  error_message?: string;
  created_at: string;
  last_analyzed_at?: string;
  chapters?: Chapter[];
}

export interface Chapter {
  number: number;
  title: string;
  word_count: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
  meta: {
    request_id: string;
    timestamp: string;
  };
}

export interface EditQueueItem {
  id: number;
  module: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  chapter?: string;
  location?: string;
  finding: string;
  suggestion: string;
  context?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  created_at: string;
}

export interface HealthDashboard {
  structural_integrity: number;
  voice_distinctiveness: number;
  pacing_quality: number;
  prose_craft: number;
  character_depth: number;
  overall: number;
}

export type AnalysisModule =
  | 'manuscript_intelligence'
  | 'voice_isolation'
  | 'pacing_architect'
  | 'character_arc'
  | 'prose_refinery'
  | 'revision_command';
