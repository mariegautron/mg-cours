export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      assessment: {
        Row: {
          coefficient: number
          created_at: string
          date: string | null
          duration_minutes: number | null
          grading_grid_id: string | null
          id: string
          is_group_grade: boolean
          module_id: string
          owner_id: string
          student_group_id: string | null
          subject: string | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          coefficient?: number
          created_at?: string
          date?: string | null
          duration_minutes?: number | null
          grading_grid_id?: string | null
          id?: string
          is_group_grade?: boolean
          module_id: string
          owner_id?: string
          student_group_id?: string | null
          subject?: string | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          coefficient?: number
          created_at?: string
          date?: string | null
          duration_minutes?: number | null
          grading_grid_id?: string | null
          id?: string
          is_group_grade?: boolean
          module_id?: string
          owner_id?: string
          student_group_id?: string | null
          subject?: string | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_grading_grid_id_fkey"
            columns: ["grading_grid_id"]
            isOneToOne: false
            referencedRelation: "grading_grid"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_student_group_id_fkey"
            columns: ["student_group_id"]
            isOneToOne: false
            referencedRelation: "student_group"
            referencedColumns: ["id"]
          },
        ]
      }
      course: {
        Row: {
          animation_notes: string | null
          assessment_notes: string | null
          content_last_updated_at: string
          created_at: string
          id: string
          learning_objectives: string[]
          material: string | null
          module_id: string
          owner_id: string
          position: number
          prep_status: string
          session_date: string | null
          slides: Json
          title: string
          type: Database["public"]["Enums"]["course_type"]
          updated_at: string
        }
        Insert: {
          animation_notes?: string | null
          assessment_notes?: string | null
          content_last_updated_at?: string
          created_at?: string
          id?: string
          learning_objectives?: string[]
          material?: string | null
          module_id: string
          owner_id?: string
          position?: number
          prep_status?: string
          session_date?: string | null
          slides?: Json
          title: string
          type?: Database["public"]["Enums"]["course_type"]
          updated_at?: string
        }
        Update: {
          animation_notes?: string | null
          assessment_notes?: string | null
          content_last_updated_at?: string
          created_at?: string
          id?: string
          learning_objectives?: string[]
          material?: string | null
          module_id?: string
          owner_id?: string
          position?: number
          prep_status?: string
          session_date?: string | null
          slides?: Json
          title?: string
          type?: Database["public"]["Enums"]["course_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module"
            referencedColumns: ["id"]
          },
        ]
      }
      course_resource: {
        Row: {
          course_id: string
          created_at: string
          id: string
          owner_id: string
          resource_id: string
          role: Database["public"]["Enums"]["course_resource_role"]
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          owner_id?: string
          resource_id: string
          role?: Database["public"]["Enums"]["course_resource_role"]
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          resource_id?: string
          role?: Database["public"]["Enums"]["course_resource_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_resource_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_resource_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resource"
            referencedColumns: ["id"]
          },
        ]
      }
      grade: {
        Row: {
          assessment_id: string
          created_at: string
          feedback: string | null
          id: string
          is_group_grade: boolean
          owner_id: string
          predefined_comment_ids: string[]
          scores: Json
          student_group_id: string | null
          student_id: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          assessment_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          is_group_grade?: boolean
          owner_id?: string
          predefined_comment_ids?: string[]
          scores?: Json
          student_group_id?: string | null
          student_id?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          assessment_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          is_group_grade?: boolean
          owner_id?: string
          predefined_comment_ids?: string[]
          scores?: Json
          student_group_id?: string | null
          student_id?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grade_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_student_group_id_fkey"
            columns: ["student_group_id"]
            isOneToOne: false
            referencedRelation: "student_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_grid: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      grid_criterion: {
        Row: {
          created_at: string
          description: string | null
          grading_grid_id: string
          id: string
          label: string
          owner_id: string
          position: number
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          grading_grid_id: string
          id?: string
          label: string
          owner_id?: string
          position?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          grading_grid_id?: string
          id?: string
          label?: string
          owner_id?: string
          position?: number
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "grid_criterion_grading_grid_id_fkey"
            columns: ["grading_grid_id"]
            isOneToOne: false
            referencedRelation: "grading_grid"
            referencedColumns: ["id"]
          },
        ]
      }
      group_member: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          student_group_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id?: string
          student_group_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          student_group_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_member_student_group_id_fkey"
            columns: ["student_group_id"]
            isOneToOne: false
            referencedRelation: "student_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_member_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice: {
        Row: {
          amount_ex_vat: number
          amount_inc_vat: number
          created_at: string
          due_on: string | null
          hours: number
          id: string
          issued_on: string
          module_id: string
          number: string
          owner_id: string
          paid_on: string | null
          pdf_path: string | null
          purchase_order_ref: string | null
          recipient_email: string | null
          sent_at: string | null
          snapshot: Json | null
          status: Database["public"]["Enums"]["invoice_status"]
          unit_price_ex_vat: number
          updated_at: string
          vat_amount: number
          vat_rate: number
          xml_path: string | null
        }
        Insert: {
          amount_ex_vat?: number
          amount_inc_vat?: number
          created_at?: string
          due_on?: string | null
          hours?: number
          id?: string
          issued_on?: string
          module_id: string
          number: string
          owner_id?: string
          paid_on?: string | null
          pdf_path?: string | null
          purchase_order_ref?: string | null
          recipient_email?: string | null
          sent_at?: string | null
          snapshot?: Json | null
          status?: Database["public"]["Enums"]["invoice_status"]
          unit_price_ex_vat?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
          xml_path?: string | null
        }
        Update: {
          amount_ex_vat?: number
          amount_inc_vat?: number
          created_at?: string
          due_on?: string | null
          hours?: number
          id?: string
          issued_on?: string
          module_id?: string
          number?: string
          owner_id?: string
          paid_on?: string | null
          pdf_path?: string | null
          purchase_order_ref?: string | null
          recipient_email?: string | null
          sent_at?: string | null
          snapshot?: Json | null
          status?: Database["public"]["Enums"]["invoice_status"]
          unit_price_ex_vat?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
          xml_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module"
            referencedColumns: ["id"]
          },
        ]
      }
      module: {
        Row: {
          admin_docs: Json
          created_at: string
          end_date: string | null
          first_session_date: string | null
          hourly_rate: number | null
          hours_lecture: number | null
          hours_td: number | null
          hours_tp: number | null
          iceberg_state: Database["public"]["Enums"]["iceberg_state"]
          id: string
          level: string | null
          name: string
          owner_id: string
          purchase_order_ref: string | null
          school_id: string | null
          start_date: string | null
          total_hours: number
          updated_at: string
          ycode: string | null
          year: number
        }
        Insert: {
          admin_docs?: Json
          created_at?: string
          end_date?: string | null
          first_session_date?: string | null
          hourly_rate?: number | null
          hours_lecture?: number | null
          hours_td?: number | null
          hours_tp?: number | null
          iceberg_state?: Database["public"]["Enums"]["iceberg_state"]
          id?: string
          level?: string | null
          name: string
          owner_id?: string
          purchase_order_ref?: string | null
          school_id?: string | null
          start_date?: string | null
          total_hours?: number
          updated_at?: string
          ycode?: string | null
          year: number
        }
        Update: {
          admin_docs?: Json
          created_at?: string
          end_date?: string | null
          first_session_date?: string | null
          hourly_rate?: number | null
          hours_lecture?: number | null
          hours_td?: number | null
          hours_tp?: number | null
          iceberg_state?: Database["public"]["Enums"]["iceberg_state"]
          id?: string
          level?: string | null
          name?: string
          owner_id?: string
          purchase_order_ref?: string | null
          school_id?: string | null
          start_date?: string | null
          total_hours?: number
          updated_at?: string
          ycode?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "module_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      pedagogical_outline: {
        Row: {
          content: Json
          created_at: string
          generated_at: string
          id: string
          module_id: string
          owner_id: string
          pdf_path: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["outline_status"]
          updated_at: string
          validated_at: string | null
        }
        Insert: {
          content?: Json
          created_at?: string
          generated_at?: string
          id?: string
          module_id: string
          owner_id?: string
          pdf_path?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["outline_status"]
          updated_at?: string
          validated_at?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          generated_at?: string
          id?: string
          module_id?: string
          owner_id?: string
          pdf_path?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["outline_status"]
          updated_at?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedagogical_outline_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: true
            referencedRelation: "module"
            referencedColumns: ["id"]
          },
        ]
      }
      predefined_comment: {
        Row: {
          category: Database["public"]["Enums"]["comment_category"]
          created_at: string
          id: string
          owner_id: string
          tags: string[]
          text: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["comment_category"]
          created_at?: string
          id?: string
          owner_id?: string
          tags?: string[]
          text: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["comment_category"]
          created_at?: string
          id?: string
          owner_id?: string
          tags?: string[]
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      resource: {
        Row: {
          archived_at: string | null
          category: string | null
          content: string | null
          created_at: string
          description: string | null
          files: Json
          id: string
          owner_id: string
          tags: string[]
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          archived_at?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          files?: Json
          id?: string
          owner_id?: string
          tags?: string[]
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          archived_at?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          files?: Json
          id?: string
          owner_id?: string
          tags?: string[]
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      school: {
        Row: {
          address: string | null
          billing_email: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          pa_identifier: string | null
          siret: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          billing_email?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id?: string
          pa_identifier?: string | null
          siret?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          billing_email?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          pa_identifier?: string | null
          siret?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      student: {
        Row: {
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          owner_id: string
          personal_notes: string | null
          photo_url: string | null
          scholar_group: string | null
          student_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          owner_id?: string
          personal_notes?: string | null
          photo_url?: string | null
          scholar_group?: string | null
          student_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          owner_id?: string
          personal_notes?: string | null
          photo_url?: string | null
          scholar_group?: string | null
          student_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      student_group: {
        Row: {
          created_at: string
          id: string
          module_id: string
          name: string
          owner_id: string
          type: Database["public"]["Enums"]["group_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_id: string
          name: string
          owner_id?: string
          type?: Database["public"]["Enums"]["group_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          module_id?: string
          name?: string
          owner_id?: string
          type?: Database["public"]["Enums"]["group_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_group_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_profile: {
        Row: {
          address: string | null
          bank_details: string | null
          created_at: string
          email: string | null
          hourly_rate: number | null
          id: string
          legal_name: string
          owner_id: string
          phone: string | null
          siret: string | null
          updated_at: string
          vat_exempt: boolean
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          bank_details?: string | null
          created_at?: string
          email?: string | null
          hourly_rate?: number | null
          id?: string
          legal_name: string
          owner_id?: string
          phone?: string | null
          siret?: string | null
          updated_at?: string
          vat_exempt?: boolean
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          bank_details?: string | null
          created_at?: string
          email?: string | null
          hourly_rate?: number | null
          id?: string
          legal_name?: string
          owner_id?: string
          phone?: string | null
          siret?: string | null
          updated_at?: string
          vat_exempt?: boolean
          vat_number?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      mg_apply_conventions: {
        Args: { table_names: string[] }
        Returns: undefined
      }
    }
    Enums: {
      comment_category: "positive" | "negative" | "advice"
      course_resource_role: "primary" | "secondary"
      course_type:
        | "lecture"
        | "workshop"
        | "project"
        | "assessment"
        | "demo"
        | "applied"
      group_type: "tp" | "td" | "project"
      iceberg_state:
        | "fiche_received"
        | "module_created"
        | "outline_generated"
        | "plan_on_moodle"
        | "materials_on_moodle"
        | "outline_sent"
        | "subjects_on_moodle"
        | "grades_in_hp"
        | "grades_in_mg"
        | "admin_docs_ok"
        | "invoice_ready"
        | "invoice_sent"
        | "paid"
      invoice_status: "draft" | "ready" | "sent" | "paid"
      outline_status: "draft" | "sent" | "validated"
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
    Enums: {
      comment_category: ["positive", "negative", "advice"],
      course_resource_role: ["primary", "secondary"],
      course_type: [
        "lecture",
        "workshop",
        "project",
        "assessment",
        "demo",
        "applied",
      ],
      group_type: ["tp", "td", "project"],
      iceberg_state: [
        "fiche_received",
        "module_created",
        "outline_generated",
        "plan_on_moodle",
        "materials_on_moodle",
        "outline_sent",
        "subjects_on_moodle",
        "grades_in_hp",
        "grades_in_mg",
        "admin_docs_ok",
        "invoice_ready",
        "invoice_sent",
        "paid",
      ],
      invoice_status: ["draft", "ready", "sent", "paid"],
      outline_status: ["draft", "sent", "validated"],
    },
  },
} as const

