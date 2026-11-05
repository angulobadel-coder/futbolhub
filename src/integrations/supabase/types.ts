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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          id: string
          note: string | null
          player_id: string
          recorded_at: string
          school_id: string
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          id?: string
          note?: string | null
          player_id: string
          recorded_at?: string
          school_id: string
          session_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          id?: string
          note?: string | null
          player_id?: string
          recorded_at?: string
          school_id?: string
          session_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "attendance_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          max_age: number | null
          min_age: number | null
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          max_age?: number | null
          min_age?: number | null
          name: string
          school_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          max_age?: number | null
          min_age?: number | null
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          school_id: string
          specialty: string | null
          status: Database["public"]["Enums"]["coach_status"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          school_id: string
          specialty?: string | null
          status?: Database["public"]["Enums"]["coach_status"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          school_id?: string
          specialty?: string | null
          status?: Database["public"]["Enums"]["coach_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaches_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_matches: {
        Row: {
          away_goals: number | null
          away_penalties: number | null
          away_team_id: string | null
          competition_id: string
          created_at: string
          group_name: string | null
          home_goals: number | null
          home_penalties: number | null
          home_team_id: string | null
          id: string
          school_id: string
          slot: number
          stage: string
        }
        Insert: {
          away_goals?: number | null
          away_penalties?: number | null
          away_team_id?: string | null
          competition_id: string
          created_at?: string
          group_name?: string | null
          home_goals?: number | null
          home_penalties?: number | null
          home_team_id?: string | null
          id?: string
          school_id: string
          slot?: number
          stage: string
        }
        Update: {
          away_goals?: number | null
          away_penalties?: number | null
          away_team_id?: string | null
          competition_id?: string
          created_at?: string
          group_name?: string | null
          home_goals?: number | null
          home_penalties?: number | null
          home_team_id?: string | null
          id?: string
          school_id?: string
          slot?: number
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_matches_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_matches_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_teams: {
        Row: {
          competition_id: string
          created_at: string
          group_name: string | null
          id: string
          name: string
          school_id: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          group_name?: string | null
          id?: string
          name: string
          school_id: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          group_name?: string | null
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_teams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          qualifiers_per_group: number
          school_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          qualifiers_per_group?: number
          school_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          qualifiers_per_group?: number
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category_id: string | null
          created_at: string
          end_time: string | null
          event_date: string
          id: string
          location: string | null
          notes: string | null
          school_id: string
          session_id: string | null
          start_time: string | null
          team_id: string | null
          title: string
          type: Database["public"]["Enums"]["event_type"]
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          end_time?: string | null
          event_date: string
          id?: string
          location?: string | null
          notes?: string | null
          school_id: string
          session_id?: string | null
          start_time?: string | null
          team_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["event_type"]
        }
        Update: {
          category_id?: string | null
          created_at?: string
          end_time?: string | null
          event_date?: string
          id?: string
          location?: string | null
          notes?: string | null
          school_id?: string
          session_id?: string | null
          start_time?: string | null
          team_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          code: string
          created_at: string
          email: string
          expires_at: string
          full_name: string | null
          id: string
          invited_by: string | null
          player_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          school_id: string
          status: Database["public"]["Enums"]["invitation_status"]
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          code: string
          created_at?: string
          email: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          player_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          school_id: string
          status?: Database["public"]["Enums"]["invitation_status"]
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          player_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string
          status?: Database["public"]["Enums"]["invitation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "invitations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          concept: string
          created_at: string
          due_date: string
          id: string
          method: Database["public"]["Enums"]["payment_method"] | null
          note: string | null
          paid_at: string | null
          period: string | null
          player_id: string
          school_id: string
        }
        Insert: {
          amount: number
          concept?: string
          created_at?: string
          due_date: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          note?: string | null
          paid_at?: string | null
          period?: string | null
          player_id: string
          school_id: string
        }
        Update: {
          amount?: number
          concept?: string
          created_at?: string
          due_date?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          note?: string | null
          paid_at?: string | null
          period?: string | null
          player_id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      player_guardians: {
        Row: {
          created_at: string
          id: string
          player_id: string
          relationship: string | null
          school_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          relationship?: string | null
          school_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          relationship?: string | null
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_guardians_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_guardians_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          birth_date: string | null
          category_id: string | null
          created_at: string
          document_id: string | null
          full_name: string
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          joined_at: string
          notes: string | null
          photo_url: string | null
          position: string | null
          school_id: string
          status: Database["public"]["Enums"]["player_status"]
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          category_id?: string | null
          created_at?: string
          document_id?: string | null
          full_name: string
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          joined_at?: string
          notes?: string | null
          photo_url?: string | null
          position?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["player_status"]
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          category_id?: string | null
          created_at?: string
          document_id?: string | null
          full_name?: string
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          joined_at?: string
          notes?: string | null
          photo_url?: string | null
          position?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["player_status"]
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      schools: {
        Row: {
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          category_id: string | null
          coach_id: string | null
          created_at: string
          id: string
          name: string
          school_id: string
          season: string | null
        }
        Insert: {
          category_id?: string | null
          coach_id?: string | null
          created_at?: string
          id?: string
          name: string
          school_id: string
          season?: string | null
        }
        Update: {
          category_id?: string | null
          coach_id?: string | null
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          season?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      training_exercises: {
        Row: {
          created_at: string
          created_by: string | null
          duration_min: number
          id: string
          instructions: string | null
          intensity: string
          kind: string
          materials: string | null
          name: string
          objective: string | null
          school_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_min?: number
          id?: string
          instructions?: string | null
          intensity?: string
          kind?: string
          materials?: string | null
          name: string
          objective?: string | null
          school_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_min?: number
          id?: string
          instructions?: string | null
          intensity?: string
          kind?: string
          materials?: string | null
          name?: string
          objective?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_exercises_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      training_session_drills: {
        Row: {
          created_at: string
          duration_min: number
          exercise_id: string | null
          id: string
          instructions: string | null
          materials: string | null
          name: string
          phase: string
          position: number
          school_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          duration_min?: number
          exercise_id?: string | null
          id?: string
          instructions?: string | null
          materials?: string | null
          name: string
          phase?: string
          position?: number
          school_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          duration_min?: number
          exercise_id?: string | null
          id?: string
          instructions?: string | null
          materials?: string | null
          name?: string
          phase?: string
          position?: number
          school_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_session_drills_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "training_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_drills_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_drills_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_session_feedback: {
        Row: {
          id: string
          intensity: number | null
          needs_work_players: string | null
          notes: string | null
          objective_rating: number | null
          school_id: string
          session_id: string
          standout_players: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          intensity?: number | null
          needs_work_players?: string | null
          notes?: string | null
          objective_rating?: number | null
          school_id: string
          session_id: string
          standout_players?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          intensity?: number | null
          needs_work_players?: string | null
          notes?: string | null
          objective_rating?: number | null
          school_id?: string
          session_id?: string
          standout_players?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_session_feedback_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          category_id: string | null
          coach_id: string | null
          created_at: string
          description: string | null
          end_time: string | null
          id: string
          location: string | null
          objective: string | null
          school_id: string
          session_date: string
          start_time: string
          status: Database["public"]["Enums"]["training_status"]
          team_id: string | null
        }
        Insert: {
          category_id?: string | null
          coach_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          objective?: string | null
          school_id: string
          session_date: string
          start_time: string
          status?: Database["public"]["Enums"]["training_status"]
          team_id?: string | null
        }
        Update: {
          category_id?: string | null
          coach_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          objective?: string | null
          school_id?: string
          session_date?: string
          start_time?: string
          status?: Database["public"]["Enums"]["training_status"]
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_webhook_events: {
        Row: {
          created_at: string
          event_key: string
          event_type: string | null
          field: string
          id: string
          payload: Json
          processed_at: string | null
          school_id: string | null
          wa_id: string | null
        }
        Insert: {
          created_at?: string
          event_key: string
          event_type?: string | null
          field: string
          id?: string
          payload: Json
          processed_at?: string | null
          school_id?: string | null
          wa_id?: string | null
        }
        Update: {
          created_at?: string
          event_key?: string
          event_type?: string | null
          field?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          school_id?: string | null
          wa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_webhook_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_session: { Args: { _session_id: string }; Returns: boolean }
      can_manage_school: { Args: { _school_id: string }; Returns: boolean }
      can_view_player: {
        Args: { _player_id: string; _school_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_player_guardian: { Args: { _player_id: string }; Returns: boolean }
      is_school_director: { Args: { _school_id: string }; Returns: boolean }
      is_school_member: { Args: { _school_id: string }; Returns: boolean }
      is_school_staff: { Args: { _school_id: string }; Returns: boolean }
      is_session_coach: { Args: { _coach_id: string }; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "superadmin" | "director" | "coach" | "guardian" | "player"
      attendance_status: "presente" | "ausente" | "justificado"
      coach_status: "activo" | "inactivo"
      event_type: "entrenamiento" | "partido" | "torneo" | "reunion" | "otro"
      invitation_status: "pendiente" | "aceptada" | "revocada"
      payment_method: "efectivo" | "transferencia" | "tarjeta" | "otro"
      player_status: "activo" | "inactivo" | "suspendido" | "retirado"
      training_status: "programado" | "realizado" | "cancelado"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["superadmin", "director", "coach", "guardian", "player"],
      attendance_status: ["presente", "ausente", "justificado"],
      coach_status: ["activo", "inactivo"],
      event_type: ["entrenamiento", "partido", "torneo", "reunion", "otro"],
      invitation_status: ["pendiente", "aceptada", "revocada"],
      payment_method: ["efectivo", "transferencia", "tarjeta", "otro"],
      player_status: ["activo", "inactivo", "suspendido", "retirado"],
      training_status: ["programado", "realizado", "cancelado"],
    },
  },
} as const
