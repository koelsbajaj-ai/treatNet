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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      allergy_intolerances: {
        Row: {
          code: string
          code_system: string
          criticality: string
          display: string
          id: string
          patient_id: string
          reaction_text: string | null
        }
        Insert: {
          code: string
          code_system: string
          criticality: string
          display: string
          id?: string
          patient_id: string
          reaction_text?: string | null
        }
        Update: {
          code?: string
          code_system?: string
          criticality?: string
          display?: string
          id?: string
          patient_id?: string
          reaction_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allergy_intolerances_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      conditions: {
        Row: {
          clinical_status: string
          code: string
          code_system: string
          display: string
          id: string
          onset_date: string | null
          patient_id: string
        }
        Insert: {
          clinical_status: string
          code: string
          code_system: string
          display: string
          id?: string
          onset_date?: string | null
          patient_id: string
        }
        Update: {
          clinical_status?: string
          code?: string
          code_system?: string
          display?: string
          id?: string
          onset_date?: string | null
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conditions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      observations: {
        Row: {
          code: string
          code_system: string
          condition_id: string | null
          display: string
          effective_datetime: string
          id: string
          patient_id: string
          unit: string | null
          value_quantity: number | null
          value_text: string | null
        }
        Insert: {
          code: string
          code_system: string
          condition_id?: string | null
          display: string
          effective_datetime: string
          id?: string
          patient_id: string
          unit?: string | null
          value_quantity?: number | null
          value_text?: string | null
        }
        Update: {
          code?: string
          code_system?: string
          condition_id?: string | null
          display?: string
          effective_datetime?: string
          id?: string
          patient_id?: string
          unit?: string | null
          value_quantity?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "observations_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          birth_date: string
          created_at: string
          id: string
          sex: string
          synthetic_ref: string
        }
        Insert: {
          birth_date: string
          created_at?: string
          id?: string
          sex: string
          synthetic_ref: string
        }
        Update: {
          birth_date?: string
          created_at?: string
          id?: string
          sex?: string
          synthetic_ref?: string
        }
        Relationships: []
      }
      treatment_contraindication_rules: {
        Row: {
          id: string
          operator: string | null
          parameter_code: string
          reason: string
          rule_type: string
          threshold_value: number | null
          treatment_code: string
        }
        Insert: {
          id?: string
          operator?: string | null
          parameter_code: string
          reason: string
          rule_type: string
          threshold_value?: number | null
          treatment_code: string
        }
        Update: {
          id?: string
          operator?: string | null
          parameter_code?: string
          reason?: string
          rule_type?: string
          threshold_value?: number | null
          treatment_code?: string
        }
        Relationships: []
      }
      treatment_outcomes: {
        Row: {
          id: string
          notes: string | null
          outcome_code: string
          outcome_date: string
          treatment_id: string
        }
        Insert: {
          id?: string
          notes?: string | null
          outcome_code: string
          outcome_date: string
          treatment_id: string
        }
        Update: {
          id?: string
          notes?: string | null
          outcome_code?: string
          outcome_date?: string
          treatment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_outcomes_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          code: string
          code_system: string
          condition_id: string
          display: string
          end_date: string | null
          id: string
          patient_id: string
          start_date: string
          status: string
          type: string
        }
        Insert: {
          code: string
          code_system: string
          condition_id: string
          display: string
          end_date?: string | null
          id?: string
          patient_id: string
          start_date: string
          status: string
          type: string
        }
        Update: {
          code?: string
          code_system?: string
          condition_id?: string
          display?: string
          end_date?: string | null
          id?: string
          patient_id?: string
          start_date?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatments_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
