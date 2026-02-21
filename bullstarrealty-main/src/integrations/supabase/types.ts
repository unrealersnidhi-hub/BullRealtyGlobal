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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analytics_integrations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          provider: string
          tracking_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          provider: string
          tracking_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          provider?: string
          tracking_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          api_key: string
          created_at: string
          created_by: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          request_count: number
          source: Database["public"]["Enums"]["integration_source"]
        }
        Insert: {
          api_key: string
          created_at?: string
          created_by: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name: string
          request_count?: number
          source?: Database["public"]["Enums"]["integration_source"]
        }
        Update: {
          api_key?: string
          created_at?: string
          created_by?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          request_count?: number
          source?: Database["public"]["Enums"]["integration_source"]
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in: string | null
          check_in_latitude: number | null
          check_in_longitude: number | null
          check_in_method: string | null
          check_out: string | null
          created_at: string
          date: string
          employee_id: string
          geofence_verified: boolean | null
          id: string
          notes: string | null
          status: string | null
          work_hours: number | null
        }
        Insert: {
          check_in?: string | null
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_in_method?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          employee_id: string
          geofence_verified?: boolean | null
          id?: string
          notes?: string | null
          status?: string | null
          work_hours?: number | null
        }
        Update: {
          check_in?: string | null
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_in_method?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          geofence_verified?: boolean | null
          id?: string
          notes?: string | null
          status?: string | null
          work_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      automated_report_schedules: {
        Row: {
          cc_emails: string[]
          created_at: string
          created_by: string
          frequency: string
          id: string
          include_call_stats: boolean
          include_conversion: boolean
          include_lead_stats: boolean
          include_performance: boolean
          is_active: boolean
          last_sent_at: string | null
          name: string
          recipient_emails: string[]
          report_type: string
          send_time: string
          updated_at: string
        }
        Insert: {
          cc_emails?: string[]
          created_at?: string
          created_by: string
          frequency?: string
          id?: string
          include_call_stats?: boolean
          include_conversion?: boolean
          include_lead_stats?: boolean
          include_performance?: boolean
          is_active?: boolean
          last_sent_at?: string | null
          name: string
          recipient_emails?: string[]
          report_type?: string
          send_time?: string
          updated_at?: string
        }
        Update: {
          cc_emails?: string[]
          created_at?: string
          created_by?: string
          frequency?: string
          id?: string
          include_call_stats?: boolean
          include_conversion?: boolean
          include_lead_stats?: boolean
          include_performance?: boolean
          is_active?: boolean
          last_sent_at?: string | null
          name?: string
          recipient_emails?: string[]
          report_type?: string
          send_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      blogs: {
        Row: {
          author_id: string
          category_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_id: string
          category_id?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string
          category_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blogs_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "blogs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          callback_scheduled_at: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          lead_id: string
          notes: string | null
          outcome: Database["public"]["Enums"]["call_outcome"]
          user_id: string
        }
        Insert: {
          callback_scheduled_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lead_id: string
          notes?: string | null
          outcome: Database["public"]["Enums"]["call_outcome"]
          user_id: string
        }
        Update: {
          callback_scheduled_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lead_id?: string
          notes?: string | null
          outcome?: Database["public"]["Enums"]["call_outcome"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          approval_notes: string | null
          approval_requested_from: string | null
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          category: string | null
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          lead_id: string | null
          status: string | null
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          approval_notes?: string | null
          approval_requested_from?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          lead_id?: string | null
          status?: string | null
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          approval_notes?: string | null
          approval_requested_from?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          lead_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notification_rules: {
        Row: {
          cc_emails: string[]
          created_at: string
          created_by: string
          description: string | null
          email_subject_template: string | null
          event_type: string
          id: string
          is_active: boolean
          name: string
          priority: string
          send_to_admin: boolean
          send_to_assignee: boolean
          updated_at: string
        }
        Insert: {
          cc_emails?: string[]
          created_at?: string
          created_by: string
          description?: string | null
          email_subject_template?: string | null
          event_type: string
          id?: string
          is_active?: boolean
          name: string
          priority?: string
          send_to_admin?: boolean
          send_to_assignee?: boolean
          updated_at?: string
        }
        Update: {
          cc_emails?: string[]
          created_at?: string
          created_by?: string
          description?: string | null
          email_subject_template?: string | null
          event_type?: string
          id?: string
          is_active?: boolean
          name?: string
          priority?: string
          send_to_admin?: boolean
          send_to_assignee?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          address: string | null
          country: Database["public"]["Enums"]["country_code"] | null
          created_at: string
          date_of_birth: string | null
          date_of_joining: string | null
          department: string | null
          designation: string | null
          email: string
          emergency_contact: string | null
          employee_code: string | null
          employment_status: string | null
          full_name: string
          id: string
          phone: string | null
          salary: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          country?: Database["public"]["Enums"]["country_code"] | null
          created_at?: string
          date_of_birth?: string | null
          date_of_joining?: string | null
          department?: string | null
          designation?: string | null
          email: string
          emergency_contact?: string | null
          employee_code?: string | null
          employment_status?: string | null
          full_name: string
          id?: string
          phone?: string | null
          salary?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          country?: Database["public"]["Enums"]["country_code"] | null
          created_at?: string
          date_of_birth?: string | null
          date_of_joining?: string | null
          department?: string | null
          designation?: string | null
          email?: string
          emergency_contact?: string | null
          employee_code?: string | null
          employment_status?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          salary?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      follow_ups: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          follow_up_type: string | null
          id: string
          lead_id: string
          scheduled_at: string
          stage: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          follow_up_type?: string | null
          id?: string
          lead_id: string
          scheduled_at: string
          stage?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          follow_up_type?: string | null
          id?: string
          lead_id?: string
          scheduled_at?: string
          stage?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      geofence_locations: {
        Row: {
          country: Database["public"]["Enums"]["country_code"] | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          radius_meters: number
          updated_at: string
        }
        Insert: {
          country?: Database["public"]["Enums"]["country_code"] | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          radius_meters?: number
          updated_at?: string
        }
        Update: {
          country?: Database["public"]["Enums"]["country_code"] | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          radius_meters?: number
          updated_at?: string
        }
        Relationships: []
      }
      integration_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          integration_id: string
          integration_type: string
          ip_address: string | null
          lead_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          source: Database["public"]["Enums"]["integration_source"]
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          integration_id: string
          integration_type: string
          ip_address?: string | null
          lead_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          source: Database["public"]["Enums"]["integration_source"]
          status: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          integration_id?: string
          integration_type?: string
          ip_address?: string | null
          lead_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          source?: Database["public"]["Enums"]["integration_source"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          lead_id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignees: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          lead_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          lead_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          lead_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignees_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignment_history: {
        Row: {
          assigned_by: string | null
          assigned_from: string | null
          assigned_to: string | null
          created_at: string
          id: string
          lead_id: string
          notes: string | null
        }
        Insert: {
          assigned_by?: string | null
          assigned_from?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
        }
        Update: {
          assigned_by?: string | null
          assigned_from?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignment_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_interest_tags: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          tag: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          tag: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_interest_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          lead_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lead_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          country: Database["public"]["Enums"]["country_code"] | null
          created_at: string
          email: string
          full_name: string
          id: string
          interest: string | null
          message: string | null
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          country?: Database["public"]["Enums"]["country_code"] | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          interest?: string | null
          message?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          country?: Database["public"]["Enums"]["country_code"] | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          interest?: string | null
          message?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          employee_id: string
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      mcube_call_records: {
        Row: {
          agent_name: string | null
          agent_phone: string | null
          answered_time: string | null
          call_id: string
          created_at: string
          customer_phone: string | null
          dial_status: string | null
          did_number: string | null
          direction: string
          disconnected_by: string | null
          duration_seconds: number | null
          end_time: string | null
          group_name: string | null
          id: string
          matched_lead_id: string | null
          matched_user_id: string | null
          raw_payload: Json | null
          recording_url: string | null
          ref_id: string | null
          start_time: string | null
        }
        Insert: {
          agent_name?: string | null
          agent_phone?: string | null
          answered_time?: string | null
          call_id: string
          created_at?: string
          customer_phone?: string | null
          dial_status?: string | null
          did_number?: string | null
          direction: string
          disconnected_by?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          group_name?: string | null
          id?: string
          matched_lead_id?: string | null
          matched_user_id?: string | null
          raw_payload?: Json | null
          recording_url?: string | null
          ref_id?: string | null
          start_time?: string | null
        }
        Update: {
          agent_name?: string | null
          agent_phone?: string | null
          answered_time?: string | null
          call_id?: string
          created_at?: string
          customer_phone?: string | null
          dial_status?: string | null
          did_number?: string | null
          direction?: string
          disconnected_by?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          group_name?: string | null
          id?: string
          matched_lead_id?: string | null
          matched_user_id?: string | null
          raw_payload?: Json | null
          recording_url?: string | null
          ref_id?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcube_call_records_matched_lead_id_fkey"
            columns: ["matched_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string
          created_by: string
          customer_notified_at: string | null
          description: string | null
          duration_minutes: number | null
          follow_up_id: string | null
          id: string
          lead_id: string
          location: string | null
          meeting_type: string | null
          notify_admin: boolean | null
          notify_customer: boolean | null
          scheduled_at: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          customer_notified_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          follow_up_id?: string | null
          id?: string
          lead_id: string
          location?: string | null
          meeting_type?: string | null
          notify_admin?: boolean | null
          notify_customer?: boolean | null
          scheduled_at: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_notified_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          follow_up_id?: string | null
          id?: string
          lead_id?: string
          location?: string | null
          meeting_type?: string | null
          notify_admin?: boolean | null
          notify_customer?: boolean | null
          scheduled_at?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_follow_up_id_fkey"
            columns: ["follow_up_id"]
            isOneToOne: false
            referencedRelation: "follow_ups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_verifications: {
        Row: {
          attempts: number
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          user_id: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          otp_code: string
          user_id: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      performance_reviews: {
        Row: {
          acknowledged_at: string | null
          areas_of_improvement: string | null
          comments: string | null
          created_at: string
          employee_id: string
          goals_achieved: string | null
          id: string
          overall_rating: number | null
          review_period_end: string
          review_period_start: string
          reviewer_id: string
          status: string | null
          strengths: string | null
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          areas_of_improvement?: string | null
          comments?: string | null
          created_at?: string
          employee_id: string
          goals_achieved?: string | null
          id?: string
          overall_rating?: number | null
          review_period_end: string
          review_period_start: string
          reviewer_id: string
          status?: string | null
          strengths?: string | null
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          areas_of_improvement?: string | null
          comments?: string | null
          created_at?: string
          employee_id?: string
          goals_achieved?: string | null
          id?: string
          overall_rating?: number | null
          review_period_end?: string
          review_period_start?: string
          reviewer_id?: string
          status?: string | null
          strengths?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_update_requests: {
        Row: {
          created_at: string
          field_name: string
          id: string
          new_value: string
          old_value: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          new_value: string
          old_value?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          new_value?: string
          old_value?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country: Database["public"]["Enums"]["country_code"] | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: Database["public"]["Enums"]["country_code"] | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: Database["public"]["Enums"]["country_code"] | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotations: {
        Row: {
          additional_costs: Json | null
          base_price: number
          created_at: string
          created_by: string
          currency: string
          discounts: Json | null
          id: string
          lead_id: string | null
          notes: string | null
          payment_plan: Json | null
          property_location: string | null
          property_name: string
          property_type: string | null
          quote_number: string
          status: string | null
          terms_and_conditions: string | null
          total_amount: number
          unit_details: string | null
          updated_at: string
          valid_until: string | null
          validity_days: number | null
        }
        Insert: {
          additional_costs?: Json | null
          base_price: number
          created_at?: string
          created_by: string
          currency?: string
          discounts?: Json | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          payment_plan?: Json | null
          property_location?: string | null
          property_name: string
          property_type?: string | null
          quote_number: string
          status?: string | null
          terms_and_conditions?: string | null
          total_amount: number
          unit_details?: string | null
          updated_at?: string
          valid_until?: string | null
          validity_days?: number | null
        }
        Update: {
          additional_costs?: Json | null
          base_price?: number
          created_at?: string
          created_by?: string
          currency?: string
          discounts?: Json | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          payment_plan?: Json | null
          property_location?: string | null
          property_name?: string
          property_type?: string | null
          quote_number?: string
          status?: string | null
          terms_and_conditions?: string | null
          total_amount?: number
          unit_details?: string | null
          updated_at?: string
          valid_until?: string | null
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          endpoint: string
          identifier: string
          request_count: number
          window_start: string
        }
        Insert: {
          endpoint: string
          identifier: string
          request_count?: number
          window_start?: string
        }
        Update: {
          endpoint?: string
          identifier?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          date_range_end: string | null
          date_range_start: string | null
          generated_by: string
          id: string
          report_data: Json
          report_name: string
          report_type: string
        }
        Insert: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          generated_by: string
          id?: string
          report_data: Json
          report_name: string
          report_type: string
        }
        Update: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          generated_by?: string
          id?: string
          report_data?: Json
          report_name?: string
          report_type?: string
        }
        Relationships: []
      }
      sales_targets: {
        Row: {
          achieved_value: number
          created_at: string
          created_by: string | null
          id: string
          month: number
          period: string
          target_type: string
          target_value: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          achieved_value?: number
          created_at?: string
          created_by?: string | null
          id?: string
          month: number
          period?: string
          target_type: string
          target_value?: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          achieved_value?: number
          created_at?: string
          created_by?: string | null
          id?: string
          month?: number
          period?: string
          target_type?: string
          target_value?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
        }
        Relationships: []
      }
      team_availability: {
        Row: {
          id: string
          is_available: boolean
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          id?: string
          is_available?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          id?: string
          is_available?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          email: string | null
          id: string
          is_active: boolean | null
          linkedin: string | null
          name: string
          phone: string | null
          photo_url: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          linkedin?: string | null
          name: string
          phone?: string | null
          photo_url?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          linkedin?: string | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_locations: {
        Row: {
          accuracy: number | null
          created_at: string
          id: string
          latitude: number
          longitude: number
          recorded_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          recorded_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          country: string | null
          created_at: string
          device_info: string | null
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean
          last_activity_at: string
          logged_out_at: string | null
          logged_out_by: string | null
          logout_reason: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          device_info?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity_at?: string
          logged_out_at?: string | null
          logged_out_by?: string | null
          logout_reason?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          device_info?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity_at?: string
          logged_out_at?: string | null
          logged_out_by?: string | null
          logout_reason?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          source: Database["public"]["Enums"]["integration_source"]
          trigger_count: number
          webhook_token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name: string
          source?: Database["public"]["Enums"]["integration_source"]
          trigger_count?: number
          webhook_token: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          source?: Database["public"]["Enums"]["integration_source"]
          trigger_count?: number
          webhook_token?: string
        }
        Relationships: []
      }
      weekly_offs: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          is_active: boolean
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_force_logout: {
        Args: { p_admin_id: string; p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      check_session_valid: {
        Args: { p_session_token: string }
        Returns: boolean
      }
      cleanup_expired_otps: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      generate_api_key: { Args: never; Returns: string }
      generate_quote_number: { Args: never; Returns: string }
      generate_webhook_token: { Args: never; Returns: string }
      get_user_country: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["country_code"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invalidate_user_sessions: {
        Args: { p_exclude_token?: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "blog_writer"
        | "super_admin"
        | "manager"
        | "mis"
        | "telesales"
        | "hr"
      call_outcome:
        | "answered"
        | "not_answered"
        | "busy"
        | "voicemail"
        | "wrong_number"
        | "callback_scheduled"
        | "not_reachable"
        | "call_dropped"
      country_code: "dubai" | "india"
      integration_source:
        | "99acres"
        | "magicbricks"
        | "housing"
        | "proptiger"
        | "bayut"
        | "property_finder"
        | "dubizzle"
        | "facebook"
        | "instagram"
        | "google_ads"
        | "linkedin"
        | "custom"
      lead_status:
        | "new"
        | "warm"
        | "cold"
        | "hot"
        | "not_interested"
        | "converted"
      leave_type:
        | "annual"
        | "sick"
        | "casual"
        | "maternity"
        | "paternity"
        | "unpaid"
        | "other"
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
      app_role: [
        "admin",
        "user",
        "blog_writer",
        "super_admin",
        "manager",
        "mis",
        "telesales",
        "hr",
      ],
      call_outcome: [
        "answered",
        "not_answered",
        "busy",
        "voicemail",
        "wrong_number",
        "callback_scheduled",
        "not_reachable",
        "call_dropped",
      ],
      country_code: ["dubai", "india"],
      integration_source: [
        "99acres",
        "magicbricks",
        "housing",
        "proptiger",
        "bayut",
        "property_finder",
        "dubizzle",
        "facebook",
        "instagram",
        "google_ads",
        "linkedin",
        "custom",
      ],
      lead_status: [
        "new",
        "warm",
        "cold",
        "hot",
        "not_interested",
        "converted",
      ],
      leave_type: [
        "annual",
        "sick",
        "casual",
        "maternity",
        "paternity",
        "unpaid",
        "other",
      ],
    },
  },
} as const
