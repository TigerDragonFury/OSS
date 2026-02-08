export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          type: 'parent' | 'marine' | 'scrap'
          parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'parent' | 'marine' | 'scrap'
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'parent' | 'marine' | 'scrap'
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      vessels: {
        Row: {
          id: string
          name: string
          vessel_type: string | null
          purchase_price: number | null
          purchase_date: string | null
          status: 'active' | 'scrapping' | 'scrapped' | 'under_overhaul' | 'sold'
          current_location: string | null
          tonnage: number | null
          year_built: number | null
          classification_status: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          vessel_type?: string | null
          purchase_price?: number | null
          purchase_date?: string | null
          status?: 'active' | 'scrapping' | 'scrapped' | 'under_overhaul' | 'sold'
          current_location?: string | null
          tonnage?: number | null
          year_built?: number | null
          classification_status?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          vessel_type?: string | null
          purchase_price?: number | null
          purchase_date?: string | null
          status?: 'active' | 'scrapping' | 'scrapped' | 'under_overhaul' | 'sold'
          current_location?: string | null
          tonnage?: number | null
          year_built?: number | null
          classification_status?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      land_purchases: {
        Row: {
          id: string
          land_name: string
          location: string | null
          purchase_price: number | null
          purchase_date: string | null
          estimated_tonnage: number | null
          remaining_tonnage: number | null
          status: 'active' | 'partially_cleared' | 'completed'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          land_name: string
          location?: string | null
          purchase_price?: number | null
          purchase_date?: string | null
          estimated_tonnage?: number | null
          remaining_tonnage?: number | null
          status?: 'active' | 'partially_cleared' | 'completed'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          land_name?: string
          location?: string | null
          purchase_price?: number | null
          purchase_date?: string | null
          estimated_tonnage?: number | null
          remaining_tonnage?: number | null
          status?: 'active' | 'partially_cleared' | 'completed'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          employee_code: string
          full_name: string
          company_id: string | null
          position: string | null
          department: string | null
          hire_date: string | null
          salary: number | null
          salary_type: 'monthly' | 'daily' | 'hourly' | null
          status: 'active' | 'inactive' | 'terminated'
          email: string | null
          phone: string | null
          address: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_code: string
          full_name: string
          company_id?: string | null
          position?: string | null
          department?: string | null
          hire_date?: string | null
          salary?: number | null
          salary_type?: 'monthly' | 'daily' | 'hourly' | null
          status?: 'active' | 'inactive' | 'terminated'
          email?: string | null
          phone?: string | null
          address?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_code?: string
          full_name?: string
          company_id?: string | null
          position?: string | null
          department?: string | null
          hire_date?: string | null
          salary?: number | null
          salary_type?: 'monthly' | 'daily' | 'hourly' | null
          status?: 'active' | 'inactive' | 'terminated'
          email?: string | null
          phone?: string | null
          address?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          company_id: string | null
          invoice_type: 'income' | 'expense'
          client_name: string | null
          date: string
          due_date: string | null
          subtotal: number | null
          tax: number | null
          total: number | null
          status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          payment_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_number: string
          company_id?: string | null
          invoice_type: 'income' | 'expense'
          client_name?: string | null
          date: string
          due_date?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          payment_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string
          company_id?: string | null
          invoice_type?: 'income' | 'expense'
          client_name?: string | null
          date?: string
          due_date?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          payment_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          company_id: string | null
          expense_type: string | null
          category: string | null
          amount: number | null
          date: string
          vendor_name: string | null
          project_id: string | null
          project_type: 'vessel' | 'land' | 'general' | 'other' | null
          description: string | null
          receipt_url: string | null
          status: 'pending' | 'approved' | 'paid' | 'rejected'
          paid_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          expense_type?: string | null
          category?: string | null
          amount?: number | null
          date: string
          vendor_name?: string | null
          project_id?: string | null
          project_type?: 'vessel' | 'land' | 'general' | 'other' | null
          description?: string | null
          receipt_url?: string | null
          status?: 'pending' | 'approved' | 'paid' | 'rejected'
          paid_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          expense_type?: string | null
          category?: string | null
          amount?: number | null
          date?: string
          vendor_name?: string | null
          project_id?: string | null
          project_type?: 'vessel' | 'land' | 'general' | 'other' | null
          description?: string | null
          receipt_url?: string | null
          status?: 'pending' | 'approved' | 'paid' | 'rejected'
          paid_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      profit_loss_summary: {
        Row: {
          company_id: string
          company_name: string
          total_income: number
          total_expenses: number
          net_profit: number
        }
      }
      vessel_financial_summary: {
        Row: {
          id: string
          name: string
          purchase_price: number | null
          movement_costs: number
          equipment_sales: number
          scrap_sales: number
          drydock_costs: number
          overhaul_costs: number
          other_expenses: number
          net_profit_loss: number
        }
      }
      land_financial_summary: {
        Row: {
          id: string
          land_name: string
          purchase_price: number | null
          equipment_sales: number
          scrap_sales: number
          expenses: number
          net_profit_loss: number
          remaining_tonnage: number | null
        }
      }
    }
  }
}
