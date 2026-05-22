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
      admin_states: {
        Row: {
          job_id: string | null
          phone: string
          step: string
          updated_at: string
        }
        Insert: {
          job_id?: string | null
          phone: string
          step: string
          updated_at?: string
        }
        Update: {
          job_id?: string | null
          phone?: string
          step?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      conversations: {
        Row: {
          context: Json
          created_at: string
          current_job_id: string | null
          customer_phone: string
          id: string
          last_message_at: string
          step: Database["public"]["Enums"]["intake_step"]
          updated_at: string
        }
        Insert: {
          context?: Json
          created_at?: string
          current_job_id?: string | null
          customer_phone: string
          id?: string
          last_message_at?: string
          step?: Database["public"]["Enums"]["intake_step"]
          updated_at?: string
        }
        Update: {
          context?: Json
          created_at?: string
          current_job_id?: string | null
          customer_phone?: string
          id?: string
          last_message_at?: string
          step?: Database["public"]["Enums"]["intake_step"]
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          default_postcode: string | null
          full_name: string | null
          id: string
          last_seen_at: string
          notes: string | null
          phone: string
          total_jobs: number
          updated_at: string
          vehicle_reg: string | null
        }
        Insert: {
          created_at?: string
          default_postcode?: string | null
          full_name?: string | null
          id?: string
          last_seen_at?: string
          notes?: string | null
          phone: string
          total_jobs?: number
          updated_at?: string
          vehicle_reg?: string | null
        }
        Update: {
          created_at?: string
          default_postcode?: string | null
          full_name?: string | null
          id?: string
          last_seen_at?: string
          notes?: string | null
          phone?: string
          total_jobs?: number
          updated_at?: string
          vehicle_reg?: string | null
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
          affected_wheels: string[]
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
          vehicle_reg: string | null
          wheel_type: string | null
        }
        Insert: {
          affected_wheels?: string[]
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
          vehicle_reg?: string | null
          wheel_type?: string | null
        }
        Update: {
          affected_wheels?: string[]
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
          vehicle_reg?: string | null
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
          callout_fee_gbp: number | null
          confidence: string | null
          created_at: string
          eta_minutes: number | null
          id: string
          job_id: string | null
          price_gbp: number | null
          quote_deadline: string | null
          raw_message: string | null
          status: string
          technician_id: string | null
          tyre_condition: string | null
          tyre_included: boolean | null
        }
        Insert: {
          callout_fee_gbp?: number | null
          confidence?: string | null
          created_at?: string
          eta_minutes?: number | null
          id?: string
          job_id?: string | null
          price_gbp?: number | null
          quote_deadline?: string | null
          raw_message?: string | null
          status?: string
          technician_id?: string | null
          tyre_condition?: string | null
          tyre_included?: boolean | null
        }
        Update: {
          callout_fee_gbp?: number | null
          confidence?: string | null
          created_at?: string
          eta_minutes?: number | null
          id?: string
          job_id?: string | null
          price_gbp?: number | null
          quote_deadline?: string | null
          raw_message?: string | null
          status?: string
          technician_id?: string | null
          tyre_condition?: string | null
          tyre_included?: boolean | null
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
      short_links: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          job_id: string | null
          kind: string | null
          target_url: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          job_id?: string | null
          kind?: string | null
          target_url: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          job_id?: string | null
          kind?: string | null
          target_url?: string
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
      tech_onboarding_logs: {
        Row: {
          ai_extracted: Json | null
          channel: string | null
          created_at: string
          detected_intent: string | null
          direction: string
          has_media: boolean
          id: string
          inbound_body: string | null
          media_count: number
          next_status: string | null
          notes: string | null
          phone: string
          prior_status: string | null
          reply_sent: string | null
          route_taken: string
          technician_id: string | null
        }
        Insert: {
          ai_extracted?: Json | null
          channel?: string | null
          created_at?: string
          detected_intent?: string | null
          direction?: string
          has_media?: boolean
          id?: string
          inbound_body?: string | null
          media_count?: number
          next_status?: string | null
          notes?: string | null
          phone: string
          prior_status?: string | null
          reply_sent?: string | null
          route_taken: string
          technician_id?: string | null
        }
        Update: {
          ai_extracted?: Json | null
          channel?: string | null
          created_at?: string
          detected_intent?: string | null
          direction?: string
          has_media?: boolean
          id?: string
          inbound_body?: string | null
          media_count?: number
          next_status?: string | null
          notes?: string | null
          phone?: string
          prior_status?: string | null
          reply_sent?: string | null
          route_taken?: string
          technician_id?: string | null
        }
        Relationships: []
      }
      tech_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
        }
        Relationships: []
      }
      technician_locations: {
        Row: {
          accuracy: number | null
          created_at: string
          expires_at: string
          id: string
          lat: number
          lng: number
          source: string
          technician_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          expires_at: string
          id?: string
          lat: number
          lng: number
          source?: string
          technician_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          lat?: number
          lng?: number
          source?: string
          technician_id?: string
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
          last_lat: number | null
          last_lng: number | null
          last_location_accuracy: number | null
          last_location_at: string | null
          live_location_until: string | null
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
          last_lat?: number | null
          last_lng?: number | null
          last_location_accuracy?: number | null
          last_location_at?: string | null
          live_location_until?: string | null
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
          last_lat?: number | null
          last_lng?: number | null
          last_location_accuracy?: number | null
          last_location_at?: string | null
          live_location_until?: string | null
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
      intake_step:
        | "awaiting_location"
        | "awaiting_plate_confirm"
        | "awaiting_plate"
        | "awaiting_name"
        | "awaiting_description"
        | "awaiting_wheels"
        | "awaiting_photos"
        | "complete"
        | "idle"
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
      intake_step: [
        "awaiting_location",
        "awaiting_plate_confirm",
        "awaiting_plate",
        "awaiting_name",
        "awaiting_description",
        "awaiting_wheels",
        "awaiting_photos",
        "complete",
        "idle",
      ],
    },
  },
} as const
