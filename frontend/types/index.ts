export interface Category {
  id: number;
  name: string;
  name_swahili?: string;
  name_korean?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TrainingCard {
  id: number;
  title: string;
  title_swahili?: string;
  title_korean?: string;
  category_id?: number;
  category_name?: string;
  category_name_swahili?: string;
  category_name_korean?: string;
  content_provider?: string;
  target_audience?: string;
  difficulty_level?: string;
  markdown_text?: string;
  html_content?: string;
  image_url?: string;
  video_url?: string;
  audio_url?: string;
  view_count: number;
  like_count: number;
  comment_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface Comment {
  id: number;
  card_id: number;
  user_name: string;
  comment_text: string;
  created_at: string;
}

export interface Stats {
  total_cards: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  top_cards: Array<{
    id: number;
    title: string;
    view_count: number;
    like_count: number;
    comment_count: number;
  }>;
}

export type Language = 'en' | 'sw' | 'ko';
