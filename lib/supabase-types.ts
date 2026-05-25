export type Database = {
  public: {
    Tables: {
      favorites: {
        Row: {
          id: string
          user_id: string
          target_type: 'jobs' | 'housing' | 'secondhand' | 'services' | 'news' | 'dmv'
          target_id: string
          target_url: string
          title: string
          image_url: string | null
          summary: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_type: 'jobs' | 'housing' | 'secondhand' | 'services' | 'news' | 'dmv'
          target_id: string
          target_url: string
          title: string
          image_url?: string | null
          summary?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_type?: 'jobs' | 'housing' | 'secondhand' | 'services' | 'news' | 'dmv'
          target_id?: string
          target_url?: string
          title?: string
          image_url?: string | null
          summary?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_navigation_links: {
        Row: {
          id: string
          user_id: string
          title: string
          url: string
          description: string | null
          open_mode: 'auto' | 'same' | 'new'
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          url: string
          description?: string | null
          open_mode?: 'auto' | 'same' | 'new'
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          url?: string
          description?: string | null
          open_mode?: 'auto' | 'same' | 'new'
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          user_id: string
          navigation_default: 'public' | 'my'
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          navigation_default?: 'public' | 'my'
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          navigation_default?: 'public' | 'my'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
