// Hand-written DB types matching the Supabase schema (after migrations 001-004).

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Views: Record<string, never>
    Functions: Record<string, never>
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          role: 'admin' | 'staff'
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          role?: 'admin' | 'staff'
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: 'admin' | 'staff'
          created_at?: string
        }
        Relationships: []
      }

      residents: {
        Row: {
          id: string
          full_name: string
          nric: string | null
          date_of_birth: string | null
          gender: 'male' | 'female' | null
          condition: 'mobile' | 'wheelchair_bound' | 'bedridden' | null
          address: string | null
          admission_date: string
          date_of_discharge: string | null
          status: 'active' | 'discharged'
          physio: 'yes' | 'no' | 'foc' | 'alternate_day' | null
          physio_remark: string | null
          caregiver: string | null
          include_misc: boolean | null
          pay_day: number | null
          fee: number | null
          account: 'quickbook' | 'cash' | null
          package_remark: string | null
          health_condition: string | null
          health_remark: string | null
          caregiver_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          nric?: string | null
          date_of_birth?: string | null
          gender?: 'male' | 'female' | null
          condition?: 'mobile' | 'wheelchair_bound' | 'bedridden' | null
          address?: string | null
          admission_date: string
          date_of_discharge?: string | null
          status?: 'active' | 'discharged'
          physio?: 'yes' | 'no' | 'foc' | 'alternate_day' | null
          physio_remark?: string | null
          caregiver?: string | null
          include_misc?: boolean | null
          pay_day?: number | null
          fee?: number | null
          account?: 'quickbook' | 'cash' | null
          package_remark?: string | null
          health_condition?: string | null
          health_remark?: string | null
          caregiver_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          nric?: string | null
          date_of_birth?: string | null
          gender?: 'male' | 'female' | null
          condition?: 'mobile' | 'wheelchair_bound' | 'bedridden' | null
          address?: string | null
          admission_date?: string
          date_of_discharge?: string | null
          status?: 'active' | 'discharged'
          physio?: 'yes' | 'no' | 'foc' | 'alternate_day' | null
          physio_remark?: string | null
          caregiver?: string | null
          include_misc?: boolean | null
          pay_day?: number | null
          fee?: number | null
          account?: 'quickbook' | 'cash' | null
          package_remark?: string | null
          health_condition?: string | null
          health_remark?: string | null
          caregiver_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }

      charge_items: {
        Row: {
          id: string
          name: string
          default_price: number
          unit: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          default_price?: number
          unit?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          default_price?: number
          unit?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }

      resident_charge_prices: {
        Row: {
          resident_id: string
          charge_item_id: string
          price: number
        }
        Insert: {
          resident_id: string
          charge_item_id: string
          price: number
        }
        Update: {
          resident_id?: string
          charge_item_id?: string
          price?: number
        }
        Relationships: []
      }

      extra_charges: {
        Row: {
          id: string
          resident_id: string
          charge_item_id: string | null
          billing_month: string
          charge_date: string | null
          description: string
          amount: number
          quantity: number
          notes: string | null
          created_by: string | null
          created_at: string
          recurring_charge_id: string | null
        }
        Insert: {
          id?: string
          resident_id: string
          charge_item_id?: string | null
          billing_month: string
          charge_date?: string | null
          description: string
          amount: number
          quantity?: number
          notes?: string | null
          created_by?: string | null
          created_at?: string
          recurring_charge_id?: string | null
        }
        Update: {
          id?: string
          resident_id?: string
          charge_item_id?: string | null
          billing_month?: string
          charge_date?: string | null
          description?: string
          amount?: number
          quantity?: number
          notes?: string | null
          created_by?: string | null
          created_at?: string
          recurring_charge_id?: string | null
        }
        Relationships: []
      }

      resident_recurring_charges: {
        Row: {
          id: string
          resident_id: string
          charge_item_id: string | null
          description: string
          amount: number
          active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          resident_id: string
          charge_item_id?: string | null
          description: string
          amount?: number
          active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          resident_id?: string
          charge_item_id?: string | null
          description?: string
          amount?: number
          active?: boolean
          sort_order?: number
        }
        Relationships: []
      }

      emergency_contacts: {
        Row: {
          id: string
          resident_id: string
          name: string
          relationship: string
          phone: string
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          resident_id: string
          name: string
          relationship: string
          phone: string
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          resident_id?: string
          name?: string
          relationship?: string
          phone?: string
          is_primary?: boolean
        }
        Relationships: []
      }

      care_notes: {
        Row: {
          id: string
          resident_id: string
          author_id: string
          note_text: string
          note_date: string
          created_at: string
        }
        Insert: {
          id?: string
          resident_id: string
          author_id: string
          note_text: string
          note_date: string
          created_at?: string
        }
        Update: {
          id?: string
          resident_id?: string
          author_id?: string
          note_text?: string
          note_date?: string
        }
        Relationships: []
      }

      positions: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: { id?: string; name: string; created_at?: string }
        Update: { id?: string; name?: string }
        Relationships: []
      }

      bank_imports: {
        Row: {
          id: string
          file_name: string
          statement_from: string | null
          statement_to: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          id?: string
          file_name: string
          statement_from?: string | null
          statement_to?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          id?: string
          file_name?: string
          statement_from?: string | null
          statement_to?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }

      payments: {
        Row: {
          id: string
          resident_id: string | null
          payment_date: string
          amount: number
          payment_method: string
          payer_name: string | null
          reference: string | null
          description: string | null
          notes: string | null
          for_month: string | null
          full_payment: boolean | null
          source: string
          bank_import_id: string | null
          txn_key: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          resident_id?: string | null
          payment_date: string
          amount: number
          payment_method?: string
          payer_name?: string | null
          reference?: string | null
          description?: string | null
          notes?: string | null
          for_month?: string | null
          full_payment?: boolean | null
          source?: string
          bank_import_id?: string | null
          txn_key?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          resident_id?: string | null
          payment_date?: string
          amount?: number
          payment_method?: string
          payer_name?: string | null
          reference?: string | null
          description?: string | null
          notes?: string | null
          for_month?: string | null
          full_payment?: boolean | null
          source?: string
          bank_import_id?: string | null
          txn_key?: string | null
          created_at?: string
          created_by?: string | null
        }
        Relationships: []
      }

      payer_mappings: {
        Row: {
          id: string
          payer_key: string
          resident_id: string
          created_at: string
        }
        Insert: {
          id?: string
          payer_key: string
          resident_id: string
          created_at?: string
        }
        Update: {
          id?: string
          payer_key?: string
          resident_id?: string
        }
        Relationships: []
      }

      driver_payouts: {
        Row: {
          id: string
          worker_id: string | null
          notes: string | null
          finalized: boolean
          created_at: string
        }
        Insert: {
          id?: string
          worker_id?: string | null
          notes?: string | null
          finalized?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          worker_id?: string | null
          notes?: string | null
          finalized?: boolean
          created_at?: string
        }
        Relationships: []
      }

      driver_payout_trips: {
        Row: {
          id: string
          payout_id: string
          trip_date: string | null
          description: string
          transport_amount: number
          bill_amount: number
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          payout_id: string
          trip_date?: string | null
          description: string
          transport_amount?: number
          bill_amount?: number
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          payout_id?: string
          trip_date?: string | null
          description?: string
          transport_amount?: number
          bill_amount?: number
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }

      workers: {
        Row: {
          id: string
          worker_type: 'local' | 'foreign'
          status: 'active' | 'inactive'
          name: string
          gender: 'male' | 'female' | null
          date_of_birth: string | null
          contact_number: string | null
          date_start_work: string | null
          date_end_work: string | null
          current_salary: number | null
          remark: string | null
          nric: string | null
          position_id: string | null
          address: string | null
          bank: string | null
          bank_account_number: string | null
          kwsp: string | null
          country_of_origin: string | null
          passport_number: string | null
          passport_expiry: string | null
          passport_permit_date: string | null
          majikan: string | null
          majikan_email: string | null
          typhoid_vaccine_expiry: string | null
          nickname: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          worker_type: 'local' | 'foreign'
          status?: 'active' | 'inactive'
          name: string
          gender?: 'male' | 'female' | null
          date_of_birth?: string | null
          contact_number?: string | null
          date_start_work?: string | null
          date_end_work?: string | null
          current_salary?: number | null
          remark?: string | null
          nric?: string | null
          position_id?: string | null
          address?: string | null
          bank?: string | null
          bank_account_number?: string | null
          kwsp?: string | null
          country_of_origin?: string | null
          passport_number?: string | null
          passport_expiry?: string | null
          passport_permit_date?: string | null
          majikan?: string | null
          majikan_email?: string | null
          typhoid_vaccine_expiry?: string | null
          nickname?: string | null
        }
        Update: {
          id?: string
          worker_type?: 'local' | 'foreign'
          status?: 'active' | 'inactive'
          name?: string
          gender?: 'male' | 'female' | null
          date_of_birth?: string | null
          contact_number?: string | null
          date_start_work?: string | null
          date_end_work?: string | null
          current_salary?: number | null
          remark?: string | null
          nric?: string | null
          position_id?: string | null
          address?: string | null
          bank?: string | null
          bank_account_number?: string | null
          kwsp?: string | null
          country_of_origin?: string | null
          passport_number?: string | null
          passport_expiry?: string | null
          passport_permit_date?: string | null
          majikan?: string | null
          majikan_email?: string | null
          typhoid_vaccine_expiry?: string | null
          nickname?: string | null
        }
        Relationships: []
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Resident = Database['public']['Tables']['residents']['Row']
export type EmergencyContact = Database['public']['Tables']['emergency_contacts']['Row']
export type CareNote = Database['public']['Tables']['care_notes']['Row']
export type Position = Database['public']['Tables']['positions']['Row']
export type Worker = Database['public']['Tables']['workers']['Row']

export type WorkerWithPosition = Worker & { positions: Pick<Position, 'name'> | null }

export type CareNoteWithAuthor = CareNote & {
  profiles: Pick<Profile, 'full_name'>
}
