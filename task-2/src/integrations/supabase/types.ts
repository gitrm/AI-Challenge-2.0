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
      check_ins: {
        Row: {
          checked_in_at: string
          checker_id: string
          id: string
          rsvp_id: string
          undone: boolean
        }
        Insert: {
          checked_in_at?: string
          checker_id: string
          id?: string
          rsvp_id: string
          undone?: boolean
        }
        Update: {
          checked_in_at?: string
          checker_id?: string
          id?: string
          rsvp_id?: string
          undone?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_rsvp_id_fkey"
            columns: ["rsvp_id"]
            isOneToOne: true
            referencedRelation: "rsvps"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number
          cover_image_url: string | null
          created_at: string
          description: string | null
          ends_at: string
          host_id: string
          id: string
          is_paid: boolean
          online_url: string | null
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          time_zone: string
          title: string
          venue_address: string | null
          visibility: Database["public"]["Enums"]["event_visibility"]
        }
        Insert: {
          capacity: number
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          ends_at: string
          host_id: string
          id?: string
          is_paid?: boolean
          online_url?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          time_zone: string
          title: string
          venue_address?: string | null
          visibility?: Database["public"]["Enums"]["event_visibility"]
        }
        Update: {
          capacity?: number
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string
          host_id?: string
          id?: string
          is_paid?: boolean
          online_url?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          time_zone?: string
          title?: string
          venue_address?: string | null
          visibility?: Database["public"]["Enums"]["event_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "events_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          comment: string | null
          created_at: string
          event_id: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          event_id: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          event_id?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_photos: {
        Row: {
          created_at: string
          event_id: string
          id: string
          image_url: string
          status: Database["public"]["Enums"]["gallery_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          image_url: string
          status?: Database["public"]["Enums"]["gallery_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          image_url?: string
          status?: Database["public"]["Enums"]["gallery_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      host_invites: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          host_id: string
          id: string
          role: Database["public"]["Enums"]["host_role"]
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string
          host_id: string
          id?: string
          role: Database["public"]["Enums"]["host_role"]
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          host_id?: string
          id?: string
          role?: Database["public"]["Enums"]["host_role"]
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "host_invites_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      host_members: {
        Row: {
          created_at: string
          host_id: string
          id: string
          role: Database["public"]["Enums"]["host_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          host_id: string
          id?: string
          role: Database["public"]["Enums"]["host_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          host_id?: string
          id?: string
          role?: Database["public"]["Enums"]["host_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_members_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      hosts: {
        Row: {
          bio: string | null
          contact_email: string
          created_at: string
          created_by: string
          id: string
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          bio?: string | null
          contact_email: string
          created_at?: string
          created_by: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          bio?: string | null
          contact_email?: string
          created_at?: string
          created_by?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
        }
        Relationships: []
      }
      rsvps: {
        Row: {
          cancelled_at: string | null
          created_at: string
          event_id: string
          id: string
          promoted_at: string | null
          status: Database["public"]["Enums"]["rsvp_status"]
          ticket_code: string
          user_id: string
          waitlist_position: number | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          promoted_at?: string | null
          status: Database["public"]["Enums"]["rsvp_status"]
          ticket_code?: string
          user_id: string
          waitlist_position?: number | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          promoted_at?: string | null
          status?: Database["public"]["Enums"]["rsvp_status"]
          ticket_code?: string
          user_id?: string
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      event_stats: {
        Row: {
          checked_in_count: number | null
          event_id: string | null
          going_count: number | null
          waitlist_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      cancel_rsvp: { Args: { p_event_id: string }; Returns: undefined }
      compute_event_stats: {
        Args: { p_event_id: string }
        Returns: {
          checked_in_count: number
          event_id: string
          going_count: number
          waitlist_count: number
        }[]
      }
      get_event_online_url: { Args: { p_event_id: string }; Returns: string }
      host_get_attendee_emails: {
        Args: { p_event_id: string }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      host_get_event_online_url: {
        Args: { p_event_id: string }
        Returns: string
      }
      is_host: { Args: { p_host: string }; Returns: boolean }
      is_member: { Args: { p_host: string }; Returns: boolean }
      redeem_invite: {
        Args: { p_token: string }
        Returns: {
          created_at: string
          host_id: string
          id: string
          role: Database["public"]["Enums"]["host_role"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "host_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rsvp_to_event: {
        Args: { p_event_id: string }
        Returns: {
          cancelled_at: string | null
          created_at: string
          event_id: string
          id: string
          promoted_at: string | null
          status: Database["public"]["Enums"]["rsvp_status"]
          ticket_code: string
          user_id: string
          waitlist_position: number | null
        }
        SetofOptions: {
          from: "*"
          to: "rsvps"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      event_status: "draft" | "published"
      event_visibility: "public" | "unlisted"
      gallery_status: "pending" | "approved" | "hidden"
      host_role: "host" | "checker"
      report_status: "open" | "hidden" | "dismissed"
      report_target: "event" | "photo"
      rsvp_status: "going" | "waitlist" | "cancelled"
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
      event_status: ["draft", "published"],
      event_visibility: ["public", "unlisted"],
      gallery_status: ["pending", "approved", "hidden"],
      host_role: ["host", "checker"],
      report_status: ["open", "hidden", "dismissed"],
      report_target: ["event", "photo"],
      rsvp_status: ["going", "waitlist", "cancelled"],
    },
  },
} as const
