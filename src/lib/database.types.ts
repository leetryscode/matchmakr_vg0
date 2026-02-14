export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          bio: string | null
          birth_date: string | null
          birth_year: number | null
          business_name: string | null
          city: string | null
          created_at: string
          id: string
          industry: string | null
          location: string | null
          name: string | null
          occupation: string | null
          matchmakr_endorsement: string | null
          offer: string | null
          open_to: string | null
          orbit_community_slug: string | null
          photos: string[] | null
          sex: string | null
          sponsored_by_id: string | null
          state: string | null
          street_address: string | null
          address_line_2: string | null
          user_type: Database["public"]["Enums"]["user_role"]
          zip_code: string | null
        }
        Insert: {
          bio?: string | null
          birth_date?: string | null
          birth_year?: number | null
          business_name?: string | null
          city?: string | null
          created_at?: string
          id: string
          industry?: string | null
          location?: string | null
          name?: string | null
          occupation?: string | null
          matchmakr_endorsement?: string | null
          offer?: string | null
          open_to?: string | null
          orbit_community_slug?: string | null
          photos?: string[] | null
          sex?: string | null
          sponsored_by_id?: string | null
          state?: string | null
          street_address?: string | null
          address_line_2?: string | null
          user_type: Database["public"]["Enums"]["user_role"]
          zip_code?: string | null
        }
        Update: {
          bio?: string | null
          birth_date?: string | null
          birth_year?: number | null
          business_name?: string | null
          city?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          location?: string | null
          name?: string | null
          occupation?: string | null
          matchmakr_endorsement?: string | null
          offer?: string | null
          open_to?: string | null
          orbit_community_slug?: string | null
          photos?: string[] | null
          sex?: string | null
          sponsored_by_id?: string | null
          state?: string | null
          street_address?: string | null
          address_line_2?: string | null
          user_type?: Database["public"]["Enums"]["user_role"]
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_sponsored_by_id_fkey"
            columns: ["sponsored_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      },
      vendor_profiles: {
        Row: {
          id: string
          business_name: string
          industry: string
          street_address: string
          city: string
          state: string
          zip_code: string
          created_at: string
        }
        Insert: {
          id: string
          business_name: string
          industry: string
          street_address: string
          city: string
          state: string
          zip_code: string
          created_at?: string
        }
        Update: {
          id?: string
          business_name?: string
          industry?: string
          street_address?: string
          city?: string
          state?: string
          zip_code?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "auth.users"
            referencedColumns: ["id"]
          },
        ]
      },
      offers: {
        Row: {
          id: string
          vendor_id: string
          title: string
          description: string
          duration_days: number
          created_at: string
          expires_at: string
          claim_count: number
          is_active: boolean
          photos: string[]
        }
        Insert: {
          id?: string
          vendor_id: string
          title: string
          description: string
          duration_days?: number
          created_at?: string
          expires_at?: string
          claim_count?: number
          is_active?: boolean
          photos?: string[]
        }
        Update: {
          id?: string
          vendor_id?: string
          title?: string
          description?: string
          duration_days?: number
          created_at?: string
          expires_at?: string
          claim_count?: number
          is_active?: boolean
          photos?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "offers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      },
      claimed_offers: {
        Row: {
          id: string
          offer_id: string
          user_id: string
          claimed_at: string
          redeemed_at: string | null
        }
        Insert: {
          id?: string
          offer_id: string
          user_id: string
          claimed_at?: string
          redeemed_at?: string | null
        }
        Update: {
          id?: string
          offer_id?: string
          user_id?: string
          claimed_at?: string
          redeemed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claimed_offers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claimed_offers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      },
      messages: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          content: string
          created_at: string
          read: boolean
          about_single_id: string | null
          clicked_single_id: string | null
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          content: string
          created_at?: string
          read?: boolean
          about_single_id?: string | null
          clicked_single_id?: string | null
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          content?: string
          created_at?: string
          read?: boolean
          about_single_id?: string | null
          clicked_single_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_about_single_id_fkey"
            columns: ["about_single_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_clicked_single_id_fkey"
            columns: ["clicked_single_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      },
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: "SINGLE" | "MATCHMAKR" | "VENDOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["SINGLE", "MATCHMAKR", "VENDOR"],
    },
  },
} as const
