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
      call_participants: {
        Row: {
          call_id: string
          created_at: string
          id: string
          is_muted: boolean | null
          is_video_off: boolean | null
          joined_at: string | null
          left_at: string | null
          read_at: string | null
          role: Database["public"]["Enums"]["call_participant_role"]
          user_id: string
        }
        Insert: {
          call_id: string
          created_at?: string
          id?: string
          is_muted?: boolean | null
          is_video_off?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          read_at?: string | null
          role?: Database["public"]["Enums"]["call_participant_role"]
          user_id: string
        }
        Update: {
          call_id?: string
          created_at?: string
          id?: string
          is_muted?: boolean | null
          is_video_off?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          read_at?: string | null
          role?: Database["public"]["Enums"]["call_participant_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_participants_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      call_signals: {
        Row: {
          call_id: string
          created_at: string
          id: string
          payload: Json
          receiver_id: string
          sender_id: string
          signal_type: string
        }
        Insert: {
          call_id: string
          created_at?: string
          id?: string
          payload: Json
          receiver_id: string
          sender_id: string
          signal_type: string
        }
        Update: {
          call_id?: string
          created_at?: string
          id?: string
          payload?: Json
          receiver_id?: string
          sender_id?: string
          signal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_signals_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          call_type: Database["public"]["Enums"]["call_type"]
          chat_id: string
          created_at: string
          ended_at: string | null
          id: string
          initiator_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["call_status"]
          updated_at: string
        }
        Insert: {
          call_type?: Database["public"]["Enums"]["call_type"]
          chat_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          initiator_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["call_status"]
          updated_at?: string
        }
        Update: {
          call_type?: Database["public"]["Enums"]["call_type"]
          chat_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          initiator_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["call_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
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
      chat_members: {
        Row: {
          chat_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          chat_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_members_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
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
      chats: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          id: string
          is_group: boolean | null
          name: string | null
          school_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean | null
          name?: string | null
          school_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean | null
          name?: string | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_entries: {
        Row: {
          competition_id: string
          correct_answers: number
          created_at: string
          finished_at: string | null
          id: string
          joined_at: string
          score: number
          student_id: string
          time_taken_seconds: number | null
          updated_at: string
        }
        Insert: {
          competition_id: string
          correct_answers?: number
          created_at?: string
          finished_at?: string | null
          id?: string
          joined_at?: string
          score?: number
          student_id: string
          time_taken_seconds?: number | null
          updated_at?: string
        }
        Update: {
          competition_id?: string
          correct_answers?: number
          created_at?: string
          finished_at?: string | null
          id?: string
          joined_at?: string
          score?: number
          student_id?: string
          time_taken_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_entries_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
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
          evaluation_guidelines: string | null
          exam_id: string
          explanation: string | null
          id: string
          key_points: Json | null
          marks: number | null
          options: Json | null
          order_index: number
          question_text: string
          question_type: string
          sample_answer: string | null
          section_id: string | null
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          evaluation_guidelines?: string | null
          exam_id: string
          explanation?: string | null
          id?: string
          key_points?: Json | null
          marks?: number | null
          options?: Json | null
          order_index?: number
          question_text: string
          question_type: string
          sample_answer?: string | null
          section_id?: string | null
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          evaluation_guidelines?: string | null
          exam_id?: string
          explanation?: string | null
          id?: string
          key_points?: Json | null
          marks?: number | null
          options?: Json | null
          order_index?: number
          question_text?: string
          question_type?: string
          sample_answer?: string | null
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
          corrected_answer: string | null
          created_at: string
          feedback: string | null
          grammar_corrections: Json | null
          id: string
          is_correct: boolean | null
          is_evaluated: boolean | null
          key_points_covered: string[] | null
          key_points_missing: string[] | null
          marks_awarded: number | null
          question_id: string
          semantic_score: number | null
          updated_at: string
        }
        Insert: {
          answer?: string | null
          attempt_id: string
          corrected_answer?: string | null
          created_at?: string
          feedback?: string | null
          grammar_corrections?: Json | null
          id?: string
          is_correct?: boolean | null
          is_evaluated?: boolean | null
          key_points_covered?: string[] | null
          key_points_missing?: string[] | null
          marks_awarded?: number | null
          question_id: string
          semantic_score?: number | null
          updated_at?: string
        }
        Update: {
          answer?: string | null
          attempt_id?: string
          corrected_answer?: string | null
          created_at?: string
          feedback?: string | null
          grammar_corrections?: Json | null
          id?: string
          is_correct?: boolean | null
          is_evaluated?: boolean | null
          key_points_covered?: string[] | null
          key_points_missing?: string[] | null
          marks_awarded?: number | null
          question_id?: string
          semantic_score?: number | null
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
          {
            foreignKeyName: "exam_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exam_questions_student_view"
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
          assigned_class: string | null
          closes_at: string | null
          created_at: string
          description: string | null
          difficulty_level: string | null
          id: string
          instructions: string | null
          is_premium: boolean | null
          is_published: boolean | null
          opens_at: string | null
          proctoring_settings: Json
          subject: string | null
          teacher_id: string
          time_limit_minutes: number | null
          title: string
          total_marks: number | null
          updated_at: string
        }
        Insert: {
          assigned_class?: string | null
          closes_at?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          id?: string
          instructions?: string | null
          is_premium?: boolean | null
          is_published?: boolean | null
          opens_at?: string | null
          proctoring_settings?: Json
          subject?: string | null
          teacher_id: string
          time_limit_minutes?: number | null
          title: string
          total_marks?: number | null
          updated_at?: string
        }
        Update: {
          assigned_class?: string | null
          closes_at?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          id?: string
          instructions?: string | null
          is_premium?: boolean | null
          is_published?: boolean | null
          opens_at?: string | null
          proctoring_settings?: Json
          subject?: string | null
          teacher_id?: string
          time_limit_minutes?: number | null
          title?: string
          total_marks?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      file_metadata: {
        Row: {
          chat_id: string
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          message_id: string | null
          mime_type: string | null
          storage_path: string
          thumbnail_path: string | null
          uploader_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          message_id?: string | null
          mime_type?: string | null
          storage_path: string
          thumbnail_path?: string | null
          uploader_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          message_id?: string | null
          mime_type?: string | null
          storage_path?: string
          thumbnail_path?: string | null
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_metadata_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_metadata_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      live_participants: {
        Row: {
          id: string
          is_muted: boolean | null
          is_video_off: boolean | null
          joined_at: string
          left_at: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_muted?: boolean | null
          is_video_off?: boolean | null
          joined_at?: string
          left_at?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_muted?: boolean | null
          is_video_off?: boolean | null
          joined_at?: string
          left_at?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          chat_id: string
          created_at: string
          ended_at: string | null
          host_id: string
          id: string
          session_type: string
          started_at: string
          status: string
          title: string | null
        }
        Insert: {
          chat_id: string
          created_at?: string
          ended_at?: string | null
          host_id: string
          id?: string
          session_type?: string
          started_at?: string
          status?: string
          title?: string | null
        }
        Update: {
          chat_id?: string
          created_at?: string
          ended_at?: string | null
          host_id?: string
          id?: string
          session_type?: string
          started_at?: string
          status?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
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
      mentor_enrollments: {
        Row: {
          created_at: string
          id: string
          mentor_id: string
          message: string
          responded_at: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentor_id: string
          message?: string
          responded_at?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mentor_id?: string
          message?: string
          responded_at?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string
          content: string | null
          created_at: string
          deleted_for_everyone: boolean | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_deleted: boolean | null
          message_type: Database["public"]["Enums"]["message_type"] | null
          sender_id: string
          status: Database["public"]["Enums"]["message_status"] | null
          updated_at: string
        }
        Insert: {
          chat_id: string
          content?: string | null
          created_at?: string
          deleted_for_everyone?: boolean | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean | null
          message_type?: Database["public"]["Enums"]["message_type"] | null
          sender_id: string
          status?: Database["public"]["Enums"]["message_status"] | null
          updated_at?: string
        }
        Update: {
          chat_id?: string
          content?: string | null
          created_at?: string
          deleted_for_everyone?: boolean | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean | null
          message_type?: Database["public"]["Enums"]["message_type"] | null
          sender_id?: string
          status?: Database["public"]["Enums"]["message_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
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
      school_members: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          member_role: string
          school_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          member_role: string
          school_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          member_role?: string
          school_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_members_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          contact_email: string
          created_at: string
          created_by: string
          district: string
          education_levels: string[]
          id: string
          is_active: boolean
          join_code: string
          name: string
          phone: string
          province: string
          updated_at: string
        }
        Insert: {
          contact_email?: string
          created_at?: string
          created_by: string
          district?: string
          education_levels?: string[]
          id?: string
          is_active?: boolean
          join_code: string
          name: string
          phone?: string
          province?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string
          created_at?: string
          created_by?: string
          district?: string
          education_levels?: string[]
          id?: string
          is_active?: boolean
          join_code?: string
          name?: string
          phone?: string
          province?: string
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
      user_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_active_date: string | null
          longest_streak: number
          total_active_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_active_date?: string | null
          longest_streak?: number
          total_active_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_active_date?: string | null
          longest_streak?: number
          total_active_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webrtc_signals: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          session_id: string
          signal_data: Json
          signal_type: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          session_id: string
          signal_data: Json
          signal_type: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          session_id?: string
          signal_data?: Json
          signal_type?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webrtc_signals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      exam_questions_student_view: {
        Row: {
          correct_answer: string | null
          created_at: string | null
          exam_id: string | null
          explanation: string | null
          id: string | null
          marks: number | null
          options: Json | null
          order_index: number | null
          question_text: string | null
          question_type: string | null
          section_id: string | null
        }
        Insert: {
          correct_answer?: never
          created_at?: string | null
          exam_id?: string | null
          explanation?: never
          id?: string | null
          marks?: number | null
          options?: Json | null
          order_index?: number | null
          question_text?: string | null
          question_type?: string | null
          section_id?: string | null
        }
        Update: {
          correct_answer?: never
          created_at?: string | null
          exam_id?: string | null
          explanation?: never
          id?: string | null
          marks?: number | null
          options?: Json | null
          order_index?: number | null
          question_text?: string | null
          question_type?: string | null
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
    }
    Functions: {
      evaluate_exam_responses: {
        Args: { p_attempt_id: string; p_responses: Json }
        Returns: Json
      }
      generate_school_code: { Args: never; Returns: string }
      get_exam_questions_for_student: {
        Args: { _exam_id: string }
        Returns: {
          id: string
          marks: number
          options: Json
          order_index: number
          question_text: string
          question_type: string
          section_id: string
        }[]
      }
      get_mentor_enrollment_requests: {
        Args: never
        Returns: {
          created_at: string
          id: string
          message: string
          status: string
          student_id: string
          student_name: string
        }[]
      }
      get_quiz_questions_for_student: {
        Args: { _quiz_id: string }
        Returns: {
          id: string
          options: Json
          order_index: number
          points: number
          question_text: string
          question_type: string
        }[]
      }
      get_school_roster: {
        Args: { _school_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          member_id: string
          member_role: string
          status: string
          user_id: string
        }[]
      }
      get_user_display_name: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_school: { Args: { _user_id: string }; Returns: string }
      has_completed_exam: {
        Args: { exam_id_param: string; user_id_param?: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_school_member: {
        Args: { _school_id: string; _user_id: string }
        Returns: boolean
      }
      is_chat_member: {
        Args: { _chat_id: string; _user_id: string }
        Returns: boolean
      }
      is_school_admin: {
        Args: { _school_id: string; _user_id: string }
        Returns: boolean
      }
      join_school_by_code: {
        Args: { _code: string; _member_role: string }
        Returns: Json
      }
      list_mentors: {
        Args: never
        Returns: {
          district: string
          full_name: string
          organization_name: string
          province: string
          role_description: string
          subjects_taught: string[]
          user_id: string
        }[]
      }
      lookup_school_by_code: {
        Args: { _code: string }
        Returns: {
          district: string
          id: string
          name: string
          province: string
        }[]
      }
      register_school: {
        Args: {
          _contact_email: string
          _district: string
          _education_levels: string[]
          _name: string
          _phone: string
          _province: string
        }
        Returns: Json
      }
      respond_mentor_enrollment: {
        Args: { _enrollment_id: string; _status: string }
        Returns: Json
      }
      set_school_member_status: {
        Args: { _member_id: string; _status: string }
        Returns: Json
      }
      submit_quiz_responses: {
        Args: { _responses: Json; _session_id: string }
        Returns: Json
      }
      touch_user_streak: {
        Args: never
        Returns: {
          created_at: string
          current_streak: number
          id: string
          last_active_date: string | null
          longest_streak: number
          total_active_days: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_streaks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "student" | "teacher" | "other" | "mentor" | "school_admin"
      call_participant_role: "host" | "participant"
      call_status:
        | "initiated"
        | "ringing"
        | "accepted"
        | "rejected"
        | "in_progress"
        | "ended"
        | "cancelled"
        | "missed"
      call_type: "voice" | "video" | "live"
      message_status: "sent" | "delivered" | "read"
      message_type: "text" | "image" | "file"
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
      app_role: ["student", "teacher", "other", "mentor", "school_admin"],
      call_participant_role: ["host", "participant"],
      call_status: [
        "initiated",
        "ringing",
        "accepted",
        "rejected",
        "in_progress",
        "ended",
        "cancelled",
        "missed",
      ],
      call_type: ["voice", "video", "live"],
      message_status: ["sent", "delivered", "read"],
      message_type: ["text", "image", "file"],
    },
  },
} as const
