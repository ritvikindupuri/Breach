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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entry_hash: string
          environment_id: string | null
          id: string
          metadata: Json
          prev_hash: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entry_hash: string
          environment_id?: string | null
          id?: string
          metadata?: Json
          prev_hash?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entry_hash?: string
          environment_id?: string | null
          id?: string
          metadata?: Json
          prev_hash?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      aws_credentials: {
        Row: {
          access_key_id_masked: string | null
          created_at: string
          dek_iv: string
          dek_tag: string | null
          dek_wrapped: string
          environment_id: string
          external_id_masked: string | null
          id: string
          label: string
          last_rotated_at: string
          last_verified_at: string | null
          mode: Database["public"]["Enums"]["credential_mode"]
          owner_id: string
          payload_ciphertext: string
          payload_iv: string
          payload_tag: string | null
          region: string
          role_arn: string | null
          session_duration_seconds: number | null
          updated_at: string
          verification_status: string | null
        }
        Insert: {
          access_key_id_masked?: string | null
          created_at?: string
          dek_iv: string
          dek_tag?: string | null
          dek_wrapped: string
          environment_id: string
          external_id_masked?: string | null
          id?: string
          label: string
          last_rotated_at?: string
          last_verified_at?: string | null
          mode?: Database["public"]["Enums"]["credential_mode"]
          owner_id: string
          payload_ciphertext: string
          payload_iv: string
          payload_tag?: string | null
          region?: string
          role_arn?: string | null
          session_duration_seconds?: number | null
          updated_at?: string
          verification_status?: string | null
        }
        Update: {
          access_key_id_masked?: string | null
          created_at?: string
          dek_iv?: string
          dek_tag?: string | null
          dek_wrapped?: string
          environment_id?: string
          external_id_masked?: string | null
          id?: string
          label?: string
          last_rotated_at?: string
          last_verified_at?: string | null
          mode?: Database["public"]["Enums"]["credential_mode"]
          owner_id?: string
          payload_ciphertext?: string
          payload_iv?: string
          payload_tag?: string | null
          region?: string
          role_arn?: string | null
          session_duration_seconds?: number | null
          updated_at?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aws_credentials_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      detection_rules: {
        Row: {
          action: string
          created_at: string
          description: string | null
          enabled: boolean
          environment_id: string
          id: string
          kind: Database["public"]["Enums"]["rule_kind"]
          name: string
          owner_id: string
          pattern: string | null
          severity: Database["public"]["Enums"]["severity"]
          updated_at: string
        }
        Insert: {
          action?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          environment_id: string
          id?: string
          kind: Database["public"]["Enums"]["rule_kind"]
          name: string
          owner_id: string
          pattern?: string | null
          severity?: Database["public"]["Enums"]["severity"]
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          environment_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["rule_kind"]
          name?: string
          owner_id?: string
          pattern?: string | null
          severity?: Database["public"]["Enums"]["severity"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "detection_rules_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
      }
      environments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["env_kind"]
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["env_kind"]
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["env_kind"]
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      intercepts: {
        Row: {
          action: string | null
          actual_summary: string | null
          created_at: string
          diff_score: number | null
          environment_id: string
          expected_summary: string | null
          id: string
          owner_id: string
          payload_preview: string | null
          reason: string | null
          rule_id: string | null
          severity: Database["public"]["Enums"]["severity"]
          source_service: string
          target_service: string
          verdict: Database["public"]["Enums"]["verdict"]
        }
        Insert: {
          action?: string | null
          actual_summary?: string | null
          created_at?: string
          diff_score?: number | null
          environment_id: string
          expected_summary?: string | null
          id?: string
          owner_id: string
          payload_preview?: string | null
          reason?: string | null
          rule_id?: string | null
          severity?: Database["public"]["Enums"]["severity"]
          source_service: string
          target_service: string
          verdict: Database["public"]["Enums"]["verdict"]
        }
        Update: {
          action?: string | null
          actual_summary?: string | null
          created_at?: string
          diff_score?: number | null
          environment_id?: string
          expected_summary?: string | null
          id?: string
          owner_id?: string
          payload_preview?: string | null
          reason?: string | null
          rule_id?: string | null
          severity?: Database["public"]["Enums"]["severity"]
          source_service?: string
          target_service?: string
          verdict?: Database["public"]["Enums"]["verdict"]
        }
        Relationships: [
          {
            foreignKeyName: "intercepts_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intercepts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "detection_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          org_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          org_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          org_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vault_master_key: {
        Row: {
          created_at: string
          id: number
          key_b64: string
        }
        Insert: {
          created_at?: string
          id?: number
          key_b64: string
        }
        Update: {
          created_at?: string
          id?: number
          key_b64?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member" | "viewer"
      credential_mode: "static_keys" | "assume_role"
      env_kind: "dev" | "staging" | "prod"
      rule_kind:
        | "prompt_injection"
        | "iam_policy_injection"
        | "schema_poisoning"
        | "secret_leakage"
        | "exfil_pattern"
        | "custom_regex"
        | "semantic_diff"
      severity: "low" | "medium" | "high" | "critical"
      verdict: "allow" | "flag" | "block"
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
    Enums: {
      app_role: ["admin", "member", "viewer"],
      credential_mode: ["static_keys", "assume_role"],
      env_kind: ["dev", "staging", "prod"],
      rule_kind: [
        "prompt_injection",
        "iam_policy_injection",
        "schema_poisoning",
        "secret_leakage",
        "exfil_pattern",
        "custom_regex",
        "semantic_diff",
      ],
      severity: ["low", "medium", "high", "critical"],
      verdict: ["allow", "flag", "block"],
    },
  },
} as const
