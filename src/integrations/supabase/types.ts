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
      agent_runs: {
        Row: {
          created_at: string
          current_step: string | null
          engagement_id: string
          finished_at: string | null
          id: string
          kind: Database["public"]["Enums"]["agent_kind"]
          owner_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["agent_status"]
          step_count: number
          transcript: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_step?: string | null
          engagement_id: string
          finished_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["agent_kind"]
          owner_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["agent_status"]
          step_count?: number
          transcript?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_step?: string | null
          engagement_id?: string
          finished_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["agent_kind"]
          owner_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["agent_status"]
          step_count?: number
          transcript?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
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
      engagements: {
        Row: {
          agent_kinds: Database["public"]["Enums"]["agent_kind"][]
          branch: string
          commit_sha: string | null
          created_at: string
          environment_id: string
          finished_at: string | null
          id: string
          name: string
          owner_id: string
          repo_url: string
          runner_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["engagement_status"]
          summary: string | null
          target_url: string | null
          token_usage: number
          updated_at: string
          verdict: Database["public"]["Enums"]["engagement_verdict"]
        }
        Insert: {
          agent_kinds?: Database["public"]["Enums"]["agent_kind"][]
          branch?: string
          commit_sha?: string | null
          created_at?: string
          environment_id: string
          finished_at?: string | null
          id?: string
          name: string
          owner_id: string
          repo_url: string
          runner_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["engagement_status"]
          summary?: string | null
          target_url?: string | null
          token_usage?: number
          updated_at?: string
          verdict?: Database["public"]["Enums"]["engagement_verdict"]
        }
        Update: {
          agent_kinds?: Database["public"]["Enums"]["agent_kind"][]
          branch?: string
          commit_sha?: string | null
          created_at?: string
          environment_id?: string
          finished_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          repo_url?: string
          runner_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["engagement_status"]
          summary?: string | null
          target_url?: string | null
          token_usage?: number
          updated_at?: string
          verdict?: Database["public"]["Enums"]["engagement_verdict"]
        }
        Relationships: [
          {
            foreignKeyName: "engagements_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_runner_id_fkey"
            columns: ["runner_id"]
            isOneToOne: false
            referencedRelation: "runners"
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
      findings: {
        Row: {
          agent_run_id: string | null
          created_at: string
          cwe: string | null
          description: string
          engagement_id: string
          evidence: Json
          id: string
          owner_id: string
          remediation: string | null
          severity: Database["public"]["Enums"]["finding_severity"]
          title: string
        }
        Insert: {
          agent_run_id?: string | null
          created_at?: string
          cwe?: string | null
          description: string
          engagement_id: string
          evidence?: Json
          id?: string
          owner_id: string
          remediation?: string | null
          severity?: Database["public"]["Enums"]["finding_severity"]
          title: string
        }
        Update: {
          agent_run_id?: string | null
          created_at?: string
          cwe?: string | null
          description?: string
          engagement_id?: string
          evidence?: Json
          id?: string
          owner_id?: string
          remediation?: string | null
          severity?: Database["public"]["Enums"]["finding_severity"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "findings_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      job_queue: {
        Row: {
          claimed_at: string | null
          created_at: string
          engagement_id: string
          environment_id: string
          finished_at: string | null
          id: string
          owner_id: string
          payload: Json
          result: Json | null
          runner_id: string | null
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          engagement_id: string
          environment_id: string
          finished_at?: string | null
          id?: string
          owner_id: string
          payload?: Json
          result?: Json | null
          runner_id?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          engagement_id?: string
          environment_id?: string
          finished_at?: string | null
          id?: string
          owner_id?: string
          payload?: Json
          result?: Json | null
          runner_id?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_queue_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_queue_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_queue_runner_id_fkey"
            columns: ["runner_id"]
            isOneToOne: false
            referencedRelation: "runners"
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
      runners: {
        Row: {
          bootstrap_hash: string | null
          created_at: string
          environment_id: string
          id: string
          jobs_completed: number
          last_seen_at: string | null
          name: string
          owner_id: string
          status: Database["public"]["Enums"]["runner_status"]
          token_hash: string
          updated_at: string
        }
        Insert: {
          bootstrap_hash?: string | null
          created_at?: string
          environment_id: string
          id?: string
          jobs_completed?: number
          last_seen_at?: string | null
          name: string
          owner_id: string
          status?: Database["public"]["Enums"]["runner_status"]
          token_hash: string
          updated_at?: string
        }
        Update: {
          bootstrap_hash?: string | null
          created_at?: string
          environment_id?: string
          id?: string
          jobs_completed?: number
          last_seen_at?: string | null
          name?: string
          owner_id?: string
          status?: Database["public"]["Enums"]["runner_status"]
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "runners_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
        ]
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
      agent_kind: "recon" | "authn" | "injection" | "supply_chain"
      agent_status: "pending" | "running" | "complete" | "failed"
      app_role: "admin" | "member" | "viewer"
      engagement_status:
        | "queued"
        | "provisioning"
        | "running"
        | "complete"
        | "failed"
        | "cancelled"
      engagement_verdict: "pending" | "clean" | "issues" | "critical"
      env_kind: "dev" | "staging" | "prod"
      finding_severity: "low" | "medium" | "high" | "critical"
      job_status: "queued" | "claimed" | "complete" | "failed"
      runner_status: "offline" | "online" | "revoked"
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
      agent_kind: ["recon", "authn", "injection", "supply_chain"],
      agent_status: ["pending", "running", "complete", "failed"],
      app_role: ["admin", "member", "viewer"],
      engagement_status: [
        "queued",
        "provisioning",
        "running",
        "complete",
        "failed",
        "cancelled",
      ],
      engagement_verdict: ["pending", "clean", "issues", "critical"],
      env_kind: ["dev", "staging", "prod"],
      finding_severity: ["low", "medium", "high", "critical"],
      job_status: ["queued", "claimed", "complete", "failed"],
      runner_status: ["offline", "online", "revoked"],
    },
  },
} as const
