export type ContentCategory =
  | 'AI'
  | 'Development'
  | 'Cloud'
  | 'Security'
  | 'Developer Tools'
  | 'Databases'
  | 'Technology Industry'

export type ProcessingStatus =
  | 'discovered'
  | 'pending'
  | 'processing'
  | 'analyzed'
  | 'published'
  | 'archived'
  | 'failed'

export type VerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'disputed'
  | 'rejected'

export type InterestType = 'category' | 'technology' | 'company' | 'project' | 'topic'

export type Profile = {
  id: string
  display_name: string | null
  timezone: string
  is_admin: boolean
  telegram_enabled: boolean
  telegram_chat_id: string | null
  gmail_enabled: boolean
  gmail_address: string | null
  last_gmail_delivery_at: string | null
  morning_digest_enabled: boolean
  evening_digest_enabled: boolean
  weekly_digest_enabled: boolean
  breaking_alerts_enabled: boolean
  quiet_hours_enabled: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  morning_digest_hour: number
  evening_digest_hour: number
  notification_threshold: number
  created_at: string
  updated_at: string
}

export type FeedbackSignal =
  | 'relevant'
  | 'not_relevant'
  | 'save'
  | 'dismiss'
  | 'more_like_this'
  | 'less_like_this'
  | 'too_technical'

export type UserFollowedTopic = {
  user_id: string
  topic: string
  created_at: string
}

export type UserFeedback = {
  id: string
  user_id: string
  article_id: string
  signal: FeedbackSignal
  created_at: string
}

export type ArticleUserRelevance = {
  user_id: string
  article_id: string
  final_score: number
  relevance_decision: 'breaking' | 'digest' | 'store_only' | 'ignore'
  factors: Record<string, unknown>
  explanations: string[]
  created_at: string
  updated_at: string
}

export type Source = {
  id: string
  name: string
  type: 'rss' | 'github' | 'api' | 'web'
  url: string
  category: ContentCategory
  is_active: boolean
  fetch_interval_minutes: number
  last_fetched_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type Article = {
  id: string
  title: string
  canonical_url: string
  source_id: string | null
  author: string | null
  published_at: string | null
  discovered_at: string
  raw_excerpt: string | null
  image_url: string | null
  category: ContentCategory | null
  tags: string[]
  content_hash: string | null
  processing_status: ProcessingStatus
  ai_summary: string | null
  one_sentence_takeaway: string | null
  why_it_matters: string | null
  developer_impact: string | null
  technical_impact: string | null
  who_should_care: string | null
  recommended_action: string | null
  importance_score: number | null
  developer_relevance_score: number | null
  urgency_score: number | null
  confidence_score: number | null
  novelty_score: number | null
  notification_level: 'breaking' | 'high' | 'normal' | 'low' | 'none'
  verification_status: VerificationStatus
  what_happened: string | null
  relevance_score: number | null
  relevance_decision: 'breaking' | 'digest' | 'store_only' | 'ignore' | null
  cluster_key: string | null
  created_at: string
  updated_at: string
}

export type SavedArticle = {
  user_id: string
  article_id: string
  saved_at: string
}

export type LearningTopic = {
  id: string
  title: string
  description: string | null
  category: ContentCategory | null
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

export type UserInterest = {
  id: string
  user_id: string
  interest_type: InterestType
  value: string
  weight: number
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string }
        Update: Partial<Profile>
        Relationships: []
      }
      sources: {
        Row: Source
        Insert: Partial<Source> & { name: string; url: string; category: ContentCategory }
        Update: Partial<Source>
        Relationships: []
      }
      articles: {
        Row: Article
        Insert: Partial<Article> & { title: string; canonical_url: string }
        Update: Partial<Article>
        Relationships: []
      }
      user_interests: {
        Row: UserInterest
        Insert: Partial<UserInterest> & {
          user_id: string
          interest_type: InterestType
          value: string
        }
        Update: Partial<UserInterest>
        Relationships: []
      }
      user_followed_topics: {
        Row: UserFollowedTopic
        Insert: { user_id: string; topic: string }
        Update: Partial<UserFollowedTopic>
        Relationships: []
      }
      saved_articles: {
        Row: SavedArticle
        Insert: { user_id: string; article_id: string }
        Update: Partial<SavedArticle>
        Relationships: []
      }
      learning_topics: {
        Row: LearningTopic
        Insert: Partial<LearningTopic> & { title: string }
        Update: Partial<LearningTopic>
        Relationships: []
      }
      user_feedback: {
        Row: UserFeedback
        Insert: { user_id: string; article_id: string; signal: FeedbackSignal }
        Update: Partial<UserFeedback>
        Relationships: []
      }
      article_user_relevance: {
        Row: ArticleUserRelevance
        Insert: {
          user_id: string
          article_id: string
          final_score: number
          relevance_decision: ArticleUserRelevance['relevance_decision']
          factors?: Record<string, unknown>
          explanations?: string[]
        }
        Update: Partial<ArticleUserRelevance>
        Relationships: []
      }
      telegram_link_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          expires_at: string
          used_at: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          token: string
          expires_at: string
          id?: string
          used_at?: string | null
          created_at?: string
        }
        Update: Partial<{
          used_at: string | null
        }>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
