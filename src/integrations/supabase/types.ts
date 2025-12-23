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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      chat_channels: {
        Row: {
          channel_type: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_premium: boolean | null
          name: string
          school_name: string | null
        }
        Insert: {
          channel_type: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_premium?: boolean | null
          name: string
          school_name?: string | null
        }
        Update: {
          channel_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_premium?: boolean | null
          name?: string
          school_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          channel_id: string
          created_at: string
          file_url: string | null
          id: string
          message: string
          message_type: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          file_url?: string | null
          id?: string
          message: string
          message_type?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          file_url?: string | null
          id?: string
          message?: string
          message_type?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          created_at: string
          description: string | null
          end_time: string
          entry_fee: number | null
          id: string
          is_premium: boolean | null
          max_participants: number | null
          organizer_id: string
          prize_pool: number | null
          start_time: string
          status: string | null
          subject: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time: string
          entry_fee?: number | null
          id?: string
          is_premium?: boolean | null
          max_participants?: number | null
          organizer_id: string
          prize_pool?: number | null
          start_time: string
          status?: string | null
          subject?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string
          entry_fee?: number | null
          id?: string
          is_premium?: boolean | null
          max_participants?: number | null
          organizer_id?: string
          prize_pool?: number | null
          start_time?: string
          status?: string | null
          subject?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitions_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      course_modules: {
        Row: {
          content_type: string
          content_url: string | null
          course_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_published: boolean | null
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          content_type: string
          content_url?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          order_index: number
          title: string
          updated_at?: string
        }
        Update: {
          content_type?: string
          content_url?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string
          id: string
          modules_completed: number | null
          progress_percentage: number | null
          started_at: string
          student_id: string
          total_modules: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string
          id?: string
          modules_completed?: number | null
          progress_percentage?: number | null
          started_at?: string
          student_id: string
          total_modules?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string
          id?: string
          modules_completed?: number | null
          progress_percentage?: number | null
          started_at?: string
          student_id?: string
          total_modules?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          difficulty_level: string | null
          duration_weeks: number | null
          id: string
          is_premium: boolean | null
          is_published: boolean | null
          price: number | null
          subject: string | null
          teacher_id: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          duration_weeks?: number | null
          id?: string
          is_premium?: boolean | null
          is_published?: boolean | null
          price?: number | null
          subject?: string | null
          teacher_id: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          duration_weeks?: number | null
          id?: string
          is_premium?: boolean | null
          is_published?: boolean | null
          price?: number | null
          subject?: string | null
          teacher_id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          created_at: string
          exam_id: string
          id: string
          max_score: number | null
          percentage: number | null
          started_at: string
          status: string
          student_id: string
          submitted_at: string | null
          time_remaining_seconds: number | null
          total_score: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          id?: string
          max_score?: number | null
          percentage?: number | null
          started_at?: string
          status?: string
          student_id: string
          submitted_at?: string | null
          time_remaining_seconds?: number | null
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          id?: string
          max_score?: number | null
          percentage?: number | null
          started_at?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          time_remaining_seconds?: number | null
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          correct_answer: string | null
          created_at: string
          exam_id: string
          explanation: string | null
          id: string
          marks: number | null
          options: Json | null
          order_index: number
          question_text: string
          question_type: string
          section_id: string | null
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          exam_id: string
          explanation?: string | null
          id?: string
          marks?: number | null
          options?: Json | null
          order_index?: number
          question_text: string
          question_type: string
          section_id?: string | null
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          exam_id?: string
          explanation?: string | null
          id?: string
          marks?: number | null
          options?: Json | null
          order_index?: number
          question_text?: string
          question_type?: string
          section_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "exam_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_responses: {
        Row: {
          answer: string | null
          attempt_id: string
          created_at: string
          feedback: string | null
          id: string
          is_correct: boolean | null
          is_evaluated: boolean | null
          marks_awarded: number | null
          question_id: string
          updated_at: string
        }
        Insert: {
          answer?: string | null
          attempt_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          is_correct?: boolean | null
          is_evaluated?: boolean | null
          marks_awarded?: number | null
          question_id: string
          updated_at?: string
        }
        Update: {
          answer?: string | null
          attempt_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          is_correct?: boolean | null
          is_evaluated?: boolean | null
          marks_awarded?: number | null
          question_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exam_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_sections: {
        Row: {
          created_at: string
          description: string | null
          exam_id: string
          id: string
          instructions: string | null
          marks_per_question: number | null
          negative_marking: number | null
          order_index: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          exam_id: string
          id?: string
          instructions?: string | null
          marks_per_question?: number | null
          negative_marking?: number | null
          order_index?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          exam_id?: string
          id?: string
          instructions?: string | null
          marks_per_question?: number | null
          negative_marking?: number | null
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_sections_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          description: string | null
          difficulty_level: string | null
          id: string
          instructions: string | null
          is_premium: boolean | null
          is_published: boolean | null
          subject: string | null
          teacher_id: string
          time_limit_minutes: number | null
          title: string
          total_marks: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          id?: string
          instructions?: string | null
          is_premium?: boolean | null
          is_published?: boolean | null
          subject?: string | null
          teacher_id: string
          time_limit_minutes?: number | null
          title: string
          total_marks?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          id?: string
          instructions?: string | null
          is_premium?: boolean | null
          is_published?: boolean | null
          subject?: string | null
          teacher_id?: string
          time_limit_minutes?: number | null
          title?: string
          total_marks?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      mcq_scans: {
        Row: {
          answer_key: Json
          created_at: string
          id: string
          image_url: string
          quiz_id: string | null
          results: Json | null
          scan_name: string
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          answer_key: Json
          created_at?: string
          id?: string
          image_url: string
          quiz_id?: string | null
          results?: Json | null
          scan_name: string
          status?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          answer_key?: Json
          created_at?: string
          id?: string
          image_url?: string
          quiz_id?: string | null
          results?: Json | null
          scan_name?: string
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcq_scans_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          combination_department: string | null
          created_at: string
          district: string | null
          education_level: string | null
          education_level_taught: string | null
          email: string
          full_name: string | null
          id: string
          organization_name: string | null
          province: string | null
          role: string
          role_description: string | null
          school_name: string | null
          subjects_taught: string[] | null
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          combination_department?: string | null
          created_at?: string
          district?: string | null
          education_level?: string | null
          education_level_taught?: string | null
          email: string
          full_name?: string | null
          id?: string
          organization_name?: string | null
          province?: string | null
          role: string
          role_description?: string | null
          school_name?: string | null
          subjects_taught?: string[] | null
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          combination_department?: string | null
          created_at?: string
          district?: string | null
          education_level?: string | null
          education_level_taught?: string | null
          email?: string
          full_name?: string | null
          id?: string
          organization_name?: string | null
          province?: string | null
          role?: string
          role_description?: string | null
          school_name?: string | null
          subjects_taught?: string[] | null
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string
          explanation: string | null
          id: string
          options: Json | null
          order_index: number
          points: number | null
          question_text: string
          question_type: string
          quiz_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index: number
          points?: number | null
          question_text: string
          question_type: string
          quiz_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index?: number
          points?: number | null
          question_text?: string
          question_type?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_responses: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string
          session_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id: string
          session_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          quiz_id: string
          score: number | null
          started_at: string
          status: string
          student_id: string
          total_questions: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          quiz_id: string
          score?: number | null
          started_at?: string
          status?: string
          student_id: string
          total_questions?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          quiz_id?: string
          score?: number | null
          started_at?: string
          status?: string
          student_id?: string
          total_questions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          description: string | null
          difficulty_level: string | null
          id: string
          is_premium: boolean | null
          is_published: boolean | null
          subject: string | null
          teacher_id: string
          time_limit: number | null
          title: string
          total_questions: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          id?: string
          is_premium?: boolean | null
          is_published?: boolean | null
          subject?: string | null
          teacher_id: string
          time_limit?: number | null
          title: string
          total_questions?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          id?: string
          is_premium?: boolean | null
          is_published?: boolean | null
          subject?: string | null
          teacher_id?: string
          time_limit?: number | null
          title?: string
          total_questions?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "teacher" | "other"
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
      app_role: ["student", "teacher", "other"],
    },
  },
} as const
