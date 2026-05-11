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
    PostgrestVersion: "13.0.5"
  }
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
      bikes: {
        Row: {
          availability_status: boolean | null
          booking_count: number | null
          brand: string | null
          created_at: string
          currency: string | null
          description: string | null
          discounts: Json | null
          engine_capacity: number | null
          featured: boolean | null
          helmet_included: boolean | null
          host_id: string
          id: string
          images: string[] | null
          is_verified: boolean | null
          last_booked_at: string | null
          latitude: number | null
          location: string
          longitude: number | null
          marketplace_requested: boolean
          marketplace_visible: boolean
          mileage_limit: number | null
          model: string | null
          price_per_day: number
          rating: number | null
          slug: string | null
          tags: string[] | null
          title: string
          total_reviews: number | null
          updated_at: string
          vehicle_type: string | null
          verified_by: string | null
          views_count: number | null
          year: number | null
        }
        Insert: {
          availability_status?: boolean | null
          booking_count?: number | null
          brand?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          discounts?: Json | null
          engine_capacity?: number | null
          featured?: boolean | null
          helmet_included?: boolean | null
          host_id: string
          id?: string
          images?: string[] | null
          is_verified?: boolean | null
          last_booked_at?: string | null
          latitude?: number | null
          location: string
          longitude?: number | null
          marketplace_requested?: boolean
          marketplace_visible?: boolean
          mileage_limit?: number | null
          model?: string | null
          price_per_day: number
          rating?: number | null
          slug?: string | null
          tags?: string[] | null
          title: string
          total_reviews?: number | null
          updated_at?: string
          vehicle_type?: string | null
          verified_by?: string | null
          views_count?: number | null
          year?: number | null
        }
        Update: {
          availability_status?: boolean | null
          booking_count?: number | null
          brand?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          discounts?: Json | null
          engine_capacity?: number | null
          featured?: boolean | null
          helmet_included?: boolean | null
          host_id?: string
          id?: string
          images?: string[] | null
          is_verified?: boolean | null
          last_booked_at?: string | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          marketplace_requested?: boolean
          marketplace_visible?: boolean
          mileage_limit?: number | null
          model?: string | null
          price_per_day?: number
          rating?: number | null
          slug?: string | null
          tags?: string[] | null
          title?: string
          total_reviews?: number | null
          updated_at?: string
          vehicle_type?: string | null
          verified_by?: string | null
          views_count?: number | null
          year?: number | null
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
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string
          category_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          published_at: string | null
          reading_time: number | null
          slug: string
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          author_id: string
          category_id?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          reading_time?: number | null
          slug: string
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          author_id?: string
          category_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          reading_time?: number | null
          slug?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_status: Database["public"]["Enums"]["booking_status"] | null
          cancellation_reason: string | null
          created_at: string
          currency: string | null
          end_date: string
          guests_count: number | null
          host_id: string
          id: string
          listing_id: string
          listing_type: Database["public"]["Enums"]["listing_type"]
          notes: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          reviewed: boolean | null
          start_date: string
          total_price: number
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_status?: Database["public"]["Enums"]["booking_status"] | null
          cancellation_reason?: string | null
          created_at?: string
          currency?: string | null
          end_date: string
          guests_count?: number | null
          host_id: string
          id?: string
          listing_id: string
          listing_type: Database["public"]["Enums"]["listing_type"]
          notes?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          reviewed?: boolean | null
          start_date: string
          total_price: number
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_status?: Database["public"]["Enums"]["booking_status"] | null
          cancellation_reason?: string | null
          created_at?: string
          currency?: string | null
          end_date?: string
          guests_count?: number | null
          host_id?: string
          id?: string
          listing_id?: string
          listing_type?: Database["public"]["Enums"]["listing_type"]
          notes?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          reviewed?: boolean | null
          start_date?: string
          total_price?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cars: {
        Row: {
          amenities: Json | null
          availability_status: boolean | null
          booking_count: number | null
          brand: string | null
          created_at: string
          currency: string | null
          description: string | null
          discounts: Json | null
          featured: boolean | null
          fuel_type: string | null
          host_id: string
          id: string
          images: string[] | null
          is_verified: boolean | null
          last_booked_at: string | null
          latitude: number | null
          location: string
          longitude: number | null
          marketplace_requested: boolean
          marketplace_visible: boolean
          mileage_limit: number | null
          model: string | null
          price_per_day: number
          rating: number | null
          seating_capacity: number | null
          slug: string | null
          tags: string[] | null
          title: string
          total_reviews: number | null
          transmission: string | null
          updated_at: string
          vehicle_type: string | null
          verified_by: string | null
          views_count: number | null
          year: number | null
        }
        Insert: {
          amenities?: Json | null
          availability_status?: boolean | null
          booking_count?: number | null
          brand?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          discounts?: Json | null
          featured?: boolean | null
          fuel_type?: string | null
          host_id: string
          id?: string
          images?: string[] | null
          is_verified?: boolean | null
          last_booked_at?: string | null
          latitude?: number | null
          location: string
          longitude?: number | null
          marketplace_requested?: boolean
          marketplace_visible?: boolean
          mileage_limit?: number | null
          model?: string | null
          price_per_day: number
          rating?: number | null
          seating_capacity?: number | null
          slug?: string | null
          tags?: string[] | null
          title: string
          total_reviews?: number | null
          transmission?: string | null
          updated_at?: string
          vehicle_type?: string | null
          verified_by?: string | null
          views_count?: number | null
          year?: number | null
        }
        Update: {
          amenities?: Json | null
          availability_status?: boolean | null
          booking_count?: number | null
          brand?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          discounts?: Json | null
          featured?: boolean | null
          fuel_type?: string | null
          host_id?: string
          id?: string
          images?: string[] | null
          is_verified?: boolean | null
          last_booked_at?: string | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          marketplace_requested?: boolean
          marketplace_visible?: boolean
          mileage_limit?: number | null
          model?: string | null
          price_per_day?: number
          rating?: number | null
          seating_capacity?: number | null
          slug?: string | null
          tags?: string[] | null
          title?: string
          total_reviews?: number | null
          transmission?: string | null
          updated_at?: string
          vehicle_type?: string | null
          verified_by?: string | null
          views_count?: number | null
          year?: number | null
        }
        Relationships: []
      }
      experiences: {
        Row: {
          availability_status: boolean | null
          booking_count: number | null
          category: string | null
          created_at: string
          currency: string | null
          description: string | null
          discounts: Json | null
          duration: string | null
          exclusions: string[] | null
          featured: boolean | null
          group_size: number | null
          host_id: string
          id: string
          images: string[] | null
          inclusions: string[] | null
          is_verified: boolean | null
          itinerary: Json | null
          last_booked_at: string | null
          latitude: number | null
          location: string
          longitude: number | null
          marketplace_requested: boolean
          marketplace_visible: boolean
          price_per_person: number
          rating: number | null
          slug: string | null
          tags: string[] | null
          title: string
          total_reviews: number | null
          updated_at: string
          verified_by: string | null
          views_count: number | null
        }
        Insert: {
          availability_status?: boolean | null
          booking_count?: number | null
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          discounts?: Json | null
          duration?: string | null
          exclusions?: string[] | null
          featured?: boolean | null
          group_size?: number | null
          host_id: string
          id?: string
          images?: string[] | null
          inclusions?: string[] | null
          is_verified?: boolean | null
          itinerary?: Json | null
          last_booked_at?: string | null
          latitude?: number | null
          location: string
          longitude?: number | null
          marketplace_requested?: boolean
          marketplace_visible?: boolean
          price_per_person: number
          rating?: number | null
          slug?: string | null
          tags?: string[] | null
          title: string
          total_reviews?: number | null
          updated_at?: string
          verified_by?: string | null
          views_count?: number | null
        }
        Update: {
          availability_status?: boolean | null
          booking_count?: number | null
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          discounts?: Json | null
          duration?: string | null
          exclusions?: string[] | null
          featured?: boolean | null
          group_size?: number | null
          host_id?: string
          id?: string
          images?: string[] | null
          inclusions?: string[] | null
          is_verified?: boolean | null
          itinerary?: Json | null
          last_booked_at?: string | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          marketplace_requested?: boolean
          marketplace_visible?: boolean
          price_per_person?: number
          rating?: number | null
          slug?: string | null
          tags?: string[] | null
          title?: string
          total_reviews?: number | null
          updated_at?: string
          verified_by?: string | null
          views_count?: number | null
        }
        Relationships: []
      }
      host_coupon_redemptions: {
        Row: {
          booking_context: Json | null
          coupon_id: string
          created_at: string
          host_id: string
          id: string
          user_id: string
        }
        Insert: {
          booking_context?: Json | null
          coupon_id: string
          created_at?: string
          host_id: string
          id?: string
          user_id: string
        }
        Update: {
          booking_context?: Json | null
          coupon_id?: string
          created_at?: string
          host_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "host_coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      host_coupons: {
        Row: {
          code: string
          created_at: string
          discount_percent: number
          ends_at: string | null
          host_id: string
          id: string
          is_active: boolean
          listing_types: string[]
          one_time_per_user: boolean
          starts_at: string | null
          updated_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_percent: number
          ends_at?: string | null
          host_id: string
          id?: string
          is_active?: boolean
          listing_types?: string[]
          one_time_per_user?: boolean
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_percent?: number
          ends_at?: string | null
          host_id?: string
          id?: string
          is_active?: boolean
          listing_types?: string[]
          one_time_per_user?: boolean
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      host_profiles: {
        Row: {
          aadhaar_last_four: string | null
          address: string | null
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          business_name: string | null
          business_type: string | null
          created_at: string
          gst_number: string | null
          id: string
          pan_number: string | null
          service_types: string[] | null
          updated_at: string
        }
        Insert: {
          aadhaar_last_four?: string | null
          address?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          business_name?: string | null
          business_type?: string | null
          created_at?: string
          gst_number?: string | null
          id: string
          pan_number?: string | null
          service_types?: string[] | null
          updated_at?: string
        }
        Update: {
          aadhaar_last_four?: string | null
          address?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          business_name?: string | null
          business_type?: string | null
          created_at?: string
          gst_number?: string | null
          id?: string
          pan_number?: string | null
          service_types?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          amenities: Json | null
          availability_status: boolean | null
          bathrooms: number | null
          bedrooms: number | null
          cancellation_policy: string | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          featured: boolean | null
          host_id: string
          id: string
          images: string[] | null
          location: string | null
          marketplace_requested: boolean
          marketplace_visible: boolean
          max_guests: number | null
          price_per_night: number | null
          property_type: string | null
          rating: number | null
          slug: string | null
          title: string | null
          total_reviews: number | null
        }
        Insert: {
          amenities?: Json | null
          availability_status?: boolean | null
          bathrooms?: number | null
          bedrooms?: number | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          featured?: boolean | null
          host_id: string
          id?: string
          images?: string[] | null
          location?: string | null
          marketplace_requested?: boolean
          marketplace_visible?: boolean
          max_guests?: number | null
          price_per_night?: number | null
          property_type?: string | null
          rating?: number | null
          slug?: string | null
          title?: string | null
          total_reviews?: number | null
        }
        Update: {
          amenities?: Json | null
          availability_status?: boolean | null
          bathrooms?: number | null
          bedrooms?: number | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          featured?: boolean | null
          host_id?: string
          id?: string
          images?: string[] | null
          location?: string | null
          marketplace_requested?: boolean
          marketplace_visible?: boolean
          max_guests?: number | null
          price_per_night?: number | null
          property_type?: string | null
          rating?: number | null
          slug?: string | null
          title?: string | null
          total_reviews?: number | null
        }
        Relationships: []
      }
      link_in_bio_pages: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          settings: Json
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          settings?: Json
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          settings?: Json
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      listing_questions: {
        Row: {
          created_at: string
          id: string
          is_answered: boolean | null
          listing_id: string
          listing_type: Database["public"]["Enums"]["listing_type"]
          question: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_answered?: boolean | null
          listing_id: string
          listing_type: Database["public"]["Enums"]["listing_type"]
          question: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_answered?: boolean | null
          listing_id?: string
          listing_type?: Database["public"]["Enums"]["listing_type"]
          question?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          dietary_requirements: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string | null
          gender: string | null
          id: string
          id_document_number: string | null
          id_document_type: string | null
          kyc_status: string | null
          last_login: string | null
          phone: string | null
          postal_code: string | null
          preferences: Json | null
          profile_image: string | null
          state: string | null
          total_bookings: number | null
          travel_styles: string[] | null
          updated_at: string
          wallet_balance: number | null
        }
        Insert: {
          address?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          dietary_requirements?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          id_document_number?: string | null
          id_document_type?: string | null
          kyc_status?: string | null
          last_login?: string | null
          phone?: string | null
          postal_code?: string | null
          preferences?: Json | null
          profile_image?: string | null
          state?: string | null
          total_bookings?: number | null
          travel_styles?: string[] | null
          updated_at?: string
          wallet_balance?: number | null
        }
        Update: {
          address?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          dietary_requirements?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          id_document_number?: string | null
          id_document_type?: string | null
          kyc_status?: string | null
          last_login?: string | null
          phone?: string | null
          postal_code?: string | null
          preferences?: Json | null
          profile_image?: string | null
          state?: string | null
          total_bookings?: number | null
          travel_styles?: string[] | null
          updated_at?: string
          wallet_balance?: number | null
        }
        Relationships: []
      }
      question_answers: {
        Row: {
          answer: string
          created_at: string
          id: string
          question_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          question_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          question_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "listing_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      resorts: {
        Row: {
          amenities: Json | null
          availability_status: boolean | null
          bathrooms: number | null
          bedrooms: number | null
          cancellation_policy: string | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          featured: boolean | null
          host_id: string
          id: string
          images: string[] | null
          location: string | null
          marketplace_requested: boolean
          marketplace_visible: boolean
          max_guests: number | null
          price_per_night: number | null
          property_type: string | null
          rating: number | null
          slug: string | null
          title: string | null
          total_reviews: number | null
        }
        Insert: {
          amenities?: Json | null
          availability_status?: boolean | null
          bathrooms?: number | null
          bedrooms?: number | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          featured?: boolean | null
          host_id: string
          id?: string
          images?: string[] | null
          location?: string | null
          marketplace_requested?: boolean
          marketplace_visible?: boolean
          max_guests?: number | null
          price_per_night?: number | null
          property_type?: string | null
          rating?: number | null
          slug?: string | null
          title?: string | null
          total_reviews?: number | null
        }
        Update: {
          amenities?: Json | null
          availability_status?: boolean | null
          bathrooms?: number | null
          bedrooms?: number | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          featured?: boolean | null
          host_id?: string
          id?: string
          images?: string[] | null
          location?: string | null
          marketplace_requested?: boolean
          marketplace_visible?: boolean
          max_guests?: number | null
          price_per_night?: number | null
          property_type?: string | null
          rating?: number | null
          slug?: string | null
          title?: string | null
          total_reviews?: number | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          images: string[] | null
          listing_id: string
          listing_type: Database["public"]["Enums"]["listing_type"]
          rating: number
          reply_from_host: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          images?: string[] | null
          listing_id: string
          listing_type: Database["public"]["Enums"]["listing_type"]
          rating: number
          reply_from_host?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          images?: string[] | null
          listing_id?: string
          listing_type?: Database["public"]["Enums"]["listing_type"]
          rating?: number
          reply_from_host?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stays: {
        Row: {
          amenities: Json | null
          availability_status: boolean | null
          bathrooms: number | null
          bedrooms: number | null
          booking_count: number | null
          cancellation_policy: string | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          currency: string | null
          description: string | null
          discounts: Json | null
          featured: boolean | null
          host_id: string
          id: string
          images: string[] | null
          is_verified: boolean | null
          last_booked_at: string | null
          latitude: number | null
          location: string
          longitude: number | null
          marketplace_requested: boolean
          marketplace_visible: boolean
          max_guests: number
          price_per_night: number
          property_type: string | null
          rating: number | null
          slug: string | null
          tags: string[] | null
          title: string
          total_reviews: number | null
          updated_at: string
          verified_by: string | null
          views_count: number | null
        }
        Insert: {
          amenities?: Json | null
          availability_status?: boolean | null
          bathrooms?: number | null
          bedrooms?: number | null
          booking_count?: number | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          discounts?: Json | null
          featured?: boolean | null
          host_id: string
          id?: string
          images?: string[] | null
          is_verified?: boolean | null
          last_booked_at?: string | null
          latitude?: number | null
          location: string
          longitude?: number | null
          marketplace_requested?: boolean
          marketplace_visible?: boolean
          max_guests: number
          price_per_night: number
          property_type?: string | null
          rating?: number | null
          slug?: string | null
          tags?: string[] | null
          title: string
          total_reviews?: number | null
          updated_at?: string
          verified_by?: string | null
          views_count?: number | null
        }
        Update: {
          amenities?: Json | null
          availability_status?: boolean | null
          bathrooms?: number | null
          bedrooms?: number | null
          booking_count?: number | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          discounts?: Json | null
          featured?: boolean | null
          host_id?: string
          id?: string
          images?: string[] | null
          is_verified?: boolean | null
          last_booked_at?: string | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          marketplace_requested?: boolean
          marketplace_visible?: boolean
          max_guests?: number
          price_per_night?: number
          property_type?: string | null
          rating?: number | null
          slug?: string | null
          tags?: string[] | null
          title?: string
          total_reviews?: number | null
          updated_at?: string
          verified_by?: string | null
          views_count?: number | null
        }
        Relationships: []
      }
      user_documents: {
        Row: {
          back_file_url: string | null
          document_number: string | null
          document_type: string
          front_file_url: string | null
          id: string
          uploaded_at: string
          user_id: string
          verification_status: string | null
          verified_at: string | null
        }
        Insert: {
          back_file_url?: string | null
          document_number?: string | null
          document_type: string
          front_file_url?: string | null
          id?: string
          uploaded_at?: string
          user_id: string
          verification_status?: string | null
          verified_at?: string | null
        }
        Update: {
          back_file_url?: string | null
          document_number?: string | null
          document_type?: string
          front_file_url?: string | null
          id?: string
          uploaded_at?: string
          user_id?: string
          verification_status?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      wishlists: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          listing_type: Database["public"]["Enums"]["listing_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          listing_type: Database["public"]["Enums"]["listing_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          listing_type?: Database["public"]["Enums"]["listing_type"]
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
      app_role: "admin" | "moderator" | "user" | "host"
      booking_status: "pending" | "confirmed" | "cancelled" | "completed"
      listing_type: "stay" | "car" | "bike" | "experience" | "hotel" | "resort"
      payment_status: "pending" | "completed" | "failed" | "refunded"
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
      app_role: ["admin", "moderator", "user", "host"],
      booking_status: ["pending", "confirmed", "cancelled", "completed"],
      listing_type: ["stay", "car", "bike", "experience", "hotel", "resort"],
      payment_status: ["pending", "completed", "failed", "refunded"],
    },
  },
} as const
