// Tipos de la base de datos, redactados a mano a partir de
// supabase/schema.sql (este entorno no tiene acceso a la CLI de Supabase
// autenticada contra el proyecto real). Sigue la misma forma que genera
// `supabase gen types typescript` para que sea un reemplazo directo el día
// que alguien con acceso corra ese comando.
//
// IMPORTANTE: hay que regenerar/actualizar este archivo después de cada
// migración nueva en supabase/migrations/. Ver app/README.md para el
// comando exacto.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          name: string;
          business_type: string | null;
          team_size: number | null;
          onboarding_completed: boolean | null;
          legal_name: string | null;
          tax_id: string | null;
          phone: string | null;
          address: string | null;
          logo_url: string | null;
          currency_symbol: string | null;
          tax_enabled: boolean | null;
          tax_percentage: number | null;
          tax_included_in_price: boolean | null;
          payment_methods: Json | null;
          global_low_stock_alert: boolean | null;
          website: string | null;
          language: string | null;
          theme: string | null;
          background_url: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          name?: string;
          business_type?: string | null;
          team_size?: number | null;
          onboarding_completed?: boolean | null;
          legal_name?: string | null;
          tax_id?: string | null;
          phone?: string | null;
          address?: string | null;
          logo_url?: string | null;
          currency_symbol?: string | null;
          tax_enabled?: boolean | null;
          tax_percentage?: number | null;
          tax_included_in_price?: boolean | null;
          payment_methods?: Json | null;
          global_low_stock_alert?: boolean | null;
          website?: string | null;
          language?: string | null;
          theme?: string | null;
          background_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['businesses']['Insert']>;
        Relationships: [];
      };
      business_members: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          role: string;
          employee_name: string | null;
          role_title: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          role?: string;
          employee_name?: string | null;
          role_title?: string | null;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['business_members']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'business_members_business_id_fkey';
            columns: ['business_id'];
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
        ];
      };
      business_settings: {
        Row: {
          business_id: string;
          pct_inventory: number | null;
          pct_operations: number | null;
          pct_savings: number | null;
          pct_personal: number | null;
          updated_at: string | null;
        };
        Insert: {
          business_id: string;
          pct_inventory?: number | null;
          pct_operations?: number | null;
          pct_savings?: number | null;
          pct_personal?: number | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['business_settings']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'business_settings_business_id_fkey';
            columns: ['business_id'];
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
        ];
      };
      employee_invites: {
        Row: {
          id: string;
          business_id: string;
          code: string;
          used: boolean | null;
          used_by: string | null;
          used_at: string | null;
          expires_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          code: string;
          used?: boolean | null;
          used_by?: string | null;
          used_at?: string | null;
          expires_at?: string | null;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['employee_invites']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'employee_invites_business_id_fkey';
            columns: ['business_id'];
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          phone: string | null;
          notes: string | null;
          address: string | null;
          email: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          phone?: string | null;
          notes?: string | null;
          address?: string | null;
          email?: string | null;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'customers_business_id_fkey';
            columns: ['business_id'];
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
        ];
      };
      /** Vestigio del módulo de Ventas/Inventario ya eliminado del frontend. */
      products: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          purchase_price: number | null;
          sale_price: number;
          stock: number;
          min_stock: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          purchase_price?: number | null;
          sale_price: number;
          stock?: number;
          min_stock?: number;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'products_business_id_fkey';
            columns: ['business_id'];
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
        ];
      };
      /** Vestigio del módulo de Ventas/Inventario ya eliminado del frontend. */
      sales: {
        Row: {
          id: string;
          business_id: string;
          items: Json;
          total: number;
          profit: number;
          payment_method: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          items?: Json;
          total?: number;
          profit?: number;
          payment_method?: string | null;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['sales']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'sales_business_id_fkey';
            columns: ['business_id'];
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
        ];
      };
      customer_credits: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string | null;
          sale_id: string | null;
          invoice_id: string | null;
          amount: number;
          amount_paid: number;
          status: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id?: string | null;
          sale_id?: string | null;
          invoice_id?: string | null;
          amount: number;
          amount_paid?: number;
          status?: string;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['customer_credits']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'customer_credits_business_id_fkey';
            columns: ['business_id'];
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'customer_credits_customer_id_fkey';
            columns: ['customer_id'];
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'customer_credits_invoice_id_fkey';
            columns: ['invoice_id'];
            referencedRelation: 'invoices';
            referencedColumns: ['id'];
          },
        ];
      };
      invoices: {
        Row: {
          id: string;
          business_id: string;
          sale_id: string | null;
          customer_id: string | null;
          appointment_id: string | null;
          invoice_number: string;
          customer_name: string | null;
          payment_method: string | null;
          subtotal: number;
          tax_amount: number;
          total: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          sale_id?: string | null;
          customer_id?: string | null;
          appointment_id?: string | null;
          invoice_number: string;
          customer_name?: string | null;
          payment_method?: string | null;
          subtotal: number;
          tax_amount?: number;
          total: number;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'invoices_business_id_fkey';
            columns: ['business_id'];
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_customer_id_fkey';
            columns: ['customer_id'];
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_appointment_id_fkey';
            columns: ['appointment_id'];
            referencedRelation: 'appointments';
            referencedColumns: ['id'];
          },
        ];
      };
      activity_log: {
        Row: {
          id: string;
          business_id: string;
          user_id: string | null;
          action: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id?: string | null;
          action: string;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['activity_log']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'activity_log_business_id_fkey';
            columns: ['business_id'];
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
        ];
      };
      services: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          category: string | null;
          duration_minutes: number;
          price: number;
          active: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          category?: string | null;
          duration_minutes?: number;
          price: number;
          active?: boolean | null;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['services']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'services_business_id_fkey';
            columns: ['business_id'];
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
        ];
      };
      specialist_services: {
        Row: {
          id: string;
          business_id: string;
          employee_id: string;
          service_id: string;
          commission_pct: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          employee_id: string;
          service_id: string;
          commission_pct?: number | null;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['specialist_services']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'specialist_services_business_id_fkey';
            columns: ['business_id'];
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'specialist_services_service_id_fkey';
            columns: ['service_id'];
            referencedRelation: 'services';
            referencedColumns: ['id'];
          },
        ];
      };
      appointments: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string | null;
          employee_id: string;
          service_id: string;
          service_ids: Json | null;
          start_at: string;
          end_at: string;
          status: string;
          price: number | null;
          notes: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id?: string | null;
          employee_id: string;
          service_id: string;
          service_ids?: Json | null;
          start_at: string;
          end_at: string;
          status?: string;
          price?: number | null;
          notes?: string | null;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'appointments_business_id_fkey';
            columns: ['business_id'];
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'appointments_customer_id_fkey';
            columns: ['customer_id'];
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'appointments_service_id_fkey';
            columns: ['service_id'];
            referencedRelation: 'services';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_current_business_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_current_business_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      redeem_invite_code: {
        Args: { input_code: string; input_employee_name: string };
        Returns: string;
      };
      get_my_business_access: {
        Args: Record<string, never>;
        Returns: {
          status: string;
          plan: string | null;
          expires_at: string | null;
          reason: string | null;
          is_super_admin: boolean;
          modules: string[];
          trial_plan: string | null;
        }[];
      };
      choose_trial_plan: {
        Args: { p_plan: string };
        Returns: string;
      };
      create_telegram_link_code: {
        Args: Record<string, never>;
        Returns: { code: string; expires_at: string }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
