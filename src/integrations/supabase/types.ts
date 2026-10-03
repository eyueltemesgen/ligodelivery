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
      addresses: {
        Row: {
          address: string
          area: string | null
          city: string
          created_at: string
          full_name: string | null
          id: string
          instructions: string | null
          is_default: boolean
          label: string
          lat: number | null
          lng: number | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          area?: string | null
          city?: string
          created_at?: string
          full_name?: string | null
          id?: string
          instructions?: string | null
          is_default?: boolean
          label?: string
          lat?: number | null
          lng?: number | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          area?: string | null
          city?: string
          created_at?: string
          full_name?: string | null
          id?: string
          instructions?: string | null
          is_default?: boolean
          label?: string
          lat?: number | null
          lng?: number | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_bootstrap: {
        Row: {
          completed_at: string
          id: boolean
        }
        Insert: {
          completed_at?: string
          id?: boolean
        }
        Update: {
          completed_at?: string
          id?: boolean
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          cta_label: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          placement: string
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          placement?: string
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          placement?: string
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_order_amount: number
          starts_at: string | null
          updated_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_amount?: number
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_amount?: number
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      merchant_payouts: {
        Row: {
          commission_amount: number
          created_at: string
          gross_amount: number
          id: string
          merchant_id: string
          net_amount: number
          notes: string | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          reference: string | null
          status: string
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          gross_amount?: number
          id?: string
          merchant_id: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          reference?: string | null
          status?: string
        }
        Update: {
          commission_amount?: number
          created_at?: string
          gross_amount?: number
          id?: string
          merchant_id?: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_payouts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchant_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_profiles: {
        Row: {
          address: string | null
          business_description: string | null
          business_name: string
          business_phone: string | null
          category_id: string | null
          city: string
          closes_at: string
          commission_percent: number | null
          contact_email: string | null
          contact_phone: string | null
          cover_url: string | null
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          logo_url: string | null
          opens_at: string
          owner_name: string
          review_notes: string | null
          shop_id: string | null
          status: string
          terms_accepted_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_description?: string | null
          business_name: string
          business_phone?: string | null
          category_id?: string | null
          city?: string
          closes_at?: string
          commission_percent?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string
          id: string
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          opens_at?: string
          owner_name: string
          review_notes?: string | null
          shop_id?: string | null
          status?: string
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_description?: string | null
          business_name?: string
          business_phone?: string | null
          category_id?: string | null
          city?: string
          closes_at?: string
          commission_percent?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          opens_at?: string
          owner_name?: string
          review_notes?: string | null
          shop_id?: string | null
          status?: string
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_profiles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_profiles_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_promotions: {
        Row: {
          admin_notes: string | null
          created_at: string
          ends_at: string | null
          id: string
          kind: string
          merchant_id: string
          message: string | null
          price: number | null
          product_id: string | null
          shop_id: string | null
          starts_at: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          kind?: string
          merchant_id: string
          message?: string | null
          price?: number | null
          product_id?: string | null
          shop_id?: string | null
          starts_at?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          kind?: string
          merchant_id?: string
          message?: string | null
          price?: number | null
          product_id?: string | null
          shop_id?: string | null
          starts_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_promotions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchant_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_promotions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          order_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          order_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          order_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          product_id: string | null
          shop_id: string | null
          starts_at: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          product_id?: string | null
          shop_id?: string | null
          starts_at?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          product_id?: string | null
          shop_id?: string | null
          starts_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          commission_amount: number
          commission_percent: number
          coupon_code: string | null
          coupon_id: string | null
          created_at: string
          customer_id: string
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_fee: number
          delivery_instructions: string | null
          delivery_pin: string | null
          discount: number
          dispatched_at: string | null
          id: string
          lat: number | null
          lng: number | null
          merchant_net: number
          order_code: string
          order_type: string
          payment_method: string
          payment_status: string
          rider_id: string | null
          rider_payout: number
          shop_id: string | null
          status: string
          subtotal: number
          tip: number
          total: number
          updated_at: string
        }
        Insert: {
          commission_amount?: number
          commission_percent?: number
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_id: string
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          delivery_instructions?: string | null
          delivery_pin?: string | null
          discount?: number
          dispatched_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          merchant_net?: number
          order_code?: string
          order_type?: string
          payment_method?: string
          payment_status?: string
          rider_id?: string | null
          rider_payout?: number
          shop_id?: string | null
          status?: string
          subtotal?: number
          tip?: number
          total?: number
          updated_at?: string
        }
        Update: {
          commission_amount?: number
          commission_percent?: number
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_id?: string
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          delivery_instructions?: string | null
          delivery_pin?: string | null
          discount?: number
          dispatched_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          merchant_net?: number
          order_code?: string
          order_type?: string
          payment_method?: string
          payment_status?: string
          rider_id?: string | null
          rider_payout?: number
          shop_id?: string | null
          status?: string
          subtotal?: number
          tip?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_proofs: {
        Row: {
          admin_note: string | null
          amount: number | null
          created_at: string
          id: string
          image_url: string | null
          method: string
          order_id: string
          reference: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          method: string
          order_id: string
          reference?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          method?: string
          order_id?: string
          reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          processed_at: string | null
          rider_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          processed_at?: string | null
          rider_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          processed_at?: string | null
          rider_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          discount_percent: number
          id: string
          image_url: string | null
          in_stock: boolean
          is_active: boolean
          is_featured: boolean
          is_popular: boolean
          name: string
          price: number
          shop_id: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          discount_percent?: number
          id?: string
          image_url?: string | null
          in_stock?: boolean
          is_active?: boolean
          is_featured?: boolean
          is_popular?: boolean
          name: string
          price?: number
          shop_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          discount_percent?: number
          id?: string
          image_url?: string | null
          in_stock?: boolean
          is_active?: boolean
          is_featured?: boolean
          is_popular?: boolean
          name?: string
          price?: number
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rider_earnings: {
        Row: {
          amount: number
          base_fare: number
          bonus: number
          created_at: string
          distance_incentive: number
          distance_km: number
          id: string
          order_id: string | null
          payout_request_id: string | null
          rider_id: string
          status: string
          tip: number
          updated_at: string
        }
        Insert: {
          amount?: number
          base_fare?: number
          bonus?: number
          created_at?: string
          distance_incentive?: number
          distance_km?: number
          id?: string
          order_id?: string | null
          payout_request_id?: string | null
          rider_id: string
          status?: string
          tip?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          base_fare?: number
          bonus?: number
          created_at?: string
          distance_incentive?: number
          distance_km?: number
          id?: string
          order_id?: string | null
          payout_request_id?: string | null
          rider_id?: string
          status?: string
          tip?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_earnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_earnings_payout_request_id_fkey"
            columns: ["payout_request_id"]
            isOneToOne: false
            referencedRelation: "payout_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_earnings_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_offer_events: {
        Row: {
          created_at: string
          event: string
          id: string
          order_id: string
          rider_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          order_id: string
          rider_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          order_id?: string
          rider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_offer_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_offer_events_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_ratings: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          order_id: string
          rating: number
          rider_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          order_id: string
          rating: number
          rider_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string
          rating?: number
          rider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_ratings_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      riders: {
        Row: {
          battery: number | null
          commission_tier: string
          created_at: string
          id: string
          id_document_url: string | null
          is_approved: boolean
          is_online: boolean
          lat: number | null
          license_document_url: string | null
          lng: number | null
          location_updated_at: string | null
          national_id: string | null
          notes: string | null
          payout_account: string | null
          payout_account_name: string | null
          payout_method: string
          review_notes: string | null
          speed: number | null
          updated_at: string
          vehicle_type: string
          verification_status: string
        }
        Insert: {
          battery?: number | null
          commission_tier?: string
          created_at?: string
          id: string
          id_document_url?: string | null
          is_approved?: boolean
          is_online?: boolean
          lat?: number | null
          license_document_url?: string | null
          lng?: number | null
          location_updated_at?: string | null
          national_id?: string | null
          notes?: string | null
          payout_account?: string | null
          payout_account_name?: string | null
          payout_method?: string
          review_notes?: string | null
          speed?: number | null
          updated_at?: string
          vehicle_type?: string
          verification_status?: string
        }
        Update: {
          battery?: number | null
          commission_tier?: string
          created_at?: string
          id?: string
          id_document_url?: string | null
          is_approved?: boolean
          is_online?: boolean
          lat?: number | null
          license_document_url?: string | null
          lng?: number | null
          location_updated_at?: string | null
          national_id?: string | null
          notes?: string | null
          payout_account?: string | null
          payout_account_name?: string | null
          payout_method?: string
          review_notes?: string | null
          speed?: number | null
          updated_at?: string
          vehicle_type?: string
          verification_status?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          is_public: boolean
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          is_public?: boolean
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      shop_favorites: {
        Row: {
          created_at: string
          id: string
          shop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          shop_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_favorites_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_hours: {
        Row: {
          closes_at: string
          created_at: string
          day_of_week: number
          id: string
          is_closed: boolean
          opens_at: string
          shop_id: string
          updated_at: string
        }
        Insert: {
          closes_at?: string
          created_at?: string
          day_of_week: number
          id?: string
          is_closed?: boolean
          opens_at?: string
          shop_id: string
          updated_at?: string
        }
        Update: {
          closes_at?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_closed?: boolean
          opens_at?: string
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_hours_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string | null
          category_id: string | null
          closes_at: string
          cover_url: string | null
          created_at: string
          delivery_fee: number
          delivery_time_min: number
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          is_online: boolean
          lat: number | null
          lng: number | null
          name: string
          opens_at: string
          owner_id: string | null
          phone: string | null
          rating: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          category_id?: string | null
          closes_at?: string
          cover_url?: string | null
          created_at?: string
          delivery_fee?: number
          delivery_time_min?: number
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_online?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          opens_at?: string
          owner_id?: string | null
          phone?: string | null
          rating?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          category_id?: string | null
          closes_at?: string
          cover_url?: string | null
          created_at?: string
          delivery_fee?: number
          delivery_time_min?: number
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_online?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          opens_at?: string
          owner_id?: string | null
          phone?: string | null
          rating?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shops_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
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
      wishlist: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          addons: Json
          anonymous_option: boolean
          cover_url: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          images: Json
          includes: Json
          is_active: boolean
          is_featured: boolean
          lead_time_hours: number
          max_guests: number | null
          min_guests: number | null
          name: string
          occasions: string[]
          preparation_hours: number | null
          price: number
          price_unit: string | null
          pricing_type: string
          rating: number
          requires_location: boolean
          requires_recipient: boolean
          requires_schedule: boolean
          review_count: number
          service_area: string | null
          service_category_id: string
          shop_id: string
          slug: string | null
          sort_order: number
          starting_price: number | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          addons?: Json
          anonymous_option?: boolean
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          images?: Json
          includes?: Json
          is_active?: boolean
          is_featured?: boolean
          lead_time_hours?: number
          max_guests?: number | null
          min_guests?: number | null
          name: string
          occasions?: string[]
          preparation_hours?: number | null
          price?: number
          price_unit?: string | null
          pricing_type?: string
          rating?: number
          requires_location?: boolean
          requires_recipient?: boolean
          requires_schedule?: boolean
          review_count?: number
          service_area?: string | null
          service_category_id: string
          shop_id: string
          slug?: string | null
          sort_order?: number
          starting_price?: number | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          addons?: Json
          anonymous_option?: boolean
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          images?: Json
          includes?: Json
          is_active?: boolean
          is_featured?: boolean
          lead_time_hours?: number
          max_guests?: number | null
          min_guests?: number | null
          name?: string
          occasions?: string[]
          preparation_hours?: number | null
          price?: number
          price_unit?: string | null
          pricing_type?: string
          rating?: number
          requires_location?: boolean
          requires_recipient?: boolean
          requires_schedule?: boolean
          review_count?: number
          service_area?: string | null
          service_category_id?: string
          shop_id?: string
          slug?: string | null
          sort_order?: number
          starting_price?: number | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_service_category_id_fkey"
            columns: ["service_category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      service_options: {
        Row: {
          created_at: string
          description: string | null
          group_name: string | null
          id: string
          is_active: boolean
          name: string
          option_type: string
          price_delta: number
          service_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_name?: string | null
          id?: string
          is_active?: boolean
          name: string
          option_type?: string
          price_delta?: number
          service_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          group_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
          option_type?: string
          price_delta?: number
          service_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_options_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          admin_notes: string | null
          budget: number | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          customer_id: string
          customer_name: string | null
          customer_phone: string | null
          customization: Json
          event_date: string | null
          event_time: string | null
          event_type: string | null
          guest_count: number | null
          id: string
          keep_sender_anonymous: boolean
          lat: number | null
          lng: number | null
          location: string | null
          message: string | null
          order_id: string | null
          payment_method: string | null
          payment_status: string
          pricing_type: string
          quoted_amount: number | null
          quoted_at: string | null
          quoted_notes: string | null
          recipient_name: string | null
          recipient_phone: string | null
          request_code: string
          scheduled_at: string | null
          service_category_slug: string | null
          service_id: string | null
          service_name: string
          shop_id: string | null
          special_instructions: string | null
          status: string
          subtotal: number
          theme: string | null
          total: number
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          budget?: number | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          customer_name?: string | null
          customer_phone?: string | null
          customization?: Json
          event_date?: string | null
          event_time?: string | null
          event_type?: string | null
          guest_count?: number | null
          id?: string
          keep_sender_anonymous?: boolean
          lat?: number | null
          lng?: number | null
          location?: string | null
          message?: string | null
          order_id?: string | null
          payment_method?: string | null
          payment_status?: string
          pricing_type?: string
          quoted_amount?: number | null
          quoted_at?: string | null
          quoted_notes?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          request_code?: string
          scheduled_at?: string | null
          service_category_slug?: string | null
          service_id?: string | null
          service_name: string
          shop_id?: string | null
          special_instructions?: string | null
          status?: string
          subtotal?: number
          theme?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          budget?: number | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          customer_name?: string | null
          customer_phone?: string | null
          customization?: Json
          event_date?: string | null
          event_time?: string | null
          event_type?: string | null
          guest_count?: number | null
          id?: string
          keep_sender_anonymous?: boolean
          lat?: number | null
          lng?: number | null
          location?: string | null
          message?: string | null
          order_id?: string | null
          payment_method?: string | null
          payment_status?: string
          pricing_type?: string
          quoted_amount?: number | null
          quoted_at?: string | null
          quoted_notes?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          request_code?: string
          scheduled_at?: string | null
          service_category_slug?: string | null
          service_id?: string | null
          service_name?: string
          shop_id?: string | null
          special_instructions?: string | null
          status?: string
          subtotal?: number
          theme?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      service_request_items: {
        Row: {
          created_at: string
          id: string
          name: string
          option_id: string | null
          quantity: number
          request_id: string
          service_id: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          option_id?: string | null
          quantity?: number
          request_id: string
          service_id?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          option_id?: string | null
          quantity?: number
          request_id?: string
          service_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_request_items_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "service_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_request_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      advertisers: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          shop_id: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          shop_id?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          shop_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertisers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_campaigns: {
        Row: {
          advertiser_id: string | null
          budget: number | null
          created_at: string
          end_date: string | null
          id: string
          name: string
          notes: string | null
          objective: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          advertiser_id?: string | null
          budget?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          objective?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          advertiser_id?: string | null
          budget?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          objective?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_placements: {
        Row: {
          aspect_ratio: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          layout: string
          max_ads: number
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          aspect_ratio?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          layout?: string
          max_ads?: number
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          aspect_ratio?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          layout?: string
          max_ads?: number
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ad_packages: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number
          id: string
          is_active: boolean
          name: string
          placements: string[]
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          name: string
          placements?: string[]
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          name?: string
          placements?: string[]
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ads: {
        Row: {
          ad_type: string
          advertiser_id: string | null
          campaign_id: string | null
          created_at: string
          cta_label: string | null
          end_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_type: string
          link_value: string | null
          name: string
          placement_key: string
          priority: number
          sort_order: number
          start_at: string | null
          status: string
          subtitle: string | null
          target_category_id: string | null
          target_device: string
          target_location: string | null
          target_page: string | null
          target_product_id: string | null
          target_service_category_slug: string | null
          target_shop_id: string | null
          title: string | null
          updated_at: string
          weight: number
        }
        Insert: {
          ad_type?: string
          advertiser_id?: string | null
          campaign_id?: string | null
          created_at?: string
          cta_label?: string | null
          end_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_type?: string
          link_value?: string | null
          name: string
          placement_key: string
          priority?: number
          sort_order?: number
          start_at?: string | null
          status?: string
          subtitle?: string | null
          target_category_id?: string | null
          target_device?: string
          target_location?: string | null
          target_page?: string | null
          target_product_id?: string | null
          target_service_category_slug?: string | null
          target_shop_id?: string | null
          title?: string | null
          updated_at?: string
          weight?: number
        }
        Update: {
          ad_type?: string
          advertiser_id?: string | null
          campaign_id?: string | null
          created_at?: string
          cta_label?: string | null
          end_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_type?: string
          link_value?: string | null
          name?: string
          placement_key?: string
          priority?: number
          sort_order?: number
          start_at?: string | null
          status?: string
          subtitle?: string | null
          target_category_id?: string | null
          target_device?: string
          target_location?: string | null
          target_page?: string | null
          target_product_id?: string | null
          target_service_category_slug?: string | null
          target_shop_id?: string | null
          title?: string | null
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "ads_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_placement_key_fkey"
            columns: ["placement_key"]
            isOneToOne: false
            referencedRelation: "ad_placements"
            referencedColumns: ["key"]
          },
        ]
      }
      ad_impressions: {
        Row: {
          ad_id: string
          bucket_hour: string
          created_at: string
          device: string | null
          id: string
          page_path: string | null
          placement_key: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          ad_id: string
          bucket_hour?: string
          created_at?: string
          device?: string | null
          id?: string
          page_path?: string | null
          placement_key?: string
          session_id?: string
          user_id?: string | null
        }
        Update: {
          ad_id?: string
          bucket_hour?: string
          created_at?: string
          device?: string | null
          id?: string
          page_path?: string | null
          placement_key?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_clicks: {
        Row: {
          ad_id: string
          bucket_hour: string
          created_at: string
          device: string | null
          id: string
          page_path: string | null
          placement_key: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          ad_id: string
          bucket_hour?: string
          created_at?: string
          device?: string | null
          id?: string
          page_path?: string | null
          placement_key?: string
          session_id?: string
          user_id?: string | null
        }
        Update: {
          ad_id?: string
          bucket_hour?: string
          created_at?: string
          device?: string | null
          id?: string
          page_path?: string | null
          placement_key?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_clicks_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_ad_analytics: {
        Args: { p_from?: string | undefined; p_to?: string | undefined }
        Returns: {
          ad_id: string
          ad_name: string
          ad_type: string
          advertiser_name: string | null
          campaign_name: string | null
          clicks: number
          ctr: number
          impressions: number
          placement_key: string
          status: string
        }[]
      }
      accept_order: { Args: { _order_id: string }; Returns: undefined }
      accept_service_quote: { Args: { p_request_id: string }; Returns: string }
      approve_and_dispatch: { Args: { _order_id: string }; Returns: undefined }
      cancel_service_request: { Args: { p_request_id: string }; Returns: undefined }
      check_coupon: {
        Args: { p_code: string; p_delivery_fee: number; p_subtotal: number }
        Returns: Json
      }
      complete_delivery: {
        Args: { _order_id: string; _pin: string }
        Returns: undefined
      }
      eligible_ads: {
        Args: {
          p_category?: string | undefined
          p_device?: string | undefined
          p_limit?: number | undefined
          p_location?: string | undefined
          p_page?: string | undefined
          p_placement: string
          p_product?: string | undefined
          p_service_type?: string | undefined
          p_shop?: string | undefined
        }
        Returns: Database["public"]["Tables"]["ads"]["Row"][]
      }
      record_ad_click: {
        Args: {
          p_ad_id: string
          p_device?: string | undefined
          p_path?: string | undefined
          p_placement?: string | undefined
          p_session?: string | undefined
        }
        Returns: undefined
      }
      record_ad_impression: {
        Args: {
          p_ad_id: string
          p_device?: string | undefined
          p_path?: string | undefined
          p_placement?: string | undefined
          p_session?: string | undefined
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_approved_merchant: { Args: { _uid: string }; Returns: boolean }
      merchant_commission_percent: { Args: { _uid: string }; Returns: number }
      owns_shop: { Args: { _shop: string }; Returns: boolean }
      place_order: {
        Args: {
          p_coupon_code?: string
          p_customer_name?: string
          p_customer_phone?: string
          p_delivery_address?: string
          p_delivery_instructions?: string
          p_items: Json
          p_payment_method: string
          p_shop_id: string
          p_tip?: number
        }
        Returns: string
      }
      review_merchant: {
        Args: { _merchant: string; _notes?: string; _status: string }
        Returns: undefined
      }
      set_merchant_commission: {
        Args: { _merchant: string; _percent: number }
        Returns: undefined
      }
      submit_service_request: {
        Args: {
          p_budget?: number
          p_customization?: Json
          p_customer_name?: string
          p_customer_phone?: string
          p_event_date?: string
          p_event_time?: string
          p_event_type?: string
          p_guest_count?: number
          p_keep_sender_anonymous?: boolean
          p_location?: string
          p_message?: string
          p_option_ids?: string[]
          p_payment_method?: string
          p_recipient_name?: string
          p_recipient_phone?: string
          p_service_id: string
          p_special_instructions?: string
          p_theme?: string
        }
        Returns: string
      }
      submit_merchant_application: {
        Args: {
          _address: string
          _business_description: string
          _business_name: string
          _business_phone: string
          _category_id: string
          _city: string
          _closes_at: string
          _contact_phone: string
          _cover_url: string
          _lat: number
          _lng: number
          _logo_url: string
          _opens_at: string
          _owner_name: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "rider" | "customer" | "merchant"
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
      app_role: ["admin", "rider", "customer", "merchant"],
    },
  },
} as const
