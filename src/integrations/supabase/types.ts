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
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      job_allocations: {
        Row: {
          ai_reasoning: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          job_id: string | null
          match_score: number | null
          status: string
          technician_id: string | null
        }
        Insert: {
          ai_reasoning?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          match_score?: number | null
          status?: string
          technician_id?: string | null
        }
        Update: {
          ai_reasoning?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          match_score?: number | null
          status?: string
          technician_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_allocations_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          assigned_technician_id: string | null
          broadcast_count: number
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          damage_confidence: string | null
          damage_summary: string | null
          damage_type: string | null
          dispatch_deadline: string | null
          dispatch_phase: number
          id: string
          is_duplicate: boolean
          issue_description: string | null
          issue_type: string
          lat: number | null
          lng: number | null
          photo_urls: string[]
          platform_fee_paid_at: string | null
          platform_fee_refunded_at: string | null
          platform_fee_status: string
          postcode: string
          region: string | null
          severity: string | null
          status: string
          stripe_checkout_url: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tread_condition: string | null
          tyre_brand: string | null
          tyre_details: string | null
          tyre_size: string | null
          tyre_type: string | null
          updated_at: string
          wheel_type: string | null
        }
        Insert: {
          assigned_technician_id?: string | null
          broadcast_count?: number
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          damage_confidence?: string | null
          damage_summary?: string | null
          damage_type?: string | null
          dispatch_deadline?: string | null
          dispatch_phase?: number
          id?: string
          is_duplicate?: boolean
          issue_description?: string | null
          issue_type: string
          lat?: number | null
          lng?: number | null
          photo_urls?: string[]
          platform_fee_paid_at?: string | null
          platform_fee_refunded_at?: string | null
          platform_fee_status?: string
          postcode: string
          region?: string | null
          severity?: string | null
          status?: string
          stripe_checkout_url?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tread_condition?: string | null
          tyre_brand?: string | null
          tyre_details?: string | null
          tyre_size?: string | null
          tyre_type?: string | null
          updated_at?: string
          wheel_type?: string | null
        }
        Update: {
          assigned_technician_id?: string | null
          broadcast_count?: number
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          damage_confidence?: string | null
          damage_summary?: string | null
          damage_type?: string | null
          dispatch_deadline?: string | null
          dispatch_phase?: number
          id?: string
          is_duplicate?: boolean
          issue_description?: string | null
          issue_type?: string
          lat?: number | null
          lng?: number | null
          photo_urls?: string[]
          platform_fee_paid_at?: string | null
          platform_fee_refunded_at?: string | null
          platform_fee_status?: string
          postcode?: string
          region?: string | null
          severity?: string | null
          status?: string
          stripe_checkout_url?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tread_condition?: string | null
          tyre_brand?: string | null
          tyre_details?: string | null
          tyre_size?: string | null
          tyre_type?: string | null
          updated_at?: string
          wheel_type?: string | null
        }
        Relationships: []
      }
      ops_alerts: {
        Row: {
          body: string | null
          created_at: string
          id: string
          job_id: string | null
          level: string
          read: boolean
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          level?: string
          read?: boolean
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          level?: string
          read?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_alerts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          confidence: string | null
          created_at: string
          eta_minutes: number | null
          id: string
          job_id: string | null
          price_gbp: number | null
          raw_message: string | null
          status: string
          technician_id: string | null
        }
        Insert: {
          confidence?: string | null
          created_at?: string
          eta_minutes?: number | null
          id?: string
          job_id?: string | null
          price_gbp?: number | null
          raw_message?: string | null
          status?: string
          technician_id?: string | null
        }
        Update: {
          confidence?: string | null
          created_at?: string
          eta_minutes?: number | null
          id?: string
          job_id?: string | null
          price_gbp?: number | null
          raw_message?: string | null
          status?: string
          technician_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          job_id: string | null
          score: number
          technician_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          score: number
          technician_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          score?: number
          technician_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_tasks: {
        Row: {
          created_at: string
          done: boolean
          id: string
          kind: string
          payload: Json
          run_at: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          kind: string
          payload?: Json
          run_at: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          kind?: string
          payload?: Json
          run_at?: string
        }
        Relationships: []
      }
      sms_messages: {
        Row: {
          body: string
          channel: string
          created_at: string
          direction: string
          from_number: string
          id: string
          job_id: string | null
          media_urls: string[]
          num_media: number
          status: string
          to_number: string
          twilio_sid: string | null
        }
        Insert: {
          body?: string
          channel?: string
          created_at?: string
          direction: string
          from_number: string
          id?: string
          job_id?: string | null
          media_urls?: string[]
          num_media?: number
          status?: string
          to_number: string
          twilio_sid?: string | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          direction?: string
          from_number?: string
          id?: string
          job_id?: string | null
          media_urls?: string[]
          num_media?: number
          status?: string
          to_number?: string
          twilio_sid?: string | null
        }
        Relationships: []
      }
      technicians: {
        Row: {
          active: boolean
          approval_status: string
          approved_at: string | null
          availability_now: boolean
          available_until: string | null
          created_at: string
          email: string | null
          equipment_photo_urls: string[]
          id: string
          id_doc_url: string | null
          insurance_doc_url: string | null
          jobs_completed: number
          name: string
          notes: string | null
          phone: string
          public_liability_doc_url: string | null
          rating: number | null
          rejected_reason: string | null
          service_postcodes: string[]
          skills: string[]
          travel_radius_miles: number | null
          updated_at: string
          user_id: string | null
          vehicle: string | null
          weekly_schedule: Json
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          approval_status?: string
          approved_at?: string | null
          availability_now?: boolean
          available_until?: string | null
          created_at?: string
          email?: string | null
          equipment_photo_urls?: string[]
          id?: string
          id_doc_url?: string | null
          insurance_doc_url?: string | null
          jobs_completed?: number
          name: string
          notes?: string | null
          phone: string
          public_liability_doc_url?: string | null
          rating?: number | null
          rejected_reason?: string | null
          service_postcodes?: string[]
          skills?: string[]
          travel_radius_miles?: number | null
          updated_at?: string
          user_id?: string | null
          vehicle?: string | null
          weekly_schedule?: Json
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          approval_status?: string
          approved_at?: string | null
          availability_now?: boolean
          available_until?: string | null
          created_at?: string
          email?: string | null
          equipment_photo_urls?: string[]
          id?: string
          id_doc_url?: string | null
          insurance_doc_url?: string | null
          jobs_completed?: number
          name?: string
          notes?: string | null
          phone?: string
          public_liability_doc_url?: string | null
          rating?: number | null
          rejected_reason?: string | null
          service_postcodes?: string[]
          skills?: string[]
          travel_radius_miles?: number | null
          updated_at?: string
          user_id?: string | null
          vehicle?: string | null
          weekly_schedule?: Json
          whatsapp?: string | null
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
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
