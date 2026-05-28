export type Database = {
  public: {
    Tables: {
      job_postings: {
        Row: {
          id: number
          user_id: string
          type: 'hiring' | 'seeking'
          contact_name: string | null
          phone: string | null
          wechat: string | null
          title: string
          company: string
          description: string
          salary_min: number | null
          salary_max: number | null
          salary_unit: '/小时' | '/月薪' | '/年薪'
          location: string
          job_type: string
          category: string
          status: 'published' | 'hidden' | 'deleted' | 'unpublished'
          views: number
          created_at: string
          updated_at: string
          is_pinned: boolean
          pinned_until: string | null
          pinned_order: number
          admin_hidden: boolean
          admin_hidden_at: string | null
          admin_hidden_by: string | null
          admin_hidden_reason: string | null
        }
        Insert: {
          id?: number
          user_id: string
          type?: 'hiring' | 'seeking'
          contact_name?: string | null
          phone?: string | null
          wechat?: string | null
          title: string
          company: string
          description: string
          salary_min?: number | null
          salary_max?: number | null
          salary_unit?: '/小时' | '/月薪' | '/年薪'
          location: string
          job_type: string
          category: string
          status?: 'published' | 'hidden' | 'deleted' | 'unpublished'
          views?: number
          created_at?: string
          updated_at?: string
          is_pinned?: boolean
          pinned_until?: string | null
          pinned_order?: number
          admin_hidden?: boolean
          admin_hidden_at?: string | null
          admin_hidden_by?: string | null
          admin_hidden_reason?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          type?: 'hiring' | 'seeking'
          contact_name?: string | null
          phone?: string | null
          wechat?: string | null
          title?: string
          company?: string
          description?: string
          salary_min?: number | null
          salary_max?: number | null
          salary_unit?: '/小时' | '/月薪' | '/年薪'
          location?: string
          job_type?: string
          category?: string
          status?: 'published' | 'hidden' | 'deleted' | 'unpublished'
          views?: number
          created_at?: string
          updated_at?: string
          is_pinned?: boolean
          pinned_until?: string | null
          pinned_order?: number
          admin_hidden?: boolean
          admin_hidden_at?: string | null
          admin_hidden_by?: string | null
          admin_hidden_reason?: string | null
        }
        Relationships: []
      }
      housing_posts: {
        Row: {
          id: number
          user_id: string
          type: 'renting' | 'seeking'
          title: string
          description: string
          price: number
          location: string
          room_type: string
          contact: string
          contact_name: string | null
          phone: string | null
          wechat: string | null
          images: string[]
          status: 'published' | 'hidden' | 'deleted' | 'unpublished'
          views: number
          created_at: string
          updated_at: string
          is_pinned: boolean
          pinned_until: string | null
          pinned_order: number
          admin_hidden: boolean
          admin_hidden_at: string | null
          admin_hidden_by: string | null
          admin_hidden_reason: string | null
        }
        Insert: {
          id?: number
          user_id: string
          type?: 'renting' | 'seeking'
          title?: string
          description: string
          price?: number
          location?: string
          room_type?: string
          contact?: string
          contact_name?: string | null
          phone?: string | null
          wechat?: string | null
          images?: string[]
          status?: 'published' | 'hidden' | 'deleted' | 'unpublished'
          views?: number
          created_at?: string
          updated_at?: string
          is_pinned?: boolean
          pinned_until?: string | null
          pinned_order?: number
          admin_hidden?: boolean
          admin_hidden_at?: string | null
          admin_hidden_by?: string | null
          admin_hidden_reason?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          type?: 'renting' | 'seeking'
          title?: string
          description?: string
          price?: number
          location?: string
          room_type?: string
          contact?: string
          contact_name?: string | null
          phone?: string | null
          wechat?: string | null
          images?: string[]
          status?: 'published' | 'hidden' | 'deleted' | 'unpublished'
          views?: number
          created_at?: string
          updated_at?: string
          is_pinned?: boolean
          pinned_until?: string | null
          pinned_order?: number
          admin_hidden?: boolean
          admin_hidden_at?: string | null
          admin_hidden_by?: string | null
          admin_hidden_reason?: string | null
        }
        Relationships: []
      }
      secondhand_items: {
        Row: {
          id: number
          user_id: string
          title: string
          description: string
          price: number | null
          category: string
          images: string[]
          status: 'published' | 'hidden' | 'deleted' | 'unpublished'
          views: number
          created_at: string
          updated_at: string
          type: 'selling' | 'buying'
          contact_name: string | null
          phone: string | null
          wechat: string | null
          is_pinned: boolean
          pinned_until: string | null
          pinned_order: number
          admin_hidden: boolean
          admin_hidden_at: string | null
          admin_hidden_by: string | null
          admin_hidden_reason: string | null
        }
        Insert: {
          id?: number
          user_id: string
          title: string
          description: string
          price?: number | null
          category: string
          images?: string[]
          status?: 'published' | 'hidden' | 'deleted' | 'unpublished'
          views?: number
          created_at?: string
          updated_at?: string
          type?: 'selling' | 'buying'
          contact_name?: string | null
          phone?: string | null
          wechat?: string | null
          is_pinned?: boolean
          pinned_until?: string | null
          pinned_order?: number
          admin_hidden?: boolean
          admin_hidden_at?: string | null
          admin_hidden_by?: string | null
          admin_hidden_reason?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          title?: string
          description?: string
          price?: number | null
          category?: string
          images?: string[]
          status?: 'published' | 'hidden' | 'deleted' | 'unpublished'
          views?: number
          created_at?: string
          updated_at?: string
          type?: 'selling' | 'buying'
          contact_name?: string | null
          phone?: string | null
          wechat?: string | null
          is_pinned?: boolean
          pinned_until?: string | null
          pinned_order?: number
          admin_hidden?: boolean
          admin_hidden_at?: string | null
          admin_hidden_by?: string | null
          admin_hidden_reason?: string | null
        }
        Relationships: []
      }
      service_posts: {
        Row: {
          id: string
          user_id: string
          title: string
          category: string
          location: string
          description: string
          contact_name: string | null
          phone: string | null
          wechat: string | null
          price_note: string | null
          images: string[] | null
          status: 'active' | 'published' | 'hidden' | 'deleted'
          is_active: boolean
          created_at: string | null
          updated_at: string | null
          is_pinned: boolean
          pinned_until: string | null
          pinned_order: number
          admin_hidden: boolean
          admin_hidden_at: string | null
          admin_hidden_by: string | null
          admin_hidden_reason: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          category: string
          location: string
          description: string
          contact_name?: string | null
          phone?: string | null
          wechat?: string | null
          price_note?: string | null
          images?: string[] | null
          status?: 'active' | 'published' | 'hidden' | 'deleted'
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
          is_pinned?: boolean
          pinned_until?: string | null
          pinned_order?: number
          admin_hidden?: boolean
          admin_hidden_at?: string | null
          admin_hidden_by?: string | null
          admin_hidden_reason?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          category?: string
          location?: string
          description?: string
          contact_name?: string | null
          phone?: string | null
          wechat?: string | null
          price_note?: string | null
          images?: string[] | null
          status?: 'active' | 'published' | 'hidden' | 'deleted'
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
          is_pinned?: boolean
          pinned_until?: string | null
          pinned_order?: number
          admin_hidden?: boolean
          admin_hidden_at?: string | null
          admin_hidden_by?: string | null
          admin_hidden_reason?: string | null
        }
        Relationships: []
      }
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
      notifications: {
        Row: {
          id: string
          user_id: string
          audience: 'user'
          type: 'system' | 'announcement' | 'account' | 'content' | 'favorite' | 'dmv'
          title: string
          body: string
          link_url: string | null
          metadata: Record<string, unknown>
          read_at: string | null
          created_at: string
          expires_at: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          user_id: string
          audience?: 'user'
          type: 'system' | 'announcement' | 'account' | 'content' | 'favorite' | 'dmv'
          title: string
          body: string
          link_url?: string | null
          metadata?: Record<string, unknown>
          read_at?: string | null
          created_at?: string
          expires_at?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          audience?: 'user'
          type?: 'system' | 'announcement' | 'account' | 'content' | 'favorite' | 'dmv'
          title?: string
          body?: string
          link_url?: string | null
          metadata?: Record<string, unknown>
          read_at?: string | null
          created_at?: string
          expires_at?: string | null
          created_by?: string | null
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
