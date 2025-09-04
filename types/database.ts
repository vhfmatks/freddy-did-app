export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      store_admins: {
        Row: {
          id: string
          user_id: string
          store_id: string
          role: 'admin' | 'manager'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          store_id: string
          role?: 'admin' | 'manager'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          store_id?: string
          role?: 'admin' | 'manager'
          created_at?: string
        }
      }
      order_calls: {
        Row: {
          id: string
          store_id: string
          number: number
          type: 'takeout' | 'dine_in'
          called_at: string
          admin_id: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          store_id: string
          number: number
          type: 'takeout' | 'dine_in'
          called_at?: string
          admin_id: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          number?: number
          type?: 'takeout' | 'dine_in'
          called_at?: string
          admin_id?: string
          deleted_at?: string | null
        }
      }
      store_images: {
        Row: {
          id: string
          store_id: string
          image_url: string
          order_index: number
          is_active: boolean
          uploaded_at: string
        }
        Insert: {
          id?: string
          store_id: string
          image_url: string
          order_index?: number
          is_active?: boolean
          uploaded_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          image_url?: string
          order_index?: number
          is_active?: boolean
          uploaded_at?: string
        }
      }
      store_settings: {
        Row: {
          id: string
          store_id: string
          recent_display_minutes: number
          volume_level: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          recent_display_minutes?: number
          volume_level?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          recent_display_minutes?: number
          volume_level?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}