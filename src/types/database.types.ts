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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          created_at: string
          id: number
          is_maintenance: boolean | null
          min_version: string | null
          vsp_1v1_is_open: boolean | null
          vsp_1v1_link: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          is_maintenance?: boolean | null
          min_version?: string | null
          vsp_1v1_is_open?: boolean | null
          vsp_1v1_link?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          is_maintenance?: boolean | null
          min_version?: string | null
          vsp_1v1_is_open?: boolean | null
          vsp_1v1_link?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          cash_booking_enabled: boolean | null
          created_at: string | null
          id: string
          instapay_handle: string | null
          online_payment_enabled: boolean | null
          support_email: string | null
          support_phone: string | null
          updated_at: string | null
          vodafone_cash_number: string | null
          whatsapp_number: string | null
        }
        Insert: {
          cash_booking_enabled?: boolean | null
          created_at?: string | null
          id?: string
          instapay_handle?: string | null
          online_payment_enabled?: boolean | null
          support_email?: string | null
          support_phone?: string | null
          updated_at?: string | null
          vodafone_cash_number?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          cash_booking_enabled?: boolean | null
          created_at?: string | null
          id?: string
          instapay_handle?: string | null
          online_payment_enabled?: boolean | null
          support_email?: string | null
          support_phone?: string | null
          updated_at?: string | null
          vodafone_cash_number?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      booking_players: {
        Row: {
          booking_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          booking_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_players_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "admin_pending_refunds"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_players_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "owner_subscription_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          absent_team_id: string | null
          away_score: number | null
          booking_type: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          challenge_status: string | null
          created_at: string
          created_by_user_id: string
          currency: string | null
          current_players: number | null
          deleted_for_users: string[] | null
          deposit_amount: number | null
          deposit_paid: number | null
          deposit_receipt_url: string | null
          dispute_photo_url: string | null
          elo_processed: boolean | null
          emergency_cancel_status: string | null
          emergency_downtime_hours: number | null
          emergency_reason: string | null
          end_time: string
          final_outcome: string | null
          home_score: number | null
          host_avatar_url: string | null
          host_name: string | null
          id: string
          initial_players_count: number | null
          is_deposit_paid: boolean | null
          is_dispute_approved: boolean | null
          is_official_match: boolean | null
          is_paid: boolean | null
          is_private: boolean | null
          is_verified_by_owner: boolean | null
          joined_user_ids: string[] | null
          last_message: string | null
          last_message_time: string | null
          locked_until: string | null
          match_result_status: string | null
          max_players: number | null
          needs_deposit: boolean | null
          notes: string | null
          operational_date: string | null
          opponent_team_id: string | null
          opponent_team_logo_url: string | null
          opponent_team_name: string | null
          owner_id: string
          payment_gateway_logs: Json | null
          payment_hold_released: boolean | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          payment_transaction_id: string | null
          paymob_order_id: string | null
          paymob_transaction_id: string | null
          paymob_txn_id: string | null
          pending_outcome: string | null
          pending_user_ids: string[] | null
          platform_fee: number | null
          player_phone: string | null
          player_team_id: string | null
          player_team_logo_url: string | null
          player_team_name: string | null
          proposed_end_time: string | null
          proposed_start_time: string | null
          receipt_url: string | null
          refund_amount: number | null
            refund_transaction_id: string | null
            refunded_at: string | null
            refund_payment_method: string | null
          rent_ball: boolean | null
          requires_admin_intervention: boolean | null
          reschedule_status: string | null
          result_submitted_at: string | null
          result_submitted_by_team_id: string | null
          stadium_id: string | null
          stadium_image_url: string | null
          stadium_name: string | null
          start_time: string
          status: string | null
          total_field_capacity: number | null
          total_price: number
          unread_counts: Json | null
          updated_at: string
          user_id: string | null
          webhook_processed_at: string | null
          webhook_verified: boolean | null
        }
        Insert: {
          absent_team_id?: string | null
          away_score?: number | null
          booking_type?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          challenge_status?: string | null
          created_at?: string
          created_by_user_id: string
          currency?: string | null
          current_players?: number | null
          deleted_for_users?: string[] | null
          deposit_amount?: number | null
          deposit_paid?: number | null
          deposit_receipt_url?: string | null
          dispute_photo_url?: string | null
          elo_processed?: boolean | null
          emergency_cancel_status?: string | null
          emergency_downtime_hours?: number | null
          emergency_reason?: string | null
          end_time: string
          final_outcome?: string | null
          home_score?: number | null
          host_avatar_url?: string | null
          host_name?: string | null
          id?: string
          initial_players_count?: number | null
          is_deposit_paid?: boolean | null
          is_dispute_approved?: boolean | null
          is_official_match?: boolean | null
          is_paid?: boolean | null
          is_private?: boolean | null
          is_verified_by_owner?: boolean | null
          joined_user_ids?: string[] | null
          last_message?: string | null
          last_message_time?: string | null
          locked_until?: string | null
          match_result_status?: string | null
          max_players?: number | null
          needs_deposit?: boolean | null
          notes?: string | null
          operational_date?: string | null
          opponent_team_id?: string | null
          opponent_team_logo_url?: string | null
          opponent_team_name?: string | null
          owner_id: string
          payment_gateway_logs?: Json | null
          payment_hold_released?: boolean | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          payment_transaction_id?: string | null
          paymob_order_id?: string | null
          paymob_transaction_id?: string | null
          paymob_txn_id?: string | null
          pending_outcome?: string | null
          pending_user_ids?: string[] | null
          platform_fee?: number | null
          player_phone?: string | null
          player_team_id?: string | null
          player_team_logo_url?: string | null
          player_team_name?: string | null
          proposed_end_time?: string | null
          proposed_start_time?: string | null
          receipt_url?: string | null
          refund_amount?: number | null
            refund_transaction_id?: string | null
            refunded_at?: string | null
            refund_payment_method?: string | null
          rent_ball?: boolean | null
          requires_admin_intervention?: boolean | null
          reschedule_status?: string | null
          result_submitted_at?: string | null
          result_submitted_by_team_id?: string | null
          stadium_id?: string | null
          stadium_image_url?: string | null
          stadium_name?: string | null
          start_time: string
          status?: string | null
          total_field_capacity?: number | null
          total_price: number
          unread_counts?: Json | null
          updated_at?: string
          user_id?: string | null
          webhook_processed_at?: string | null
          webhook_verified?: boolean | null
        }
        Update: {
          absent_team_id?: string | null
          away_score?: number | null
          booking_type?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          challenge_status?: string | null
          created_at?: string
          created_by_user_id?: string
          currency?: string | null
          current_players?: number | null
          deleted_for_users?: string[] | null
          deposit_amount?: number | null
          deposit_paid?: number | null
          deposit_receipt_url?: string | null
          dispute_photo_url?: string | null
          elo_processed?: boolean | null
          emergency_cancel_status?: string | null
          emergency_downtime_hours?: number | null
          emergency_reason?: string | null
          end_time?: string
          final_outcome?: string | null
          home_score?: number | null
          host_avatar_url?: string | null
          host_name?: string | null
          id?: string
          initial_players_count?: number | null
          is_deposit_paid?: boolean | null
          is_dispute_approved?: boolean | null
          is_official_match?: boolean | null
          is_paid?: boolean | null
          is_private?: boolean | null
          is_verified_by_owner?: boolean | null
          joined_user_ids?: string[] | null
          last_message?: string | null
          last_message_time?: string | null
          locked_until?: string | null
          match_result_status?: string | null
          max_players?: number | null
          needs_deposit?: boolean | null
          notes?: string | null
          operational_date?: string | null
          opponent_team_id?: string | null
          opponent_team_logo_url?: string | null
          opponent_team_name?: string | null
          owner_id?: string
          payment_gateway_logs?: Json | null
          payment_hold_released?: boolean | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          payment_transaction_id?: string | null
          paymob_order_id?: string | null
          paymob_transaction_id?: string | null
          paymob_txn_id?: string | null
          pending_outcome?: string | null
          pending_user_ids?: string[] | null
          platform_fee?: number | null
          player_phone?: string | null
          player_team_id?: string | null
          player_team_logo_url?: string | null
          player_team_name?: string | null
          proposed_end_time?: string | null
          proposed_start_time?: string | null
          receipt_url?: string | null
          refund_amount?: number | null
            refund_transaction_id?: string | null
            refunded_at?: string | null
            refund_payment_method?: string | null
          rent_ball?: boolean | null
          requires_admin_intervention?: boolean | null
          reschedule_status?: string | null
          result_submitted_at?: string | null
          result_submitted_by_team_id?: string | null
          stadium_id?: string | null
          stadium_image_url?: string | null
          stadium_name?: string | null
          start_time?: string
          status?: string | null
          total_field_capacity?: number | null
          total_price?: number
          unread_counts?: Json | null
          updated_at?: string
          user_id?: string | null
          webhook_processed_at?: string | null
          webhook_verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "owner_subscription_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_opponent_team_id_fkey"
            columns: ["opponent_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_subscription_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_player_team_id_fkey"
            columns: ["player_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_result_submitted_by_team_id_fkey"
            columns: ["result_submitted_by_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_stadium_id_fkey"
            columns: ["stadium_id"]
            isOneToOne: false
            referencedRelation: "stadiums"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_results: {
        Row: {
          challenge_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          id: string
          status: string
          submitted_by: string
          team1_score: number
          team2_score: number
        }
        Insert: {
          challenge_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          id?: string
          status?: string
          submitted_by: string
          team1_score?: number
          team2_score?: number
        }
        Update: {
          challenge_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          id?: string
          status?: string
          submitted_by?: string
          team1_score?: number
          team2_score?: number
        }
        Relationships: []
      }
      championship_roster_guests: {
        Row: {
          guest_name: string
          id: string
          roster_id: string | null
        }
        Insert: {
          guest_name: string
          id?: string
          roster_id?: string | null
        }
        Update: {
          guest_name?: string
          id?: string
          roster_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "championship_roster_guests_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "championship_rosters"
            referencedColumns: ["id"]
          },
        ]
      }
      championship_roster_players: {
        Row: {
          id: string
          player_id: string | null
          roster_id: string | null
        }
        Insert: {
          id?: string
          player_id?: string | null
          roster_id?: string | null
        }
        Update: {
          id?: string
          player_id?: string | null
          roster_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "championship_roster_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "owner_subscription_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "championship_roster_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "championship_roster_players_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "championship_rosters"
            referencedColumns: ["id"]
          },
        ]
      }
      championship_rosters: {
        Row: {
          championship_id: string | null
          created_at: string | null
          guest_names: Json | null
          id: string
          team_id: string | null
        }
        Insert: {
          championship_id?: string | null
          created_at?: string | null
          guest_names?: Json | null
          id?: string
          team_id?: string | null
        }
        Update: {
          championship_id?: string | null
          created_at?: string | null
          guest_names?: Json | null
          id?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "championship_rosters_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "championship_rosters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      championships: {
        Row: {
          champion_team_id: string | null
          champion_team_name: string | null
          champion_user_id: string | null
          created_at: string
          creation_fee_paid: boolean | null
          creation_payment_id: string | null
          draw_points: number | null
          end_date: string
          entry_fee: number
          fair_play_scoring: boolean | null
          governorate: string
          grand_prize: number
          id: string
          is_approved: boolean | null
          is_back_and_forth: boolean | null
          is_two_legs: boolean | null
          joined_teams: string[] | null
          logo_url: string | null
          loss_points: number | null
          match_duration: number | null
          max_players_per_team: number | null
          max_teams: number | null
          min_players_per_team: number | null
          name: string
          number_of_groups: number | null
          owner_id: string
          paid_teams: string[] | null
          payment_methods: string[] | null
          qualifying_per_group: number | null
          red_card_suspension: boolean | null
          rules: string | null
          settings: Json | null
          sport_type: string | null
          start_date: string
          status: string | null
          trophy_medals: boolean | null
          type: string
          updated_at: string
          winner_team_id: string | null
          winner_team_name: string | null
          winning_points: number | null
        }
        Insert: {
          champion_team_id?: string | null
          champion_team_name?: string | null
          champion_user_id?: string | null
          created_at?: string
          creation_fee_paid?: boolean | null
          creation_payment_id?: string | null
          draw_points?: number | null
          end_date: string
          entry_fee: number
          fair_play_scoring?: boolean | null
          governorate: string
          grand_prize: number
          id?: string
          is_approved?: boolean | null
          is_back_and_forth?: boolean | null
          is_two_legs?: boolean | null
          joined_teams?: string[] | null
          logo_url?: string | null
          loss_points?: number | null
          match_duration?: number | null
          max_players_per_team?: number | null
          max_teams?: number | null
          min_players_per_team?: number | null
          name: string
          number_of_groups?: number | null
          owner_id: string
          paid_teams?: string[] | null
          payment_methods?: string[] | null
          qualifying_per_group?: number | null
          red_card_suspension?: boolean | null
          rules?: string | null
          settings?: Json | null
          sport_type?: string | null
          start_date: string
          status?: string | null
          trophy_medals?: boolean | null
          type: string
          updated_at?: string
          winner_team_id?: string | null
          winner_team_name?: string | null
          winning_points?: number | null
        }
        Update: {
          champion_team_id?: string | null
          champion_team_name?: string | null
          champion_user_id?: string | null
          created_at?: string
          creation_fee_paid?: boolean | null
          creation_payment_id?: string | null
          draw_points?: number | null
          end_date?: string
          entry_fee?: number
          fair_play_scoring?: boolean | null
          governorate?: string
          grand_prize?: number
          id?: string
          is_approved?: boolean | null
          is_back_and_forth?: boolean | null
          is_two_legs?: boolean | null
          joined_teams?: string[] | null
          logo_url?: string | null
          loss_points?: number | null
          match_duration?: number | null
          max_players_per_team?: number | null
          max_teams?: number | null
          min_players_per_team?: number | null
          name?: string
          number_of_groups?: number | null
          owner_id?: string
          paid_teams?: string[] | null
          payment_methods?: string[] | null
          qualifying_per_group?: number | null
          red_card_suspension?: boolean | null
          rules?: string | null
          settings?: Json | null
          sport_type?: string | null
          start_date?: string
          status?: string | null
          trophy_medals?: boolean | null
          type?: string
          updated_at?: string
          winner_team_id?: string | null
          winner_team_name?: string | null
          winning_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "championships_champion_team_id_fkey"
            columns: ["champion_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "championships_champion_user_id_fkey"
            columns: ["champion_user_id"]
            isOneToOne: false
            referencedRelation: "owner_subscription_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "championships_champion_user_id_fkey"
            columns: ["champion_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "championships_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_subscription_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "championships_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          booking_id: string | null
          conversation_id: string | null
          created_at: string
          deleted_for_users: string[] | null
          id: string
          is_edited: boolean | null
          is_read: boolean | null
          sender_id: string
          sender_name: string
          text: string
        }
        Insert: {
          booking_id?: string | null
          conversation_id?: string | null
          created_at?: string
          deleted_for_users?: string[] | null
          id?: string
          is_edited?: boolean | null
          is_read?: boolean | null
          sender_id: string
          sender_name: string
          text: string
        }
        Update: {
          booking_id?: string | null
          conversation_id?: string | null
          created_at?: string
          deleted_for_users?: string[] | null
          id?: string
          is_edited?: boolean | null
          is_read?: boolean | null
          sender_id?: string
          sender_name?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "admin_pending_refunds"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "chat_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "owner_subscription_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          booking_id: string | null
          created_at: string
          deleted_for_users: string[] | null
          id: string
          last_message: string | null
          last_message_time: string | null
          participant_ids: string[]
          title: string | null
          type: string
          unread_counts: Json | null
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          deleted_for_users?: string[] | null
          id?: string
          last_message?: string | null
          last_message_time?: string | null
          participant_ids?: string[]
          title?: string | null
          type?: string
          unread_counts?: Json | null
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          deleted_for_users?: string[] | null
          id?: string
          last_message?: string | null
          last_message_time?: string | null
          participant_ids?: string[]
          title?: string | null
          type?: string
          unread_counts?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "admin_pending_refunds"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_audit_logs: {
        Row: {
          action_type: string
          amount: number
          booking_id: string | null
          created_at: string | null
          fee: number
          id: string
          metadata: Json | null
          owner_id: string | null
          payment_method: string
          transaction_ref: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          amount: number
          booking_id?: string | null
          created_at?: string | null
          fee: number
          id?: string
          metadata?: Json | null
          owner_id?: string | null
          payment_method: string
          transaction_ref?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          amount?: number
          booking_id?: string | null
          created_at?: string | null
          fee?: number
          id?: string
          metadata?: Json | null
          owner_id?: string | null
          payment_method?: string
          transaction_ref?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_audit_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "admin_pending_refunds"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "financial_audit_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          booking_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          booking_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          booking_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_settlements: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          destination: string
          id: string
          method: string
          owner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          destination: string
          id?: string
          method: string
          owner_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          destination?: string
          id?: string
          method?: string
          owner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_settlements_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_subscription_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_settlements_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      player_trophies: {
        Row: {
          championship_id: string | null
          created_at: string | null
          id: string
          prize_won: number | null
          title: string
          user_id: string | null
        }
        Insert: {
          championship_id?: string | null
          created_at?: string | null
          id?: string
          prize_won?: number | null
          title: string
          user_id?: string | null
        }
        Update: {
          championship_id?: string | null
          created_at?: string | null
          id?: string
          prize_won?: number | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_trophies_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_trophies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "owner_subscription_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_trophies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          created_at: string | null
          deep_link: string | null
          id: string
          image_url: string
          is_active: boolean | null
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          deep_link?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          deep_link?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string | null
          status: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          status?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          status?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          id: string
          rating: number | null
          review_text: string | null
          stadium_id: string
          user_id: string | null
          user_image_url: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          rating?: number | null
          review_text?: string | null
          stadium_id: string
          user_id?: string | null
          user_image_url?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number | null
          review_text?: string | null
          stadium_id?: string
          user_id?: string | null
          user_image_url?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      stadium_custom_rates: {
        Row: {
          created_at: string
          day_of_week: number | null
          end_time: string
          id: string
          price_per_hour: number
          specific_date: string | null
          stadium_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          end_time: string
          id?: string
          price_per_hour: number
          specific_date?: string | null
          stadium_id: string
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          end_time?: string
          id?: string
          price_per_hour?: number
          specific_date?: string | null
          stadium_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "stadium_custom_rates_stadium_id_fkey"
            columns: ["stadium_id"]
            isOneToOne: false
            referencedRelation: "stadiums"
            referencedColumns: ["id"]
          },
        ]
      }
      stadiums: {
        Row: {
          base_price: number
          break_end_time: string | null
          break_start_time: string | null
          city: string | null
          closing_time: string | null
          created_at: string
          deposit_amount: number | null
          description: string | null
          features: Json | null
          governorate: string
          id: string
          image_url: string | null
          images: string[] | null
          is_blocked: boolean | null
          is_deleted_by_owner: boolean | null
          is_featured: boolean | null
          is_split_shift: boolean | null
          is_verified: boolean | null
          last_emergency_closure_at: string | null
          lat: number | null
          lng: number | null
          location: string
          maintenance_reason: string | null
          maintenance_until: string | null
          name: string
          needs_deposit: boolean | null
          notes: string | null
          opening_time: string | null
          owner_id: string
          players_per_team: number | null
          price_per_hour: number
          rating: number | null
          reviews_count: number | null
          seats_capacity: number | null
          total_field_capacity: number | null
          updated_at: string
        }
        Insert: {
          base_price: number
          break_end_time?: string | null
          break_start_time?: string | null
          city?: string | null
          closing_time?: string | null
          created_at?: string
          deposit_amount?: number | null
          description?: string | null
          features?: Json | null
          governorate: string
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_blocked?: boolean | null
          is_deleted_by_owner?: boolean | null
          is_featured?: boolean | null
          is_split_shift?: boolean | null
          is_verified?: boolean | null
          last_emergency_closure_at?: string | null
          lat?: number | null
          lng?: number | null
          location: string
          maintenance_reason?: string | null
          maintenance_until?: string | null
          name: string
          needs_deposit?: boolean | null
          notes?: string | null
          opening_time?: string | null
          owner_id: string
          players_per_team?: number | null
          price_per_hour: number
          rating?: number | null
          reviews_count?: number | null
          seats_capacity?: number | null
          total_field_capacity?: number | null
          updated_at?: string
        }
        Update: {
          base_price?: number
          break_end_time?: string | null
          break_start_time?: string | null
          city?: string | null
          closing_time?: string | null
          created_at?: string
          deposit_amount?: number | null
          description?: string | null
          features?: Json | null
          governorate?: string
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_blocked?: boolean | null
          is_deleted_by_owner?: boolean | null
          is_featured?: boolean | null
          is_split_shift?: boolean | null
          is_verified?: boolean | null
          last_emergency_closure_at?: string | null
          lat?: number | null
          lng?: number | null
          location?: string
          maintenance_reason?: string | null
          maintenance_until?: string | null
          name?: string
          needs_deposit?: boolean | null
          notes?: string | null
          opening_time?: string | null
          owner_id?: string
          players_per_team?: number | null
          price_per_hour?: number
          rating?: number | null
          reviews_count?: number | null
          seats_capacity?: number | null
          total_field_capacity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stadiums_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_subscription_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stadiums_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          joined_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          team_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "owner_subscription_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          attendance_score: number | null
          beaten_opponents: string[] | null
          captain_id: string
          captain_image_url: string | null
          captain_name: string | null
          captain_phone: string | null
          championships_won: number | null
          created_at: string
          current_winning_streak: number | null
          date: string | null
          draws: number | null
          governorate: string | null
          id: string
          is_official: boolean | null
          last_reset_year: number | null
          logo_url: string | null
          losses: number | null
          matches_played: number | null
          name: string
          played_opponents: string[] | null
          points: number | null
          price_per_person: number | null
          primary_color: string | null
          secondary_color: string | null
          sport_type: string | null
          stadium: string | null
          unlocked_badges: string[] | null
          updated_at: string
          verified_badge: boolean | null
          wins: number | null
        }
        Insert: {
          attendance_score?: number | null
          beaten_opponents?: string[] | null
          captain_id: string
          captain_image_url?: string | null
          captain_name?: string | null
          captain_phone?: string | null
          championships_won?: number | null
          created_at?: string
          current_winning_streak?: number | null
          date?: string | null
          draws?: number | null
          governorate?: string | null
          id?: string
          is_official?: boolean | null
          last_reset_year?: number | null
          logo_url?: string | null
          losses?: number | null
          matches_played?: number | null
          name: string
          played_opponents?: string[] | null
          points?: number | null
          price_per_person?: number | null
          primary_color?: string | null
          secondary_color?: string | null
          sport_type?: string | null
          stadium?: string | null
          unlocked_badges?: string[] | null
          updated_at?: string
          verified_badge?: boolean | null
          wins?: number | null
        }
        Update: {
          attendance_score?: number | null
          beaten_opponents?: string[] | null
          captain_id?: string
          captain_image_url?: string | null
          captain_name?: string | null
          captain_phone?: string | null
          championships_won?: number | null
          created_at?: string
          current_winning_streak?: number | null
          date?: string | null
          draws?: number | null
          governorate?: string | null
          id?: string
          is_official?: boolean | null
          last_reset_year?: number | null
          logo_url?: string | null
          losses?: number | null
          matches_played?: number | null
          name?: string
          played_opponents?: string[] | null
          points?: number | null
          price_per_person?: number | null
          primary_color?: string | null
          secondary_color?: string | null
          sport_type?: string | null
          stadium?: string | null
          unlocked_badges?: string[] | null
          updated_at?: string
          verified_badge?: boolean | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "owner_subscription_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          away_penalties: number | null
          away_score: number | null
          away_team_id: string | null
          away_team_name: string | null
          championship_id: string
          clean_sheets: Json | null
          goal_details: Json | null
          group_name: string | null
          home_penalties: number | null
          home_score: number | null
          home_team_id: string | null
          home_team_name: string | null
          id: string
          is_completed: boolean | null
          match_index: number
          mvp_player: string | null
          next_match_id: string | null
          round_index: number
          scheduled_time: string | null
          stage: string | null
          status: string | null
          week_number: number | null
          winner_id: string | null
          winner_name: string | null
        }
        Insert: {
          away_penalties?: number | null
          away_score?: number | null
          away_team_id?: string | null
          away_team_name?: string | null
          championship_id: string
          clean_sheets?: Json | null
          goal_details?: Json | null
          group_name?: string | null
          home_penalties?: number | null
          home_score?: number | null
          home_team_id?: string | null
          home_team_name?: string | null
          id?: string
          is_completed?: boolean | null
          match_index: number
          mvp_player?: string | null
          next_match_id?: string | null
          round_index: number
          scheduled_time?: string | null
          stage?: string | null
          status?: string | null
          week_number?: number | null
          winner_id?: string | null
          winner_name?: string | null
        }
        Update: {
          away_penalties?: number | null
          away_score?: number | null
          away_team_id?: string | null
          away_team_name?: string | null
          championship_id?: string
          clean_sheets?: Json | null
          goal_details?: Json | null
          group_name?: string | null
          home_penalties?: number | null
          home_score?: number | null
          home_team_id?: string | null
          home_team_name?: string | null
          id?: string
          is_completed?: boolean | null
          match_index?: number
          mvp_player?: string | null
          next_match_id?: string | null
          round_index?: number
          scheduled_time?: string | null
          stage?: string | null
          status?: string | null
          week_number?: number | null
          winner_id?: string | null
          winner_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_next_match_id_fkey"
            columns: ["next_match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_orders: {
        Row: {
          amount: number
          captain_user_id: string
          championship_id: string
          created_at: string
          guest_names: string[] | null
          id: string
          order_reference: string
          payment_status: string
          paymob_transaction_id: string | null
          player_ids: string[] | null
          team_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          captain_user_id: string
          championship_id: string
          created_at?: string
          guest_names?: string[] | null
          id?: string
          order_reference: string
          payment_status?: string
          paymob_transaction_id?: string | null
          player_ids?: string[] | null
          team_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          captain_user_id?: string
          championship_id?: string
          created_at?: string
          guest_names?: string[] | null
          id?: string
          order_reference?: string
          payment_status?: string
          paymob_transaction_id?: string | null
          player_ids?: string[] | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_orders_captain_user_id_fkey"
            columns: ["captain_user_id"]
            isOneToOne: false
            referencedRelation: "owner_subscription_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_orders_captain_user_id_fkey"
            columns: ["captain_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_orders_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_orders_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          booking_id: string | null
          championship_id: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          payment_method: string | null
          reference_number: string | null
          status: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          championship_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          reference_number?: string | null
          status?: string
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          championship_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          reference_number?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "admin_pending_refunds"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          additional_data: Json | null
          cash_booking_banned: boolean | null
          completed_online_bookings_count: number | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          favorite_stadiums: string[] | null
          fcm_token: string | null
          governorate: string | null
          has_stadium: boolean | null
          id: string
          is_blocked: boolean
          is_email_verified: boolean | null
          is_identity_verified: boolean | null
          is_onboarding_confirmed: boolean
          is_registration_complete: boolean | null
          last_seen: string | null
          last_warning: string | null
          name: string | null
          no_show_count: number | null
          p2p_bank: string | null
          p2p_instapay: string | null
          p2p_vodafone: string | null
          phone: string | null
          position: string | null
          profile_image_url: string | null
          role: string | null
          subscription_expires_at: string | null
          subscription_plan: string | null
          total_platform_fees: number | null
          trial_ends_at: string | null
          updated_at: string
          verification_status: string
        }
        Insert: {
          additional_data?: Json | null
          cash_booking_banned?: boolean | null
          completed_online_bookings_count?: number | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          favorite_stadiums?: string[] | null
          fcm_token?: string | null
          governorate?: string | null
          has_stadium?: boolean | null
          id: string
          is_blocked?: boolean
          is_email_verified?: boolean | null
          is_identity_verified?: boolean | null
          is_onboarding_confirmed?: boolean
          is_registration_complete?: boolean | null
          last_seen?: string | null
          last_warning?: string | null
          name?: string | null
          no_show_count?: number | null
          p2p_bank?: string | null
          p2p_instapay?: string | null
          p2p_vodafone?: string | null
          phone?: string | null
          position?: string | null
          profile_image_url?: string | null
          role?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          total_platform_fees?: number | null
          trial_ends_at?: string | null
          updated_at?: string
          verification_status?: string
        }
        Update: {
          additional_data?: Json | null
          cash_booking_banned?: boolean | null
          completed_online_bookings_count?: number | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          favorite_stadiums?: string[] | null
          fcm_token?: string | null
          governorate?: string | null
          has_stadium?: boolean | null
          id?: string
          is_blocked?: boolean
          is_email_verified?: boolean | null
          is_identity_verified?: boolean | null
          is_onboarding_confirmed?: boolean
          is_registration_complete?: boolean | null
          last_seen?: string | null
          last_warning?: string | null
          name?: string | null
          no_show_count?: number | null
          p2p_bank?: string | null
          p2p_instapay?: string | null
          p2p_vodafone?: string | null
          phone?: string | null
          position?: string | null
          profile_image_url?: string | null
          role?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          total_platform_fees?: number | null
          trial_ends_at?: string | null
          updated_at?: string
          verification_status?: string
        }
        Relationships: []
      }
      vsp_1v1_registrations: {
        Row: {
          created_at: string | null
          id: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vsp_1v1_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "owner_subscription_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vsp_1v1_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vsp_1vs1_players: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          goals: number | null
          id: string
          name: string
          skill_points: number | null
          tackles: number | null
          titles: number | null
          total_points: number | null
          trend: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          goals?: number | null
          id?: string
          name: string
          skill_points?: number | null
          tackles?: number | null
          titles?: number | null
          total_points?: number | null
          trend?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          goals?: number | null
          id?: string
          name?: string
          skill_points?: number | null
          tackles?: number | null
          titles?: number | null
          total_points?: number | null
          trend?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          booking_id: string | null
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          order_id: string | null
          payload: Json
          provider: string
          signature_verified: boolean | null
          status: string
          txn_id: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          order_id?: string | null
          payload: Json
          provider?: string
          signature_verified?: boolean | null
          status?: string
          txn_id?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          order_id?: string | null
          payload?: Json
          provider?: string
          signature_verified?: boolean | null
          status?: string
          txn_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_bookings_with_refund: {
        Row: {
          id: string
          created_by_user_id: string | null
          owner_id: string | null
          stadium_name: string | null
          start_time: string | null
          end_time: string | null
          total_price: number | null
          payment_method: string | null
          payment_status: string | null
          status: string | null
          refund_amount: number | null
          refund_transaction_id: string | null
          refunded_at: string | null
          refund_payment_method: string | null
          cancelled_at: string | null
          platform_fee: number | null
          refund_channel: string | null
          refund_eta: string | null
          display_refund_ref: string | null
        }
        Relationships: []
      }
      admin_pending_refunds: {
        Row: {
          booking_date: string | null
          booking_id: string | null
          cancellation_date: string | null
          original_amount: number | null
          paymob_reference: string | null
          player_name: string | null
          player_phone: string | null
          refund_amount: number | null
            refund_transaction_id: string | null
            refunded_at: string | null
            refund_payment_method: string | null
          stadium_name: string | null
        }
        Insert: {
          booking_date?: string | null
          booking_id?: string | null
          cancellation_date?: string | null
          original_amount?: number | null
          paymob_reference?: string | null
          player_name?: string | null
          player_phone?: string | null
          refund_amount?: never
          stadium_name?: string | null
        }
        Update: {
          booking_date?: string | null
          booking_id?: string | null
          cancellation_date?: string | null
          original_amount?: number | null
          paymob_reference?: string | null
          player_name?: string | null
          player_phone?: string | null
          refund_amount?: never
          stadium_name?: string | null
        }
        Relationships: []
      }
      admin_stadium_settlements: {
        Row: {
          cash_collected_by_owner: number | null
          net_balance: number | null
          online_collected_by_vsp: number | null
          owner_id: string | null
          stadium_name: string | null
          total_matches: number | null
          total_revenue: number | null
          vsp_commission: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_subscription_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_subscription_status: {
        Row: {
          effective_status: string | null
          id: string | null
          max_stadiums_allowed: number | null
          name: string | null
          phone: string | null
          subscription_expires_at: string | null
          subscription_plan: string | null
          total_platform_fees: number | null
          trial_ends_at: string | null
          verification_status: string | null
        }
        Insert: {
          effective_status?: never
          id?: string | null
          max_stadiums_allowed?: never
          name?: string | null
          phone?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          total_platform_fees?: number | null
          trial_ends_at?: string | null
          verification_status?: string | null
        }
        Update: {
          effective_status?: never
          id?: string | null
          max_stadiums_allowed?: never
          name?: string | null
          phone?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          total_platform_fees?: number | null
          trial_ends_at?: string | null
          verification_status?: string | null
        }
        Relationships: []
      }
      tournament_clean_sheets: {
        Row: {
          championship_id: string | null
          clean_sheets_count: number | null
          team_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_join_request: {
        Args: { p_booking_id: string; p_user_id: string }
        Returns: Json
      }
      activate_vsp_pro: {
        Args: { p_days?: number; p_owner_id: string; p_transaction_id: string }
        Returns: boolean
      }
      admin_approve_owner_atomic: {
        Args: { p_owner_id: string }
        Returns: Json
      }
      admin_record_payout_settlement_atomic: {
        Args: {
          p_amount: number
          p_owner_id: string
          p_payment_method: string
          p_reference: string
        }
        Returns: Json
      }
      admin_register_owner_on_behalf: {
        Args: {
          p_email: string
          p_governorate: string
          p_name: string
          p_password: string
          p_phone: string
        }
        Returns: string
      }
      admin_resolve_dispute_atomic: {
        Args: { p_booking_id: string; p_final_outcome: string }
        Returns: Json
      }
      admin_upgrade_owner_subscription_atomic: {
        Args: { p_days?: number; p_owner_id: string; p_plan: string }
        Returns: Json
      }
      apply_no_show_penalty: {
        Args: { p_player_id: string }
        Returns: undefined
      }
      approve_payout_settlement_atomic: {
        Args: { p_admin_notes?: string; p_settlement_id: string }
        Returns: Json
      }
      auto_approve_tournament_matches_24h: { Args: never; Returns: undefined }
      auto_downgrade_expired_subscriptions: { Args: never; Returns: undefined }
      auto_expire_pending_challenges: { Args: never; Returns: undefined }
      auto_expire_pending_locks: { Args: never; Returns: number }
      auto_expire_stale_records: { Args: never; Returns: undefined }
      auto_reconcile_all_past_bookings: { Args: never; Returns: undefined }
      auto_reconcile_past_bookings: { Args: never; Returns: undefined }
      auto_reconcile_single_entry_results: { Args: never; Returns: undefined }
      auto_release_elo_lock: { Args: never; Returns: number }
      cancel_booking_with_refund_atomic: {
        Args: { p_booking_id: string; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      check_owner_stadium_limit: { Args: { p_owner_id: string }; Returns: Json }
      check_team_has_1v1_champion: {
        Args: { p_team_id: string }
        Returns: boolean
      }
      close_owner_daily_shift: {
        Args: {
          p_operational_date: string
          p_owner_id: string
          p_stadium_id: string
        }
        Returns: Json
      }
      complete_user_registration: {
        Args: {
          p_date_of_birth?: string
          p_governorate?: string
          p_name?: string
          p_p2p_bank?: string
          p_p2p_instapay?: string
          p_p2p_vodafone?: string
          p_phone: string
          p_position?: string
          p_user_id: string
        }
        Returns: Json
      }
      confirm_tournament_order_atomic: {
        Args: { p_order_reference: string; p_paymob_transaction_id: string }
        Returns: Json
      }
      create_booking_atomic: {
        Args: {
          p_booking_type: string
          p_deposit_amount?: number
          p_end_time: string
          p_is_private?: boolean
          p_needs_deposit?: boolean
          p_opponent_team_id?: string
          p_opponent_team_name?: string
          p_owner_id: string
          p_payment_method?: string
          p_payment_status?: string
          p_platform_fee?: number
          p_player_team_id?: string
          p_player_team_name?: string
          p_rent_ball?: boolean
          p_stadium_id: string
          p_stadium_image_url?: string
          p_stadium_name?: string
          p_start_time: string
          p_total_price: number
          p_user_id: string
        }
        Returns: Json
      }
      create_owner_on_behalf: {
        Args: {
          p_email: string
          p_governorate: string
          p_name: string
          p_password: string
          p_phone: string
        }
        Returns: string
      }
      create_tournament_order_atomic: {
        Args: {
          p_amount: number
          p_championship_id: string
          p_guest_names: string[]
          p_player_ids: string[]
          p_team_id: string
        }
        Returns: Json
      }
      crown_individual_1v1_champion: {
        Args: {
          p_championship_id: string
          p_prize: number
          p_winner_user_id: string
        }
        Returns: undefined
      }
      crown_tournament_champion_atomic: {
        Args: {
          p_champion_team_id: string
          p_champion_team_name: string
          p_championship_id: string
        }
        Returns: Json
      }
      delete_chat_for_user: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: undefined
      }
      delete_chat_for_user_atomic: {
        Args: { p_booking_id: string; p_user_id: string }
        Returns: undefined
      }
      delete_user_permanently: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      dismiss_no_show_penalty: {
        Args: { p_booking_id: string; p_player_id: string }
        Returns: undefined
      }
      dispute_no_show_with_gps: {
        Args: {
          p_accuracy: number
          p_booking_id: string
          p_lat: number
          p_lng: number
          p_player_id: string
        }
        Returns: boolean
      }
      get_admin_metrics: { Args: never; Returns: Json }
      get_admin_quick_metrics: { Args: never; Returns: Json }
      get_championship_standings: {
        Args: { p_championship_id: string; p_group_name?: string }
        Returns: {
          drawn: number
          goal_difference: number
          goals_against: number
          goals_for: number
          lost: number
          played: number
          points: number
          team_id: string
          team_name: string
          won: number
        }[]
      }
      get_nearby_stadiums: {
        Args: { max_limit?: number; user_lat: number; user_lng: number }
        Returns: {
          base_price: number
          break_end_time: string | null
          break_start_time: string | null
          city: string | null
          closing_time: string | null
          created_at: string
          deposit_amount: number | null
          description: string | null
          features: Json | null
          governorate: string
          id: string
          image_url: string | null
          images: string[] | null
          is_blocked: boolean | null
          is_deleted_by_owner: boolean | null
          is_featured: boolean | null
          is_split_shift: boolean | null
          is_verified: boolean | null
          last_emergency_closure_at: string | null
          lat: number | null
          lng: number | null
          location: string
          maintenance_reason: string | null
          maintenance_until: string | null
          name: string
          needs_deposit: boolean | null
          notes: string | null
          opening_time: string | null
          owner_id: string
          players_per_team: number | null
          price_per_hour: number
          rating: number | null
          reviews_count: number | null
          seats_capacity: number | null
          total_field_capacity: number | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "stadiums"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_operational_date: {
        Args: { p_shift_start_hour?: number; p_timestamp: string }
        Returns: string
      }
      global_search: { Args: { search_term: string }; Returns: Json }
      increment_chat_unread_count: {
        Args: {
          p_booking_id: string
          p_last_message: string
          p_sender_id: string
        }
        Returns: undefined
      }
      is_admin_or_cofounder: { Args: { p_user_id: string }; Returns: boolean }
      join_championship_atomic: {
        Args: {
          p_championship_id: string
          p_guest_names?: string[]
          p_is_paid?: boolean
          p_player_ids?: string[]
          p_team_id: string
          p_total_paid_amount?: number
        }
        Returns: Json
      }
      join_public_match: {
        Args: { p_booking_id: string; p_user_id: string }
        Returns: boolean
      }
      leave_championship_atomic: {
        Args: { p_championship_id: string; p_team_id: string }
        Returns: Json
      }
      leave_public_match_atomic: {
        Args: { p_booking_id: string; p_user_id: string }
        Returns: boolean
      }
      mark_chat_messages_as_read: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: undefined
      }
      owner_create_manual_booking_atomic: {
        Args: {
          p_collected_amount?: number
          p_current_players?: number
          p_customer_name: string
          p_customer_phone?: string
          p_end_time: string
          p_notes?: string
          p_owner_id: string
          p_stadium_id: string
          p_start_time: string
          p_total_price?: number
        }
        Returns: Json
      }
      owner_lock_slot_atomic: {
        Args: {
          p_end_time: string
          p_owner_id: string
          p_reason?: string
          p_stadium_id: string
          p_start_time: string
        }
        Returns: Json
      }
      pay_rehabilitation_fine: { Args: { p_user_id: string }; Returns: boolean }
      prepare_tournament_bracket: {
        Args: { p_championship_id: string }
        Returns: undefined
      }
      prepare_tournament_bracket_atomic: {
        Args: { p_championship_id: string }
        Returns: Json
      }
      process_paymob_webhook: {
        Args: {
          p_booking_id: string
          p_order_id: string
          p_payload: Json
          p_signature_verified: boolean
          p_success: boolean
          p_txn_id: string
        }
        Returns: Json
      }
      reconcile_daily_elo_ratings: { Args: never; Returns: undefined }
      record_match_result_and_advance_atomic: {
        Args: {
          p_away_penalties?: number
          p_away_score: number
          p_goal_details?: Json
          p_home_penalties?: number
          p_home_score: number
          p_match_id: string
          p_winner_id?: string
          p_winner_name?: string
        }
        Returns: Json
      }
      reject_join_request: {
        Args: { p_booking_id: string; p_user_id: string }
        Returns: Json
      }
      release_booking_lock: { Args: { p_booking_id: string }; Returns: Json }
      request_emergency_stadium_closure: {
        Args: {
          p_duration_hours?: number
          p_owner_id: string
          p_reason: string
          p_stadium_id: string
        }
        Returns: Json
      }
      request_join_public_match: {
        Args: { p_booking_id: string; p_user_id: string }
        Returns: Json
      }
      request_owner_payout_settlement_atomic: {
        Args: {
          p_amount: number
          p_destination: string
          p_method: string
          p_owner_id: string
        }
        Returns: Json
      }
      set_user_role_on_signup: {
        Args: { p_role: string; p_user_id?: string }
        Returns: boolean
      }
      submit_owner_verification: {
        Args: { p_additional_data?: Json; p_owner_id: string }
        Returns: Json
      }
      submit_stadium_review_atomic: {
        Args: {
          p_comment: string
          p_rating: number
          p_stadium_id: string
          p_user_id: string
          p_user_image_url: string
          p_user_name: string
        }
        Returns: Json
      }
      update_host_spots_atomic: {
        Args: {
          p_booking_id: string
          p_new_host_spots: number
          p_user_id: string
        }
        Returns: boolean
      }
      verify_match_played: {
        Args: {
          p_absent_team_id?: string
          p_attended: boolean
          p_booking_id: string
        }
        Returns: boolean
      }
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
  public: {
    Enums: {},
  },
} as const
