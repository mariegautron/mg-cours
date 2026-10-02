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
          auto_validated_criterion_ids: string[]
          coefficient: number
          course_id: string | null
          created_at: string
          date: string | null
          deliverable_md: string | null
          duration_minutes: number | null
          evaluated_md: string | null
          experience_note: string | null
          files: Json
          grading_grid_id: string | null
          id: string
          is_group_grade: boolean
          makeup_of_id: string | null
          max_score: number | null
          module_id: string
          objective: string | null
          oral_start_time: string | null
          owner_id: string
          prep_status: Database["public"]["Enums"]["assessment_prep_status"]
          project_id: string | null
          project_position: number | null
          project_role: Database["public"]["Enums"]["project_role"] | null
          results_sent_at: string | null
          subject: string | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          auto_validated_criterion_ids?: string[]
          coefficient?: number
          course_id?: string | null
          created_at?: string
          date?: string | null
          deliverable_md?: string | null
          duration_minutes?: number | null
          evaluated_md?: string | null
          experience_note?: string | null
          files?: Json
          grading_grid_id?: string | null
          id?: string
          is_group_grade?: boolean
          makeup_of_id?: string | null
          max_score?: number | null
          module_id: string
          objective?: string | null
          oral_start_time?: string | null
          owner_id?: string
          prep_status?: Database["public"]["Enums"]["assessment_prep_status"]
          project_id?: string | null
          project_position?: number | null
          project_role?: Database["public"]["Enums"]["project_role"] | null
          results_sent_at?: string | null
          subject?: string | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          auto_validated_criterion_ids?: string[]
          coefficient?: number
          course_id?: string | null
          created_at?: string
          date?: string | null
          deliverable_md?: string | null
          duration_minutes?: number | null
          evaluated_md?: string | null
          experience_note?: string | null
          files?: Json
          grading_grid_id?: string | null
          id?: string
          is_group_grade?: boolean
          makeup_of_id?: string | null
          max_score?: number | null
          module_id?: string
          objective?: string | null
          oral_start_time?: string | null
          owner_id?: string
          prep_status?: Database["public"]["Enums"]["assessment_prep_status"]
          project_id?: string | null
          project_position?: number | null
          project_role?: Database["public"]["Enums"]["project_role"] | null
          results_sent_at?: string | null
          subject?: string | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_grading_grid_id_fkey"
            columns: ["grading_grid_id"]
            isOneToOne: false
            referencedRelation: "grading_grid"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_makeup_of_id_fkey"
            columns: ["makeup_of_id"]
            isOneToOne: false
            referencedRelation: "assessment"
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
            foreignKeyName: "assessment_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "module_project"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_group: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          owner_id: string
          student_group_id: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          owner_id?: string
          student_group_id: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          student_group_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_group_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_group_student_group_id_fkey"
            columns: ["student_group_id"]
            isOneToOne: false
            referencedRelation: "student_group"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_student: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          owner_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          owner_id?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_student_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_student_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      course: {
        Row: {
          animation_notes: string | null
          assessment_notes: string | null
          completion: Database["public"]["Enums"]["course_completion"] | null
          content_last_updated_at: string
          created_at: string
          end_time: string | null
          id: string
          learning_objectives: string[]
          material: string | null
          module_id: string
          next_time: string | null
          not_covered: string | null
          owner_id: string
          position: number
          prep_status: string
          retro_note: string | null
          session_date: string | null
          slides: Json
          start_time: string | null
          title: string
          type: Database["public"]["Enums"]["course_type"]
          updated_at: string
        }
        Insert: {
          animation_notes?: string | null
          assessment_notes?: string | null
          completion?: Database["public"]["Enums"]["course_completion"] | null
          content_last_updated_at?: string
          created_at?: string
          end_time?: string | null
          id?: string
          learning_objectives?: string[]
          material?: string | null
          module_id: string
          next_time?: string | null
          not_covered?: string | null
          owner_id?: string
          position?: number
          prep_status?: string
          retro_note?: string | null
          session_date?: string | null
          slides?: Json
          start_time?: string | null
          title: string
          type?: Database["public"]["Enums"]["course_type"]
          updated_at?: string
        }
        Update: {
          animation_notes?: string | null
          assessment_notes?: string | null
          completion?: Database["public"]["Enums"]["course_completion"] | null
          content_last_updated_at?: string
          created_at?: string
          end_time?: string | null
          id?: string
          learning_objectives?: string[]
          material?: string | null
          module_id?: string
          next_time?: string | null
          not_covered?: string | null
          owner_id?: string
          position?: number
          prep_status?: string
          retro_note?: string | null
          session_date?: string | null
          slides?: Json
          start_time?: string | null
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
      course_expectation: {
        Row: {
          course_id: string
          created_at: string
          expectation_id: string
          id: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          expectation_id: string
          id?: string
          owner_id?: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          expectation_id?: string
          id?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_expectation_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_expectation_expectation_id_fkey"
            columns: ["expectation_id"]
            isOneToOne: false
            referencedRelation: "module_expectation"
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
      criterion_level: {
        Row: {
          created_at: string
          description: string
          grid_criterion_id: string
          id: string
          owner_id: string
          points: number
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          grid_criterion_id: string
          id?: string
          owner_id?: string
          points: number
          position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          grid_criterion_id?: string
          id?: string
          owner_id?: string
          points?: number
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "criterion_level_grid_criterion_id_fkey"
            columns: ["grid_criterion_id"]
            isOneToOne: false
            referencedRelation: "grid_criterion"
            referencedColumns: ["id"]
          },
        ]
      }
      grade: {
        Row: {
          assessment_id: string
          attendance: Database["public"]["Enums"]["attendance_status"]
          created_at: string
          criterion_comments: Json
          feedback: string | null
          id: string
          is_group_grade: boolean
          owner_id: string
          predefined_comment_ids: string[]
          progress: string | null
          scores: Json
          strengths: string | null
          student_group_id: string | null
          student_id: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          assessment_id: string
          attendance?: Database["public"]["Enums"]["attendance_status"]
          created_at?: string
          criterion_comments?: Json
          feedback?: string | null
          id?: string
          is_group_grade?: boolean
          owner_id?: string
          predefined_comment_ids?: string[]
          progress?: string | null
          scores?: Json
          strengths?: string | null
          student_group_id?: string | null
          student_id?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          assessment_id?: string
          attendance?: Database["public"]["Enums"]["attendance_status"]
          created_at?: string
          criterion_comments?: Json
          feedback?: string | null
          id?: string
          is_group_grade?: boolean
          owner_id?: string
          predefined_comment_ids?: string[]
          progress?: string | null
          scores?: Json
          strengths?: string | null
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
      grid_axis: {
        Row: {
          created_at: string
          grading_grid_id: string
          id: string
          label: string
          owner_id: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          grading_grid_id: string
          id?: string
          label: string
          owner_id?: string
          position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          grading_grid_id?: string
          id?: string
          label?: string
          owner_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grid_axis_grading_grid_id_fkey"
            columns: ["grading_grid_id"]
            isOneToOne: false
            referencedRelation: "grading_grid"
            referencedColumns: ["id"]
          },
        ]
      }
      grid_criterion: {
        Row: {
          axis_id: string | null
          created_at: string
          description: string | null
          grading_grid_id: string
          id: string
          is_bonus: boolean
          label: string
          owner_id: string
          position: number
          reference: string | null
          updated_at: string
          weight: number
        }
        Insert: {
          axis_id?: string | null
          created_at?: string
          description?: string | null
          grading_grid_id: string
          id?: string
          is_bonus?: boolean
          label: string
          owner_id?: string
          position?: number
          reference?: string | null
          updated_at?: string
          weight?: number
        }
        Update: {
          axis_id?: string | null
          created_at?: string
          description?: string | null
          grading_grid_id?: string
          id?: string
          is_bonus?: boolean
          label?: string
          owner_id?: string
          position?: number
          reference?: string | null
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "grid_criterion_axis_id_fkey"
            columns: ["axis_id"]
            isOneToOne: false
            referencedRelation: "grid_axis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grid_criterion_grading_grid_id_fkey"
            columns: ["grading_grid_id"]
            isOneToOne: false
            referencedRelation: "grading_grid"
            referencedColumns: ["id"]
          },
        ]
      }
      group_grade_member: {
        Row: {
          attendance: Database["public"]["Enums"]["attendance_status"]
          created_at: string
          grade_id: string
          id: string
          individual_factor: number
          justification: string | null
          owner_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          attendance?: Database["public"]["Enums"]["attendance_status"]
          created_at?: string
          grade_id: string
          id?: string
          individual_factor?: number
          justification?: string | null
          owner_id?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          attendance?: Database["public"]["Enums"]["attendance_status"]
          created_at?: string
          grade_id?: string
          id?: string
          individual_factor?: number
          justification?: string | null
          owner_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_grade_member_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_grade_member_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
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
      import_ref: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          source: string
          source_id: string
          target_id: string
          target_table: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id?: string
          source: string
          source_id: string
          target_id: string
          target_table: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          source?: string
          source_id?: string
          target_id?: string
          target_table?: string
          updated_at?: string
        }
        Relationships: []
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
      invoice_tracking: {
        Row: {
          created_at: string
          id: string
          module_id: string
          owner_id: string
          paid_on: string | null
          sent_on: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_id: string
          owner_id?: string
          paid_on?: string | null
          sent_on?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          module_id?: string
          owner_id?: string
          paid_on?: string | null
          sent_on?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_tracking_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: true
            referencedRelation: "module"
            referencedColumns: ["id"]
          },
        ]
      }
      module: {
        Row: {
          admin_docs: Json
          archived_at: string | null
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
          slides_url: string | null
          start_date: string | null
          student_intro: string | null
          total_hours: number
          updated_at: string
          ycode: string | null
          year: number
        }
        Insert: {
          admin_docs?: Json
          archived_at?: string | null
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
          slides_url?: string | null
          start_date?: string | null
          student_intro?: string | null
          total_hours?: number
          updated_at?: string
          ycode?: string | null
          year: number
        }
        Update: {
          admin_docs?: Json
          archived_at?: string | null
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
          slides_url?: string | null
          start_date?: string | null
          student_intro?: string | null
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
      module_document: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["module_document_kind"]
          mime: string
          module_id: string
          name: string
          owner_id: string
          path: string
          size_bytes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["module_document_kind"]
          mime: string
          module_id: string
          name: string
          owner_id?: string
          path: string
          size_bytes: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["module_document_kind"]
          mime?: string
          module_id?: string
          name?: string
          owner_id?: string
          path?: string
          size_bytes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_document_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module"
            referencedColumns: ["id"]
          },
        ]
      }
      module_expectation: {
        Row: {
          created_at: string
          hours: number | null
          id: string
          kind: Database["public"]["Enums"]["expectation_kind"]
          label: string
          modality: string | null
          module_id: string
          owner_id: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          hours?: number | null
          id?: string
          kind: Database["public"]["Enums"]["expectation_kind"]
          label: string
          modality?: string | null
          module_id: string
          owner_id?: string
          position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          hours?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["expectation_kind"]
          label?: string
          modality?: string | null
          module_id?: string
          owner_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_expectation_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module"
            referencedColumns: ["id"]
          },
        ]
      }
      module_project: {
        Row: {
          brief_md: string
          client_context_md: string
          created_at: string
          id: string
          module_id: string
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          brief_md?: string
          client_context_md?: string
          created_at?: string
          id?: string
          module_id: string
          owner_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          brief_md?: string
          client_context_md?: string
          created_at?: string
          id?: string
          module_id?: string
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_project_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: true
            referencedRelation: "module"
            referencedColumns: ["id"]
          },
        ]
      }
      module_resource: {
        Row: {
          created_at: string
          id: string
          module_id: string
          owner_id: string
          resource_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_id: string
          owner_id?: string
          resource_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          module_id?: string
          owner_id?: string
          resource_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_resource_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_resource_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resource"
            referencedColumns: ["id"]
          },
        ]
      }
      oral_slot: {
        Row: {
          assessment_id: string
          created_at: string
          duration_minutes: number | null
          id: string
          order_method: Database["public"]["Enums"]["oral_order_method"]
          order_seed: string | null
          owner_id: string
          position: number
          status: Database["public"]["Enums"]["oral_slot_status"]
          student_group_id: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          order_method: Database["public"]["Enums"]["oral_order_method"]
          order_seed?: string | null
          owner_id?: string
          position: number
          status?: Database["public"]["Enums"]["oral_slot_status"]
          student_group_id: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          order_method?: Database["public"]["Enums"]["oral_order_method"]
          order_seed?: string | null
          owner_id?: string
          position?: number
          status?: Database["public"]["Enums"]["oral_slot_status"]
          student_group_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oral_slot_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oral_slot_student_group_id_fkey"
            columns: ["student_group_id"]
            isOneToOne: false
            referencedRelation: "student_group"
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
          criterion_label: string | null
          grid_criterion_id: string | null
          id: string
          last_used_at: string | null
          owner_id: string
          subject: string | null
          tags: string[]
          text: string
          updated_at: string
          use_count: number
        }
        Insert: {
          category?: Database["public"]["Enums"]["comment_category"]
          created_at?: string
          criterion_label?: string | null
          grid_criterion_id?: string | null
          id?: string
          last_used_at?: string | null
          owner_id?: string
          subject?: string | null
          tags?: string[]
          text: string
          updated_at?: string
          use_count?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["comment_category"]
          created_at?: string
          criterion_label?: string | null
          grid_criterion_id?: string | null
          id?: string
          last_used_at?: string | null
          owner_id?: string
          subject?: string | null
          tags?: string[]
          text?: string
          updated_at?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "predefined_comment_grid_criterion_id_fkey"
            columns: ["grid_criterion_id"]
            isOneToOne: false
            referencedRelation: "grid_criterion"
            referencedColumns: ["id"]
          },
        ]
      }
      project_submission: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          owner_id: string
          received_on: string
          student_group_id: string
          updated_at: string
          url: string | null
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          owner_id?: string
          received_on: string
          student_group_id: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          received_on?: string
          student_group_id?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_submission_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_submission_student_group_id_fkey"
            columns: ["student_group_id"]
            isOneToOne: false
            referencedRelation: "student_group"
            referencedColumns: ["id"]
          },
        ]
      }
      project_theme: {
        Row: {
          created_at: string
          description_md: string
          id: string
          owner_id: string
          position: number
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_md?: string
          id?: string
          owner_id?: string
          position?: number
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_md?: string
          id?: string
          owner_id?: string
          position?: number
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_theme_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "module_project"
            referencedColumns: ["id"]
          },
        ]
      }
      project_theme_assignment: {
        Row: {
          created_at: string
          draw_seed: string | null
          drawn_at: string | null
          id: string
          method: Database["public"]["Enums"]["theme_assignment_method"]
          owner_id: string
          project_id: string
          student_group_id: string
          theme_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          draw_seed?: string | null
          drawn_at?: string | null
          id?: string
          method: Database["public"]["Enums"]["theme_assignment_method"]
          owner_id?: string
          project_id: string
          student_group_id: string
          theme_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          draw_seed?: string | null
          drawn_at?: string | null
          id?: string
          method?: Database["public"]["Enums"]["theme_assignment_method"]
          owner_id?: string
          project_id?: string
          student_group_id?: string
          theme_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_theme_assignment_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "module_project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_theme_assignment_student_group_id_fkey"
            columns: ["student_group_id"]
            isOneToOne: false
            referencedRelation: "student_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_theme_assignment_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "project_theme"
            referencedColumns: ["id"]
          },
        ]
      }
      projection_event: {
        Row: {
          course_id: string
          created_at: string
          id: string
          kind: string
          owner_id: string
          projected_at: string
          resource_id: string | null
          section_key: string | null
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          kind: string
          owner_id?: string
          projected_at?: string
          resource_id?: string | null
          section_key?: string | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          kind?: string
          owner_id?: string
          projected_at?: string
          resource_id?: string | null
          section_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projection_event_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projection_event_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resource"
            referencedColumns: ["id"]
          },
        ]
      }
      question: {
        Row: {
          archived_at: string | null
          category: string
          created_at: string
          default_points: number
          general_feedback: string
          id: string
          name: string
          numeric_tolerance: number | null
          numeric_value: number | null
          owner_id: string
          statement: string
          tags: string[]
          type: Database["public"]["Enums"]["question_type"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category?: string
          created_at?: string
          default_points?: number
          general_feedback?: string
          id?: string
          name: string
          numeric_tolerance?: number | null
          numeric_value?: number | null
          owner_id?: string
          statement: string
          tags?: string[]
          type: Database["public"]["Enums"]["question_type"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category?: string
          created_at?: string
          default_points?: number
          general_feedback?: string
          id?: string
          name?: string
          numeric_tolerance?: number | null
          numeric_value?: number | null
          owner_id?: string
          statement?: string
          tags?: string[]
          type?: Database["public"]["Enums"]["question_type"]
          updated_at?: string
        }
        Relationships: []
      }
      question_choice: {
        Row: {
          created_at: string
          feedback: string
          fraction: number
          id: string
          is_correct: boolean
          owner_id: string
          position: number
          question_id: string
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feedback?: string
          fraction?: number
          id?: string
          is_correct?: boolean
          owner_id?: string
          position: number
          question_id: string
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feedback?: string
          fraction?: number
          id?: string
          is_correct?: boolean
          owner_id?: string
          position?: number
          question_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_choice_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz: {
        Row: {
          assessment_id: string
          closes_at: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          instructions: string
          opens_at: string | null
          owner_id: string
          show_results: Database["public"]["Enums"]["quiz_results_mode"]
          shuffle_choices: boolean
          shuffle_questions: boolean
          status: Database["public"]["Enums"]["quiz_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          closes_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          instructions?: string
          opens_at?: string | null
          owner_id?: string
          show_results?: Database["public"]["Enums"]["quiz_results_mode"]
          shuffle_choices?: boolean
          shuffle_questions?: boolean
          status?: Database["public"]["Enums"]["quiz_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          closes_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          instructions?: string
          opens_at?: string | null
          owner_id?: string
          show_results?: Database["public"]["Enums"]["quiz_results_mode"]
          shuffle_choices?: boolean
          shuffle_questions?: boolean
          status?: Database["public"]["Enums"]["quiz_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "assessment"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempt: {
        Row: {
          answers: Json
          auto_score: number | null
          calls_count: number
          calls_window_start: string | null
          created_at: string
          deadline_at: string | null
          draw_seed: string
          drawn: Json
          id: string
          last_saved_at: string | null
          late_answers: Json | null
          manual_scores: Json
          owner_id: string
          question_count: number
          quiz_id: string
          result: Json | null
          reused_count: number
          review_complete: boolean
          revoked_at: string | null
          score: number | null
          sent_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["quiz_attempt_status"]
          student_id: string
          submitted_at: string | null
          submitted_late: boolean
          time_multiplier: number
          token_hash: string
          total_points: number
          updated_at: string
          used_at: string | null
        }
        Insert: {
          answers?: Json
          auto_score?: number | null
          calls_count?: number
          calls_window_start?: string | null
          created_at?: string
          deadline_at?: string | null
          draw_seed: string
          drawn: Json
          id?: string
          last_saved_at?: string | null
          late_answers?: Json | null
          manual_scores?: Json
          owner_id?: string
          question_count: number
          quiz_id: string
          result?: Json | null
          reused_count?: number
          review_complete?: boolean
          revoked_at?: string | null
          score?: number | null
          sent_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["quiz_attempt_status"]
          student_id: string
          submitted_at?: string | null
          submitted_late?: boolean
          time_multiplier?: number
          token_hash: string
          total_points: number
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          answers?: Json
          auto_score?: number | null
          calls_count?: number
          calls_window_start?: string | null
          created_at?: string
          deadline_at?: string | null
          draw_seed?: string
          drawn?: Json
          id?: string
          last_saved_at?: string | null
          late_answers?: Json | null
          manual_scores?: Json
          owner_id?: string
          question_count?: number
          quiz_id?: string
          result?: Json | null
          reused_count?: number
          review_complete?: boolean
          revoked_at?: string | null
          score?: number | null
          sent_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["quiz_attempt_status"]
          student_id?: string
          submitted_at?: string | null
          submitted_late?: boolean
          time_multiplier?: number
          token_hash?: string
          total_points?: number
          updated_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempt_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempt_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_draw_rule: {
        Row: {
          category: string | null
          count: number
          created_at: string
          id: string
          owner_id: string
          points_each: number
          position: number
          quiz_id: string
          tags: string[]
          types: Database["public"]["Enums"]["question_type"][]
          updated_at: string
        }
        Insert: {
          category?: string | null
          count: number
          created_at?: string
          id?: string
          owner_id?: string
          points_each: number
          position: number
          quiz_id: string
          tags?: string[]
          types?: Database["public"]["Enums"]["question_type"][]
          updated_at?: string
        }
        Update: {
          category?: string | null
          count?: number
          created_at?: string
          id?: string
          owner_id?: string
          points_each?: number
          position?: number
          quiz_id?: string
          tags?: string[]
          types?: Database["public"]["Enums"]["question_type"][]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_draw_rule_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_ip_failure: {
        Row: {
          failures: number
          ip_hash: string
          window_start: string
        }
        Insert: {
          failures?: number
          ip_hash: string
          window_start?: string
        }
        Update: {
          failures?: number
          ip_hash?: string
          window_start?: string
        }
        Relationships: []
      }
      resource: {
        Row: {
          archived_at: string | null
          audience: Database["public"]["Enums"]["resource_audience"]
          category: string | null
          content: string | null
          created_at: string
          description: string | null
          files: Json
          id: string
          intent_note: string | null
          kind: Database["public"]["Enums"]["resource_kind"] | null
          owner_id: string
          status: Database["public"]["Enums"]["resource_status"]
          tags: string[]
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          archived_at?: string | null
          audience?: Database["public"]["Enums"]["resource_audience"]
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          files?: Json
          id?: string
          intent_note?: string | null
          kind?: Database["public"]["Enums"]["resource_kind"] | null
          owner_id?: string
          status?: Database["public"]["Enums"]["resource_status"]
          tags?: string[]
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          archived_at?: string | null
          audience?: Database["public"]["Enums"]["resource_audience"]
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          files?: Json
          id?: string
          intent_note?: string | null
          kind?: Database["public"]["Enums"]["resource_kind"] | null
          owner_id?: string
          status?: Database["public"]["Enums"]["resource_status"]
          tags?: string[]
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      resource_version: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          description: string | null
          id: string
          owner_id: string
          resource_id: string
          tags: string[]
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string
          resource_id: string
          tags?: string[]
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string
          resource_id?: string
          tags?: string[]
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_version_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resource"
            referencedColumns: ["id"]
          },
        ]
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
          photo_path: string | null
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
          photo_path?: string | null
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
          photo_path?: string | null
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
      student_observation: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          module_id: string
          note: string | null
          owner_id: string
          student_id: string
          tag: Database["public"]["Enums"]["observation_tag"]
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          module_id: string
          note?: string | null
          owner_id?: string
          student_id: string
          tag: Database["public"]["Enums"]["observation_tag"]
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          module_id?: string
          note?: string | null
          owner_id?: string
          student_id?: string
          tag?: Database["public"]["Enums"]["observation_tag"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_observation_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_observation_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_observation_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      student_year: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          scholar_group: string | null
          student_id: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id?: string
          scholar_group?: string | null
          student_id: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          scholar_group?: string | null
          student_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_year_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_profile: {
        Row: {
          activity_number: string | null
          address: string | null
          bank_details: string | null
          created_at: string
          email: string | null
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
          activity_number?: string | null
          address?: string | null
          bank_details?: string | null
          created_at?: string
          email?: string | null
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
          activity_number?: string | null
          address?: string | null
          bank_details?: string | null
          created_at?: string
          email?: string | null
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
      bump_comment_use: { Args: { comment_id: string }; Returns: undefined }
      mg_apply_conventions: {
        Args: { table_names: string[] }
        Returns: undefined
      }
      mg_quiz_clean_answers: {
        Args: { p_answers: Json; p_count: number }
        Returns: Json
      }
      mg_quiz_family_closed: { Args: { p_quiz_id: string }; Returns: boolean }
      mg_quiz_ip_failure: {
        Args: { p_ip_hash: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      mg_quiz_public_questions: { Args: { p_drawn: Json }; Returns: Json }
      mg_quiz_save: {
        Args: { p_answers: Json; p_token_hash: string }
        Returns: Json
      }
      mg_quiz_session: { Args: { p_token_hash: string }; Returns: Json }
      mg_quiz_start: { Args: { p_token_hash: string }; Returns: Json }
      mg_quiz_submit: {
        Args: { p_answers?: Json; p_token_hash: string }
        Returns: Json
      }
      mg_quiz_view: { Args: { p_attempt_id: string }; Returns: Json }
    }
    Enums: {
      assessment_prep_status: "to_build" | "ready" | "provided"
      attendance_status: "present" | "absent_unexcused" | "absent_excused"
      comment_category: "positive" | "negative" | "advice"
      course_completion: "done" | "partial" | "not_done"
      course_resource_role: "primary" | "secondary"
      course_type:
        | "lecture"
        | "workshop"
        | "project"
        | "assessment"
        | "demo"
        | "applied"
      expectation_kind: "objective" | "unit"
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
      module_document_kind:
        | "school_expectations"
        | "outline_sent"
        | "slides"
        | "external_invoice"
      observation_tag:
        | "relevant_question"
        | "participation"
        | "difficulty"
        | "absent_late"
        | "other"
      oral_order_method: "volunteer" | "draw"
      oral_slot_status: "waiting" | "done"
      outline_status: "draft" | "sent" | "validated"
      project_role: "milestone" | "oral" | "individual"
      question_type:
        | "single_choice"
        | "multiple_choice"
        | "true_false"
        | "numerical"
        | "open"
      quiz_attempt_status: "ready" | "in_progress" | "submitted"
      quiz_results_mode: "never" | "after_submit" | "after_close"
      quiz_status: "draft" | "published" | "closed"
      resource_audience: "students" | "teacher"
      resource_kind:
        | "course"
        | "workshop"
        | "project"
        | "template"
        | "answer_key"
        | "question_bank"
        | "reference"
        | "teacher_notes"
      resource_status: "progress" | "ready"
      theme_assignment_method: "volunteer" | "draw"
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
      assessment_prep_status: ["to_build", "ready", "provided"],
      attendance_status: ["present", "absent_unexcused", "absent_excused"],
      comment_category: ["positive", "negative", "advice"],
      course_completion: ["done", "partial", "not_done"],
      course_resource_role: ["primary", "secondary"],
      course_type: [
        "lecture",
        "workshop",
        "project",
        "assessment",
        "demo",
        "applied",
      ],
      expectation_kind: ["objective", "unit"],
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
      module_document_kind: [
        "school_expectations",
        "outline_sent",
        "slides",
        "external_invoice",
      ],
      observation_tag: [
        "relevant_question",
        "participation",
        "difficulty",
        "absent_late",
        "other",
      ],
      oral_order_method: ["volunteer", "draw"],
      oral_slot_status: ["waiting", "done"],
      outline_status: ["draft", "sent", "validated"],
      project_role: ["milestone", "oral", "individual"],
      question_type: [
        "single_choice",
        "multiple_choice",
        "true_false",
        "numerical",
        "open",
      ],
      quiz_attempt_status: ["ready", "in_progress", "submitted"],
      quiz_results_mode: ["never", "after_submit", "after_close"],
      quiz_status: ["draft", "published", "closed"],
      resource_audience: ["students", "teacher"],
      resource_kind: [
        "course",
        "workshop",
        "project",
        "template",
        "answer_key",
        "question_bank",
        "reference",
        "teacher_notes",
      ],
      resource_status: ["progress", "ready"],
      theme_assignment_method: ["volunteer", "draw"],
    },
  },
} as const

