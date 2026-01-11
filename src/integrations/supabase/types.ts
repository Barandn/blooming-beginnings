export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      barn_game_attempts: {
        Row: {
          attempts_remaining: number
          cooldown_ends_at: string | null
          cooldown_started_at: string | null
          created_at: string
          free_game_used: boolean
          has_active_game: boolean
          id: string
          last_played_date: string | null
          matches_found_today: number
          play_pass_expires_at: string | null
          play_pass_purchased_at: string | null
          total_coins_won_today: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts_remaining?: number
          cooldown_ends_at?: string | null
          cooldown_started_at?: string | null
          created_at?: string
          free_game_used?: boolean
          has_active_game?: boolean
          id?: string
          last_played_date?: string | null
          matches_found_today?: number
          play_pass_expires_at?: string | null
          play_pass_purchased_at?: string | null
          total_coins_won_today?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts_remaining?: number
          cooldown_ends_at?: string | null
          cooldown_started_at?: string | null
          created_at?: string
          free_game_used?: boolean
          has_active_game?: boolean
          id?: string
          last_played_date?: string | null
          matches_found_today?: number
          play_pass_expires_at?: string | null
          play_pass_purchased_at?: string | null
          total_coins_won_today?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barn_game_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      barn_game_purchases: {
        Row: {
          amount: string
          attempts_granted: number
          confirmed_at: string | null
          created_at: string
          id: string
          payment_reference: string
          play_pass_duration_ms: number | null
          status: string
          token_symbol: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: string
          attempts_granted?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          payment_reference: string
          play_pass_duration_ms?: number | null
          status?: string
          token_symbol: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: string
          attempts_granted?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          payment_reference?: string
          play_pass_duration_ms?: number | null
          status?: string
          token_symbol?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barn_game_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_transactions: {
        Row: {
          amount: string
          block_number: number | null
          claim_type: string
          confirmed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          status: string
          token_address: string
          tx_hash: string | null
          user_id: string
        }
        Insert: {
          amount: string
          block_number?: number | null
          claim_type: string
          confirmed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          token_address: string
          tx_hash?: string | null
          user_id: string
        }
        Update: {
          amount?: string
          block_number?: number | null
          claim_type?: string
          confirmed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          token_address?: string
          tx_hash?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_bonus_claims: {
        Row: {
          amount: string
          claim_date: string
          claimed_at: string
          id: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: string
          claim_date: string
          claimed_at?: string
          id?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: string
          claim_date?: string
          claimed_at?: string
          id?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_bonus_claims_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "claim_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_bonus_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      game_scores: {
        Row: {
          created_at: string
          game_started_at: string | null
          game_type: string
          id: string
          is_validated: boolean
          leaderboard_period: string
          monthly_profit: number
          moves: number | null
          score: number
          session_id: string | null
          time_taken: number | null
          user_id: string
          validation_data: string | null
        }
        Insert: {
          created_at?: string
          game_started_at?: string | null
          game_type: string
          id?: string
          is_validated?: boolean
          leaderboard_period: string
          monthly_profit?: number
          moves?: number | null
          score: number
          session_id?: string | null
          time_taken?: number | null
          user_id: string
          validation_data?: string | null
        }
        Update: {
          created_at?: string
          game_started_at?: string | null
          game_type?: string
          id?: string
          is_validated?: boolean
          leaderboard_period?: string
          monthly_profit?: number
          moves?: number | null
          score?: number
          session_id?: string | null
          time_taken?: number | null
          user_id?: string
          validation_data?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_references: {
        Row: {
          amount: string
          created_at: string
          expires_at: string
          id: string
          item_type: string
          reference_id: string
          status: string
          token_symbol: string
          user_id: string
        }
        Insert: {
          amount: string
          created_at?: string
          expires_at: string
          id?: string
          item_type: string
          reference_id: string
          status?: string
          token_symbol: string
          user_id: string
        }
        Update: {
          amount?: string
          created_at?: string
          expires_at?: string
          id?: string
          item_type?: string
          reference_id?: string
          status?: string
          token_symbol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_references_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean
          last_used_at: string
          token_hash: string
          user_agent: string | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_used_at?: string
          token_hash: string
          user_agent?: string | null
          user_id: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_used_at?: string
          token_hash?: string
          user_agent?: string | null
          user_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      siwe_nonces: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          nonce: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          nonce: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          nonce?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          daily_streak_count: number
          id: string
          is_active: boolean
          last_daily_claim_date: string | null
          last_login_at: string | null
          merkle_root: string | null
          nullifier_hash: string
          updated_at: string
          verification_level: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          daily_streak_count?: number
          id?: string
          is_active?: boolean
          last_daily_claim_date?: string | null
          last_login_at?: string | null
          merkle_root?: string | null
          nullifier_hash: string
          updated_at?: string
          verification_level?: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          daily_streak_count?: number
          id?: string
          is_active?: boolean
          last_daily_claim_date?: string | null
          last_login_at?: string | null
          merkle_root?: string | null
          nullifier_hash?: string
          updated_at?: string
          verification_level?: string
          wallet_address?: string
        }
        Relationships: []
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
