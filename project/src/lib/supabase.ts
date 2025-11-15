import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Message = {
  sender: 'user' | 'ai';
  content: string;
};

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  analyzed_at: string | null;
  user_id: string;
};

export type ConversationAnalysis = {
  id: string;
  conversation_id: string;
  clarity_score: number;
  relevance_score: number;
  accuracy_score: number;
  completeness_score: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  empathy_score: number;
  response_time_avg: number;
  resolution_rate: boolean;
  escalation_needed: boolean;
  fallback_frequency: number;
  overall_satisfaction_score: number;
  created_at: string;
  updated_at: string;
};
