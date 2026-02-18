'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthContext'
import { hasModulePermission } from '@/lib/auth/rolePermissions'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import {
  Plus, Edit2, Trash2, TrendingUp, Clock, FileText,
  Eye, CheckCircle, ArrowRight, Printer, Banknote, RotateCcw, RefreshCw
} from 'lucide-react'

// ...”€...”€...”€ Types ...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€
interface InvoiceItem {
  id?: string
  item_type: 'equipment_sale' | 'scrap_sale' | 'vessel_rental' | 'service' | 'other'
  description: string
  quantity: number
  unit: string
  unit_price: number
  total_price: number
  warehouse_id?: string
  land_equipment_id?: string
  land_id?: string
  material_type?: string
  vessel_id?: string
  sort_order: number
}

interface Invoice {
  id: string
  invoice_number: string
  company_id?: string
  client_name?: string
  date: string
  due_date?: string
  status: string
  invoice_type: string
  payment_terms?: string
  deposit_percent?: number
  subtotal: number
  tax: number
  total: number
  notes?: string
  payment_method?: string
  companies?: { name: string }
  invoice_items?: InvoiceItem[]
  // deposit tracking
  deposit_paid?: boolean
  deposit_paid_amount?: number
  deposit_paid_date?: string
  deposit_payment_method?: string
  deposit_destination?: string
  deposit_refunded?: boolean
  deposit_refund_date?: string
  deposit_refund_method?: string
  deposit_refund_source?: string
  deposit_refund_notes?: string
  deposit_kept_as_income?: boolean
  deposit_bank_account_id?: string
  deposit_refund_bank_account_id?: string
  payment_bank_account_id?: string
}

export default function InvoicesPage() {
  const [viewing, setViewing] = useState<Invoice | null>(null)
  const [editing, setEditing] = useState<Invoice | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [depositInvoice, setDepositInvoice] = useState<Invoice | null>(null)
  const [refundInvoice, setRefundInvoice] = useState<Invoice | null>(null)
  const [refundSaleInvoice, setRefundSaleInvoice] = useState<Invoice | null>(null)
  const [markPaidInvoice, setMarkPaidInvoice] = useState<Invoice | null>(null)
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { user } = useAuth()

  const userRole = user?.role || user?.roles?.[0] || 'storekeeper'
  const canCreate = hasModulePermission(userRole, ['finance', 'invoices'], 'create')
  const canEdit   = hasModulePermission(userRole, ['finance', 'invoices'], 'edit')
  const canDelete = hasModulePermission(userRole, ['finance', 'invoices'], 'delete')

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', filterStatus, filterType],
    queryFn: async () => {
      let q = supabase
        .from('invoices')
        .select('*, companies(name), invoice_items(*)')
        .order('date', { ascending: false })
      if (filterStatus !== 'all') q = q.eq('status', filterStatus)
      if (filterType   !== 'all') q = q.eq('invoice_type', filterType)
      const { data, error } = await q
      if (error) throw error
      return data as Invoice[]
    }
  })

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('*').order('name')
      return data || []
    }
  })

  const { data: bankAccounts } = useQuery({
    queryKey: ['bank_accounts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('bank_accounts')
        .select('id, account_name, bank_name, account_type')
        .eq('status', 'active')
        .order('account_name')
      return (data || []) as { id: string; account_name: string; bank_name: string; account_type: string }[]
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // 1. Fetch the invoice and its items so we can reverse all side-effects
      const [{ data: inv }, { data: items }] = await Promise.all([
        supabase.from('invoices').select('*').eq('id', id).single(),
        supabase.from('invoice_items')
          .select('item_type, land_equipment_id, warehouse_id, land_id, quantity')
          .eq('invoice_id', id),
      ])

      // 2. If the invoice was fully paid → remove income record + reverse item side-effects
      if (inv?.status === 'paid') {
        await supabase.from('income_records').delete().eq('reference_id', id)

        for (const item of (items || [])) {
          // Restock equipment — restore quantity and status
          if (item.item_type === 'equipment_sale' && item.land_equipment_id) {
            const soldQty = Number(item.quantity) || 1
            const { data: equip } = await supabase
              .from('land_equipment')
              .select('quantity')
              .eq('id', item.land_equipment_id)
              .single()
            const restored = (Number(equip?.quantity) || 0) + soldQty
            await supabase.from('land_equipment').update({
              quantity: restored,
              // Restore to in_warehouse if it belongs to a warehouse, else available
              status: item.warehouse_id ? 'in_warehouse' : 'available',
            }).eq('id', item.land_equipment_id)
          }

          // Restore land tonnage for scrap sale items
          if (item.item_type === 'scrap_sale' && item.land_id) {
            const tons = Number(item.quantity) || 0
            const { data: land } = await supabase
              .from('land_purchases')
              .select('remaining_tonnage, scrap_tonnage_sold')
              .eq('id', item.land_id)
              .single()
            if (land) {
              await supabase.from('land_purchases').update({
                remaining_tonnage:   (Number(land.remaining_tonnage)   || 0) + tons,
                scrap_tonnage_sold:  Math.max((Number(land.scrap_tonnage_sold) || 0) - tons, 0),
              }).eq('id', item.land_id)
            }
          }
        }
      }

      // 3. If a deposit was received (and invoice was never fully paid) → remove deposit income record
      if (inv?.deposit_paid && inv?.status !== 'paid') {
        await supabase.from('income_records').delete().eq('reference_id', id)
      }

      // 4. Remove any refund-related expense record linked to this invoice
      //    (covers both deposit refunds and sale refunds via refundSaleMutation)
      await supabase.from('expenses').delete().eq('reference_id', id)

      // 5. Reset any linked quotation back to approved
      await supabase.from('quotations')
        .update({ converted_to_invoice_id: null, status: 'approved' })
        .eq('converted_to_invoice_id', id)

      // 6. Delete the invoice (invoice_items cascade-deleted automatically)
      const { error } = await supabase.from('invoices').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.invalidateQueries({ queryKey: ['income_records'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['land_equipment'] })
      queryClient.invalidateQueries({ queryKey: ['land_purchases'] })
    }
  })

  const markPaidMutation = useMutation({
    mutationFn: async (payload: { id: string; bank_account_id: string }) => {
      const { id, bank_account_id } = payload
      // Fetch the invoice so we can write to income_records
      const { data: inv } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single()

      // Mark invoice as paid + record which account received the money
      const { error } = await supabase.from('invoices').update({
        status: 'paid',
        payment_bank_account_id: bank_account_id || null,
      }).eq('id', id)
      if (error) throw error

      // Write to income_records with bank_account_id
      if (inv) {
        const incomeRow: Record<string, unknown> = {
          income_date:         inv.date,
          income_type:         'invoice',
          source_type:         'other',
          amount:              inv.total || 0,
          description:         `Invoice ${inv.invoice_number}${inv.client_name ? ' — ' + inv.client_name : ''}`,
          customer_company_id: inv.company_id || null,
          payment_method:      inv.payment_method || null,
          bank_account_id:     bank_account_id || null,
          reference_id:        inv.id,
        }
        const { error: incErr } = await supabase.from('income_records').insert([incomeRow])
        if (incErr) {
          // Retry without new columns if migration hasn't run yet
          const { bank_account_id: _b, reference_id: _r, ...baseRow } = incomeRow as any
          const { error: incErr2 } = await supabase.from('income_records').insert([baseRow])
          if (incErr2) throw incErr2
        }
      }

      // Deduct stock for equipment_sale + scrap_sale items
      // (runs independently — never blocked by income record failure)
      const { data: items } = await supabase
        .from('invoice_items')
        .select('item_type, land_equipment_id, warehouse_id, land_id, quantity')
        .eq('invoice_id', id)

      if (items && items.length > 0) {
        // Equipment: decrement quantity, mark sold when none remain
        for (const item of items.filter(it => it.item_type === 'equipment_sale' && it.land_equipment_id)) {
          const soldQty = Number(item.quantity) || 1
          const { data: equip } = await supabase
            .from('land_equipment')
            .select('quantity, status')
            .eq('id', item.land_equipment_id)
            .single()
          const currentQty = Number(equip?.quantity) || 0
          const remaining = currentQty - soldQty
          await supabase
            .from('land_equipment')
            .update({
              quantity: Math.max(remaining, 0),
              status:   remaining <= 0 ? 'sold' : (equip?.status || 'available'),
            })
            .eq('id', item.land_equipment_id)
        }
        // Scrap: reduce remaining_tonnage and increase scrap_tonnage_sold
        for (const item of items.filter(it => it.item_type === 'scrap_sale' && it.land_id)) {
          const tons = Number(item.quantity) || 0
          const { data: land } = await supabase
            .from('land_purchases')
            .select('remaining_tonnage, scrap_tonnage_sold')
            .eq('id', item.land_id)
            .single()
          if (land) {
            await supabase.from('land_purchases').update({
              remaining_tonnage:  Math.max((Number(land.remaining_tonnage) || 0) - tons, 0),
              scrap_tonnage_sold: (Number(land.scrap_tonnage_sold) || 0) + tons,
            }).eq('id', item.land_id)
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['income_records'] })
      queryClient.invalidateQueries({ queryKey: ['land_equipment'] })
      queryClient.invalidateQueries({ queryKey: ['land_purchases'] })
    }
  })

  // Record that the customer paid their deposit
  const recordDepositMutation = useMutation({
    mutationFn: async (payload: {
      id: string
      amount: number
      date: string
      payment_method: string
      bank_account_id: string
    }) => {
      // Get the invoice for description
      const { data: inv } = await supabase.from('invoices').select('*').eq('id', payload.id).single()

      const { error } = await supabase.from('invoices').update({
        deposit_paid:            true,
        deposit_paid_amount:     payload.amount,
        deposit_paid_date:       payload.date,
        deposit_payment_method:  payload.payment_method,
        deposit_bank_account_id: payload.bank_account_id,
        status:                  'deposit_paid',
      }).eq('id', payload.id)
      if (error) throw error

      // Credit the chosen account — this updates the bank balance automatically
      const depositIncomeRow: Record<string, unknown> = {
        income_date:         payload.date,
        income_type:         'invoice',
        source_type:         'other',
        amount:              payload.amount,
        description:         `Deposit received — Invoice ${inv?.invoice_number || ''}${inv?.client_name ? ' (' + inv.client_name + ')' : ''}`,
        customer_company_id: inv?.company_id || null,
        payment_method:      payload.payment_method,
        bank_account_id:     payload.bank_account_id,
        reference_id:        payload.id,
      }
      const { error: incErr } = await supabase.from('income_records').insert([depositIncomeRow])
      if (incErr) {
        const { bank_account_id: _b, reference_id: _r, ...baseRow } = depositIncomeRow as any
        const { error: incErr2 } = await supabase.from('income_records').insert([baseRow])
        if (incErr2) throw incErr2
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['income_records'] })
    }
  })

  // Refund the deposit to the customer
  const refundDepositMutation = useMutation({
    mutationFn: async (payload: {
      id: string
      date: string
      method: string
      bank_account_id: string
      notes: string
    }) => {
      // Get the invoice for description
      const { data: inv } = await supabase.from('invoices').select('*').eq('id', payload.id).single()

      const { error } = await supabase.from('invoices').update({
        deposit_refunded:               true,
        deposit_refund_date:            payload.date,
        deposit_refund_method:          payload.method,
        deposit_refund_bank_account_id: payload.bank_account_id,
        deposit_refund_notes:           payload.notes,
        status:                         'cancelled_refunded',
      }).eq('id', payload.id)
      if (error) throw error

      // Debit the chosen account — reduces the bank balance
      const refundExpRow: Record<string, unknown> = {
        date:            payload.date,
        category:        'other',
        description:     `Deposit refunded — Invoice ${inv?.invoice_number || ''}${inv?.client_name ? ' (' + inv.client_name + ')' : ''}${payload.notes ? ' — ' + payload.notes : ''}`,
        amount:          inv?.deposit_paid_amount || 0,
        payment_method:  payload.method,
        bank_account_id: payload.bank_account_id,
        status:          'paid',
        reference_id:    payload.id,
      }
      const { error: expErr } = await supabase.from('expenses').insert([refundExpRow])
      if (expErr) {
        const { bank_account_id: _b, reference_id: _r, ...baseRow } = refundExpRow as any
        const { error: expErr2 } = await supabase.from('expenses').insert([baseRow])
        if (expErr2) throw expErr2
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    }
  })

  // Refund a fully-paid sale (equipment or scrap) — reverses income + restocks
  const refundSaleMutation = useMutation({
    mutationFn: async (payload: {
      id: string
      date: string
      bank_account_id: string
      notes: string
    }) => {
      const [{ data: inv }, { data: items }] = await Promise.all([
        supabase.from('invoices').select('*').eq('id', payload.id).single(),
        supabase.from('invoice_items')
          .select('item_type, land_equipment_id, warehouse_id, land_id, quantity')
          .eq('invoice_id', payload.id),
      ])

      // 1. Remove the income record so bank balance goes back down
      await supabase.from('income_records').delete().eq('reference_id', payload.id)

      // 2. Create an expense record — money going out as refund
      const saleRefundExpRow: Record<string, unknown> = {
        date:            payload.date,
        category:        'other',
        description:     `Sale refunded — Invoice ${inv?.invoice_number || ''}${inv?.client_name ? ' (' + inv.client_name + ')' : ''}${payload.notes ? ' — ' + payload.notes : ''}`,
        amount:          inv?.total || 0,
        payment_method:  inv?.payment_method || 'cash',
        bank_account_id: payload.bank_account_id,
        status:          'paid',
        reference_id:    payload.id,
      }
      const { error: expErr } = await supabase.from('expenses').insert([saleRefundExpRow])
      if (expErr) {
        const { bank_account_id: _b, reference_id: _r, ...baseRow } = saleRefundExpRow as any
        const { error: expErr2 } = await supabase.from('expenses').insert([baseRow])
        if (expErr2) throw expErr2
      }

      // 3. Restock equipment / restore land tonnage
      for (const item of (items || [])) {
        if (item.item_type === 'equipment_sale' && item.land_equipment_id) {
          const soldQty = Number(item.quantity) || 1
          const { data: equip } = await supabase
            .from('land_equipment').select('quantity').eq('id', item.land_equipment_id).single()
          const restored = (Number(equip?.quantity) || 0) + soldQty
          await supabase.from('land_equipment').update({
            quantity: restored,
            status:   item.warehouse_id ? 'in_warehouse' : 'available',
          }).eq('id', item.land_equipment_id)
        }
        if (item.item_type === 'scrap_sale' && item.land_id) {
          const tons = Number(item.quantity) || 0
          const { data: land } = await supabase
            .from('land_purchases').select('remaining_tonnage, scrap_tonnage_sold').eq('id', item.land_id).single()
          if (land) {
            await supabase.from('land_purchases').update({
              remaining_tonnage:   (Number(land.remaining_tonnage) || 0) + tons,
              scrap_tonnage_sold:  Math.max((Number(land.scrap_tonnage_sold) || 0) - tons, 0),
            }).eq('id', item.land_id)
          }
        }
      }

      // 4. Mark invoice as cancelled_refunded
      const { error } = await supabase.from('invoices')
        .update({ status: 'cancelled_refunded' })
        .eq('id', payload.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['income_records'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['land_equipment'] })
      queryClient.invalidateQueries({ queryKey: ['land_purchases'] })
    }
  })

  // Keep the deposit as income — cancel the deal but don't refund
  const keepDepositMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).single()

      const { error } = await supabase.from('invoices').update({
        deposit_kept_as_income: true,
        status:                 'cancelled_deposit_kept',
      }).eq('id', id)
      if (error) throw error

      // Write the kept deposit to income_records, linked to the same account it was deposited into
      if (inv && inv.deposit_paid_amount) {
        const keepRow: Record<string, unknown> = {
          income_date:         new Date().toISOString().split('T')[0],
          income_type:         'invoice',
          source_type:         'other',
          amount:              inv.deposit_paid_amount,
          description:         `Deposit kept — Invoice ${inv.invoice_number}${inv.client_name ? ' (' + inv.client_name + ')' : ''} — deal cancelled`,
          customer_company_id: inv.company_id || null,
          payment_method:      inv.deposit_payment_method || null,
          bank_account_id:     inv.deposit_bank_account_id || null,
          reference_id:        inv.id,
        }
        const { error: keepErr } = await supabase.from('income_records').insert([keepRow])
        if (keepErr) {
          const { bank_account_id: _b, reference_id: _r, ...baseRow } = keepRow as any
          const { error: keepErr2 } = await supabase.from('income_records').insert([baseRow])
          if (keepErr2) throw keepErr2
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['income_records'] })
    }
  })

  // Total invoiced = income invoices excluding fully-refunded ones
  const totalInvoiced = invoices?.filter(i =>
    i.invoice_type === 'income' && i.status !== 'cancelled_refunded'
  ).reduce((s, i) => s + (i.total || 0), 0) || 0

  // Collected = fully paid invoices + kept deposits + deposits received (awaiting full payment)
  const totalPaid = invoices?.filter(i => i.invoice_type === 'income').reduce((s, i) => {
    if (i.status === 'paid') return s + (i.total || 0)
    if (i.status === 'cancelled_deposit_kept') return s + (i.deposit_paid_amount || 0)
    if (i.deposit_paid && i.deposit_paid_amount) return s + (i.deposit_paid_amount || 0)
    return s
  }, 0) || 0

  // Pending = sent, overdue, or deposit received but deal not closed
  const unpaidCount = invoices?.filter(i =>
    ['sent', 'overdue', 'deposit_paid'].includes(i.status || '')
  ).length || 0

  const STATUS_COLOR: Record<string, string> = {
    draft:     'bg-gray-100 text-gray-700',
    sent:      'bg-blue-100 text-blue-700',
    paid:      'bg-green-100 text-green-700',
    overdue:   'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
    partial:   'bg-yellow-100 text-yellow-700',
    deposit_paid:           'bg-purple-100 text-purple-700',
    cancelled_deposit_kept: 'bg-red-100 text-red-700',
    cancelled_refunded:     'bg-orange-100 text-orange-700',
  }

  const STATUS_LABEL: Record<string, string> = {
    deposit_paid:           'Deposit Paid',
    cancelled_deposit_kept: 'Kept (Income)',
    cancelled_refunded:     'Refunded',
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">Create, track and manage client invoices</p>
        </div>
        {canCreate && (
          <button onClick={() => setIsAdding(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus className="h-5 w-5" /> New Invoice
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 flex items-center gap-4">
          <TrendingUp className="h-8 w-8 text-blue-600" />
          <div>
            <p className="text-sm text-gray-500">Total Invoiced</p>
            <p className="text-2xl font-bold text-gray-900">{totalInvoiced.toLocaleString()} Đ</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex items-center gap-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
          <div>
            <p className="text-sm text-gray-500">Collected / Paid</p>
            <p className="text-2xl font-bold text-green-600">{totalPaid.toLocaleString()} Đ</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex items-center gap-4">
          <Clock className="h-8 w-8 text-yellow-600" />
          <div>
            <p className="text-sm text-gray-500">Pending / Overdue</p>
            <p className="text-2xl font-bold text-yellow-600">{unpaidCount} invoices</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {['all','draft','sent','paid','overdue','cancelled'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {s}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          {(['all','income','expense'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${filterType === t ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date / Due</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Terms</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices?.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{inv.invoice_number}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{inv.client_name || '...€”'}</div>
                    {inv.companies && <div className="text-xs text-gray-400">{inv.companies.name}</div>}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    <div>{inv.date}</div>
                    {inv.due_date && <div className="text-xs text-gray-400">Due: {inv.due_date}</div>}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{inv.payment_terms || '...€”'}</td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900">{(inv.total || 0).toLocaleString()} Đ</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLOR[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[inv.status] || inv.status}
                    </span>
                    {inv.deposit_paid && inv.status !== 'paid' && (
                      <div className="text-xs text-purple-600 mt-0.5">Deposit: {(inv.deposit_paid_amount || 0).toLocaleString()} Đ</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setViewing(inv)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="View">
                        <Eye className="h-4 w-4" />
                      </button>
                      {canEdit && (
                        <button onClick={() => setEditing(inv)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      {canEdit && ['draft','sent','overdue'].includes(inv.status) && inv.invoice_type === 'income' && (
                        <button onClick={() => setMarkPaidInvoice(inv)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Mark Paid">
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      {/* Deposit flow: only show when invoice has a deposit % set and status allows */}
                      {canEdit && inv.deposit_percent && inv.deposit_percent > 0 && ['sent','draft','overdue'].includes(inv.status) && (
                        <button onClick={() => setDepositInvoice(inv)}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded" title="Record Deposit Received">
                          <Banknote className="h-4 w-4" />
                        </button>
                      )}
                      {/* Refund/keep: only when deposit has been paid but deal isn't complete */}
                      {canEdit && inv.deposit_paid && !['paid','cancelled_deposit_kept','cancelled_refunded'].includes(inv.status) && (
                        <button onClick={() => setRefundInvoice(inv)}
                          className="p-1.5 text-orange-500 hover:bg-orange-50 rounded" title="Deposit: Refund or Keep">
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                      {/* Refund paid sale (equipment/scrap) */}
                      {canEdit && inv.status === 'paid' && inv.invoice_type === 'income' && (
                        <button onClick={() => setRefundSaleInvoice(inv)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Refund Sale">
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => window.open(`/dashboard/finance/invoices/${inv.id}/print?auto=1`, '_blank')}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Export PDF">
                        <Printer className="h-4 w-4" />
                      </button>
                      {canDelete && inv.status === 'draft' && (
                        <button onClick={() => confirm(`Delete invoice ${inv.invoice_number}?`) && deleteMutation.mutate(inv.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices?.length === 0 && (
            <div className="text-center py-16">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">No invoices yet.</p>
            </div>
          )}
        </div>
      )}

      {/* View modal */}
      {viewing && (
        <InvoiceDetail
          invoice={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null) }}
        />
      )}

      {/* Create / Edit form */}
      {(isAdding || editing) && (
        <InvoiceForm
          invoice={editing || undefined}
          companies={companies || []}
          onClose={() => { setIsAdding(false); setEditing(null) }}
        />
      )}

      {/* Mark Paid modal */}
      {markPaidInvoice && (
        <MarkPaidModal
          invoice={markPaidInvoice}
          bankAccounts={bankAccounts || []}
          onClose={() => setMarkPaidInvoice(null)}
          onConfirm={payload => {
            markPaidMutation.mutate(payload)
            setMarkPaidInvoice(null)
          }}
        />
      )}

      {/* Refund paid sale modal */}
      {refundSaleInvoice && (
        <RefundSaleModal
          invoice={refundSaleInvoice}
          bankAccounts={bankAccounts || []}
          onClose={() => setRefundSaleInvoice(null)}
          onConfirm={payload => {
            refundSaleMutation.mutate(payload)
            setRefundSaleInvoice(null)
          }}
        />
      )}

      {/* Record deposit modal */}
      {depositInvoice && (
        <DepositModal
          invoice={depositInvoice}
          bankAccounts={bankAccounts || []}
          onClose={() => setDepositInvoice(null)}
          onSave={payload => {
            recordDepositMutation.mutate(payload)
            setDepositInvoice(null)
          }}
        />
      )}

      {/* Refund / keep deposit modal */}
      {refundInvoice && (
        <RefundModal
          invoice={refundInvoice}
          bankAccounts={bankAccounts || []}
          onClose={() => setRefundInvoice(null)}
          onRefund={payload => {
            refundDepositMutation.mutate(payload)
            setRefundInvoice(null)
          }}
          onKeep={id => {
            keepDepositMutation.mutate(id)
            setRefundInvoice(null)
          }}
        />
      )}
    </div>
  )
}

// ...”€...”€...”€ Invoice Detail Modal ...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€
function InvoiceDetail({ invoice, onClose, onEdit }: {
  invoice: Invoice; onClose: () => void; onEdit: () => void
}) {
  const STATUS_COLOR: Record<string, string> = {
    draft:'bg-gray-100 text-gray-700', sent:'bg-blue-100 text-blue-700',
    paid:'bg-green-100 text-green-700', overdue:'bg-red-100 text-red-700',
    cancelled:'bg-gray-100 text-gray-500', partial:'bg-yellow-100 text-yellow-700',
    deposit_paid:'bg-purple-100 text-purple-700',
    cancelled_deposit_kept:'bg-red-100 text-red-700',
    cancelled_refunded:'bg-orange-100 text-orange-700',
  }
  const STATUS_LABEL: Record<string, string> = {
    deposit_paid: 'Deposit Paid', cancelled_deposit_kept: 'Kept (Income)', cancelled_refunded: 'Refunded',
  }
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLOR[invoice.status] || 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABEL[invoice.status] || invoice.status}
                </span>
                {invoice.companies && <span className="text-sm text-gray-500">{invoice.companies.name}</span>}
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
            {[
              ['Client', invoice.client_name || '...€”'],
              ['Date', invoice.date],
              ['Due Date', invoice.due_date || '...€”'],
              ['Payment Terms', invoice.payment_terms || '...€”'],
            ].map(([l, v]) => (
              <div key={l}><p className="text-gray-400 text-xs">{l}</p><p className="font-medium text-gray-900">{v}</p></div>
            ))}
          </div>

          {/* Items */}
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(invoice.invoice_items || []).map((item, i) => (
                  <tr key={item.id || i}>
                    <td className="px-4 py-3">
                      {item.description}
                      <div className="text-xs text-gray-400 capitalize">{item.item_type?.replace('_',' ')}</div>
                    </td>
                    <td className="px-4 py-3 text-right">{item.quantity} {item.unit}</td>
                    <td className="px-4 py-3 text-right">{Number(item.unit_price).toLocaleString()} Đ</td>
                    <td className="px-4 py-3 text-right font-semibold">{Number(item.total_price).toLocaleString()} Đ</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr><td colSpan={3} className="px-4 py-2 text-right text-sm font-medium text-gray-500">Subtotal</td><td className="px-4 py-2 text-right text-sm font-semibold">{(invoice.subtotal||0).toLocaleString()} Đ</td></tr>
                <tr><td colSpan={3} className="px-4 py-2 text-right text-sm font-medium text-gray-500">Tax</td><td className="px-4 py-2 text-right text-sm font-semibold">{invoice.tax > 0 ? `${(invoice.tax||0).toLocaleString()} Đ` : '—'}</td></tr>
                <tr><td colSpan={3} className="px-4 py-2 text-right font-bold text-gray-900">Total</td><td className="px-4 py-2 text-right font-bold text-gray-900">{(invoice.total||0).toLocaleString()} Đ</td></tr>
              </tfoot>
            </table>
          </div>

          {invoice.notes && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-gray-700">
              <p className="font-medium text-gray-900 mb-1">Notes</p>{invoice.notes}
            </div>
          )}

          {/* Deposit tracking info */}
          {(invoice.deposit_paid || invoice.deposit_kept_as_income || invoice.deposit_refunded) && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 text-sm space-y-1">
              <p className="font-semibold text-purple-900 mb-2">Deposit Record</p>
              {invoice.deposit_paid && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-gray-700">
                  <span className="text-gray-400">Amount</span>
                  <span className="font-medium">{(invoice.deposit_paid_amount || 0).toLocaleString()} Đ</span>
                  <span className="text-gray-400">Date</span>
                  <span>{invoice.deposit_paid_date || '—'}</span>
                  <span className="text-gray-400">Method</span>
                  <span className="capitalize">{(invoice.deposit_payment_method || '—').replace('_',' ')}</span>
                  <span className="text-gray-400">Deposited to</span>
                  <span className="capitalize">{(invoice.deposit_destination || '—').replace('_',' ')}</span>
                </div>
              )}
              {invoice.deposit_refunded && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-orange-700 mt-2 pt-2 border-t border-purple-200">
                  <span className="text-gray-400">Refund Date</span>
                  <span>{invoice.deposit_refund_date || '—'}</span>
                  <span className="text-gray-400">Refund Method</span>
                  <span className="capitalize">{(invoice.deposit_refund_method || '—').replace('_',' ')}</span>
                  <span className="text-gray-400">Refund Source</span>
                  <span className="capitalize">{(invoice.deposit_refund_source || '—').replace('_',' ')}</span>
                  {invoice.deposit_refund_notes && <>
                    <span className="text-gray-400">Notes</span>
                    <span>{invoice.deposit_refund_notes}</span>
                  </>}
                </div>
              )}
              {invoice.deposit_kept_as_income && (
                <p className="text-red-700 font-semibold mt-2 pt-2 border-t border-purple-200">
                  Deposit kept as income — deal cancelled
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm">Close</button>
            <button onClick={() => window.open(`/dashboard/finance/invoices/${invoice.id}/print?auto=1`, '_blank')}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center gap-2 text-sm">
              <Printer className="h-4 w-4" /> Print / PDF
            </button>
            <button onClick={onEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm">
              <Edit2 className="h-4 w-4" /> Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══ Deposit Payment Modal ═══════════════════════════════════════════════
type BankAccountOption = { id: string; account_name: string; bank_name: string; account_type: string }

function DepositModal({ invoice, bankAccounts, onClose, onSave }: {
  invoice: Invoice
  bankAccounts: BankAccountOption[]
  onClose: () => void
  onSave: (payload: { id: string; amount: number; date: string; payment_method: string; bank_account_id: string }) => void
}) {
  const depositAmount = invoice.deposit_percent
    ? Math.round((invoice.total || 0) * (invoice.deposit_percent / 100))
    : 0
  const [form, setForm] = useState({
    amount:          String(depositAmount),
    date:            new Date().toISOString().split('T')[0],
    payment_method:  'cash',
    bank_account_id: bankAccounts[0]?.id || '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Record Deposit Received</h3>
        <p className="text-sm text-gray-500">Invoice: <span className="font-semibold text-gray-700">{invoice.invoice_number}</span></p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Received (Đ)</label>
            <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            {depositAmount > 0 && (
              <p className="text-xs text-gray-400 mt-1">Expected: {depositAmount.toLocaleString()} Đ ({invoice.deposit_percent}%)</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Received</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="online">Online / Mobile</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Goes Into</label>
            {bankAccounts.length === 0 ? (
              <p className="text-xs text-red-500">No active accounts found. Please add a bank/cash account first.</p>
            ) : (
              <select value={form.bank_account_id} onChange={e => set('bank_account_id', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                {bankAccounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.account_name}{a.bank_name ? ` — ${a.bank_name}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
          <button
            disabled={!form.bank_account_id}
            onClick={() => onSave({ id: invoice.id, amount: Number(form.amount), date: form.date, payment_method: form.payment_method, bank_account_id: form.bank_account_id })}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold disabled:opacity-50">
            Confirm Deposit
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══ Refund / Keep Deposit Modal ══════════════════════════════════════════
function RefundModal({ invoice, bankAccounts, onClose, onRefund, onKeep }: {
  invoice: Invoice
  bankAccounts: BankAccountOption[]
  onClose: () => void
  onRefund: (payload: { id: string; date: string; method: string; bank_account_id: string; notes: string }) => void
  onKeep: (id: string) => void
}) {
  const [mode, setMode] = useState<'choose' | 'refund' | 'keep'>('choose')
  const [form, setForm] = useState({
    date:            new Date().toISOString().split('T')[0],
    method:          'cash',
    bank_account_id: bankAccounts[0]?.id || '',
    notes:           '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const depositAmount = invoice.deposit_paid_amount || 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Deposit — Deal Cancelled</h3>
        <p className="text-sm text-gray-500">
          Invoice <span className="font-semibold text-gray-700">{invoice.invoice_number}</span>
          {depositAmount > 0 && <> · Deposit: <span className="font-semibold text-gray-700">{depositAmount.toLocaleString()} Đ</span></>}
        </p>

        {mode === 'choose' && (
          <div className="space-y-3 pt-2">
            <button onClick={() => setMode('refund')}
              className="w-full border-2 border-orange-400 rounded-lg p-4 text-left hover:bg-orange-50 transition-colors">
              <p className="font-semibold text-orange-700">Refund the deposit</p>
              <p className="text-sm text-gray-500 mt-1">Return the money to the customer</p>
            </button>
            <button onClick={() => setMode('keep')}
              className="w-full border-2 border-red-400 rounded-lg p-4 text-left hover:bg-red-50 transition-colors">
              <p className="font-semibold text-red-700">Keep the deposit as income</p>
              <p className="text-sm text-gray-500 mt-1">Close the invoice and record deposit as earned income</p>
            </button>
            <button onClick={onClose} className="w-full text-center text-sm text-gray-500 hover:underline pt-1">Cancel</button>
          </div>
        )}

        {mode === 'refund' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Refund Date</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">How was money returned?</label>
              <select value={form.method} onChange={e => set('method', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deduct refund from account</label>
              {bankAccounts.length === 0 ? (
                <p className="text-xs text-red-500">No active accounts found.</p>
              ) : (
                <select value={form.bank_account_id} onChange={e => set('bank_account_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                  {bankAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.account_name}{a.bank_name ? ` — ${a.bank_name}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setMode('choose')} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Back</button>
              <button
                disabled={!form.bank_account_id}
                onClick={() => onRefund({ id: invoice.id, date: form.date, method: form.method, bank_account_id: form.bank_account_id, notes: form.notes })}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-semibold disabled:opacity-50">
                Confirm Refund
              </button>
            </div>
          </div>
        )}

        {mode === 'keep' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              <p className="font-semibold mb-1">Are you sure?</p>
              <p>This will close invoice <strong>{invoice.invoice_number}</strong> and record the deposit of <strong>{depositAmount.toLocaleString()} Đ</strong> as company income. This cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setMode('choose')} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Back</button>
              <button onClick={() => onKeep(invoice.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold">
                Keep as Income
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══ Refund Paid Sale Modal ═══════════════════════════════════════════════════
function RefundSaleModal({ invoice, bankAccounts, onClose, onConfirm }: {
  invoice: Invoice
  bankAccounts: BankAccountOption[]
  onClose: () => void
  onConfirm: (payload: { id: string; date: string; bank_account_id: string; notes: string }) => void
}) {
  const [confirmed, setConfirmed] = useState(false)
  const [form, setForm] = useState({
    date:            new Date().toISOString().split('T')[0],
    bank_account_id: invoice.payment_bank_account_id || bankAccounts[0]?.id || '',
    notes:           '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="text-red-600">Refund Sale</span>
        </h3>
        <p className="text-sm text-gray-500">
          Invoice <span className="font-semibold text-gray-700">{invoice.invoice_number}</span>
          {invoice.client_name && <> · <span className="font-semibold text-gray-700">{invoice.client_name}</span></>}
          {' · '}<span className="font-semibold text-red-600">{(invoice.total || 0).toLocaleString()} Đ</span>
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          This will:
          <ul className="mt-1 ml-4 list-disc space-y-0.5">
            <li>Remove the income record from the bank account</li>
            <li>Create a refund expense on the selected account</li>
            <li>Restock any equipment / restore land tonnage</li>
            <li>Mark the invoice as <strong>Cancelled (Refunded)</strong></li>
          </ul>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Refund Date</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deduct From Account</label>
            {bankAccounts.length === 0 ? (
              <p className="text-xs text-red-500">No active accounts found.</p>
            ) : (
              <select value={form.bank_account_id} onChange={e => set('bank_account_id', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500">
                {bankAccounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.account_name}{a.bank_name ? ` — ${a.bank_name}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              placeholder="Reason for refund..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
              className="rounded border-gray-300 text-red-600" />
            I confirm this refund cannot be undone
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
          <button
            disabled={!confirmed || !form.bank_account_id}
            onClick={() => onConfirm({ id: invoice.id, date: form.date, bank_account_id: form.bank_account_id, notes: form.notes })}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold disabled:opacity-50">
            Confirm Refund
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Mark Paid Modal ──────────────────────────────────────────────────────────
function MarkPaidModal({ invoice, bankAccounts, onClose, onConfirm }: {
  invoice: Invoice
  bankAccounts: BankAccountOption[]
  onClose: () => void
  onConfirm: (payload: { id: string; bank_account_id: string }) => void
}) {
  const [bank_account_id, setBankAccountId] = useState(
    invoice.payment_bank_account_id || bankAccounts[0]?.id || ''
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-sm p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Mark Invoice as Paid</h3>
        <p className="text-sm text-gray-500">
          Invoice <span className="font-semibold text-gray-700">{invoice.invoice_number}</span>
          {invoice.client_name && <> · <span className="font-semibold text-gray-700">{invoice.client_name}</span></>}
          {' · '}<span className="font-semibold text-green-600">{(invoice.total || 0).toLocaleString()} Đ</span>
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Received Into</label>
          {bankAccounts.length === 0 ? (
            <p className="text-xs text-red-500">No active accounts found.</p>
          ) : (
            <select value={bank_account_id} onChange={e => setBankAccountId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500">
              {bankAccounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.account_name}{a.bank_name ? ` — ${a.bank_name}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
          <button
            disabled={!bank_account_id}
            onClick={() => onConfirm({ id: invoice.id, bank_account_id })}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold disabled:opacity-50">
            Confirm Payment
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Invoice Form ─────────────────────────────────────────────────────────────
function InvoiceForm({ invoice, companies, onClose }: {
  invoice?: Invoice; companies: any[]; onClose: () => void
}) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)

  const generateInvoiceNumber = async (): Promise<string> => {
    const year = new Date().getFullYear()
    const prefix = `INV-${year}-`
    const { data } = await supabase
      .from('invoices')
      .select('invoice_number')
      .ilike('invoice_number', `${prefix}%`)
      .order('invoice_number', { ascending: false })
      .limit(1)
    if (data && data.length > 0) {
      const seq = parseInt(data[0].invoice_number.replace(prefix, ''), 10)
      return `${prefix}${String((isNaN(seq) ? 0 : seq) + 1).padStart(3, '0')}`
    }
    return `${prefix}001`
  }

  const [formData, setFormData] = useState({
    invoice_number:          invoice?.invoice_number || '',
    company_id:              invoice?.company_id || '',
    client_name:             invoice?.client_name || '',
    invoice_type:            invoice?.invoice_type || 'income',
    date:                    invoice?.date || new Date().toISOString().split('T')[0],
    due_date:                invoice?.due_date || '',
    payment_terms:           invoice?.payment_terms || 'Net 30',
    deposit_percent:         invoice?.deposit_percent?.toString() || '',
    status:                  invoice?.status || 'draft',
    tax_rate:                '5',
    apply_tax:               invoice ? (invoice.tax > 0 ? 'true' : 'false') : 'true',
    notes:                   invoice?.notes || '',
    payment_method:          invoice?.payment_method || 'bank_transfer',
    payment_bank_account_id: invoice?.payment_bank_account_id || '',
  })

  const [items, setItems] = useState<InvoiceItem[]>(
    invoice?.invoice_items?.map(ii => ({
      ...ii,
      quantity:    Number(ii.quantity),
      unit_price:  Number(ii.unit_price),
      total_price: Number(ii.total_price),
    })) || []
  )

  const [companies2,   setCompanies2]   = useState<any[]>([])
  const [lands,         setLands]         = useState<any[]>([])
  const [warehouses,    setWarehouses]    = useState<any[]>([])
  const [vessels,       setVessels]       = useState<any[]>([])
  const [wEquipment,    setWEquipment]    = useState<Record<string, any[]>>({})
  const [bankAccounts2, setBankAccounts2] = useState<BankAccountOption[]>([])

  useEffect(() => {
    const load = async () => {
      const [c, l, w, v, b] = await Promise.all([
        supabase.from('companies').select('id, name').order('name'),
        supabase.from('land_purchases').select('id, land_name').order('land_name'),
        supabase.from('warehouses').select('id, location').order('location'),
        supabase.from('vessels').select('id, name').order('name'),
        supabase.from('bank_accounts').select('id, account_name, bank_name, account_type').eq('status', 'active').order('account_name'),
      ])
      setCompanies2(c.data || [])
      setLands(l.data || [])
      setWarehouses(w.data || [])
      setVessels(v.data || [])
      setBankAccounts2(b.data || [])
    }
    load()
    if (!invoice) generateInvoiceNumber().then(n => setFormData(p => ({ ...p, invoice_number: n })))
  }, [])

  const loadWarehouseEquipment = async (warehouseId: string) => {
    if (!warehouseId || wEquipment[warehouseId]) return
    const { data } = await supabase
      .from('land_equipment')
      .select('id, equipment_name, estimated_value, status, quantity, unit')
      .eq('warehouse_id', warehouseId)
      .in('status', ['available', 'in_warehouse'])
    if (data) setWEquipment(prev => ({ ...prev, [warehouseId]: data }))
  }

  const set = (k: string, v: string) => setFormData(p => ({ ...p, [k]: v }))

  const addItem = () => setItems(prev => [...prev, {
    item_type: 'service', description: '', quantity: 1, unit: 'unit',
    unit_price: 0, total_price: 0, sort_order: prev.length
  }])

  const updateItem = (i: number, field: string, value: any) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        updated.total_price = (Number(updated.quantity) || 0) * (Number(updated.unit_price) || 0)
      }
      return updated
    }))
  }

  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))

  const subtotal  = items.reduce((s, item) => s + (item.total_price || 0), 0)
  const applyTax  = formData.apply_tax === 'true'
  const taxRate   = parseFloat(formData.tax_rate) || 0
  const tax       = applyTax ? Math.round(subtotal * taxRate / 100 * 100) / 100 : 0
  const total     = subtotal + tax

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        invoice_number: formData.invoice_number,
        company_id:     formData.company_id || null,
        client_name:    formData.client_name || null,
        invoice_type:   formData.invoice_type,
        date:           formData.date,
        due_date:       formData.due_date || null,
        payment_terms:           formData.payment_terms || null,
        status:                  formData.status,
        tax,
        subtotal,
        total,
        deposit_percent:         formData.deposit_percent ? parseFloat(formData.deposit_percent) : null,
        notes:                   formData.notes || null,
        payment_method:          formData.payment_method || null,
        payment_bank_account_id: formData.payment_bank_account_id || null,
      }

      if (invoice?.id) {
        const { error } = await supabase.from('invoices').update(payload).eq('id', invoice.id)
        if (error) throw error
        // Delete old items and re-insert
        await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id)
        if (items.length > 0) {
          const { error: ie } = await supabase.from('invoice_items').insert(
            items.map((item, idx) => ({
              invoice_id:        invoice.id,
              item_type:         item.item_type,
              description:       item.description,
              quantity:          Number(item.quantity),
              unit:              item.unit,
              unit_price:        Number(item.unit_price),
              total_price:       Number(item.total_price),
              warehouse_id:      item.warehouse_id || null,
              land_equipment_id: item.land_equipment_id || null,
              land_id:           item.land_id || null,
              vessel_id:         item.vessel_id || null,
              sort_order:        idx,
            }))
          )
          if (ie) throw ie
        }
      } else {
        const { data: inv, error } = await supabase.from('invoices').insert([payload]).select().single()
        if (error) throw error
        if (items.length > 0) {
          const { error: ie } = await supabase.from('invoice_items').insert(
            items.map((item, idx) => ({
              invoice_id:        inv.id,
              item_type:         item.item_type,
              description:       item.description,
              quantity:          Number(item.quantity),
              unit:              item.unit,
              unit_price:        Number(item.unit_price),
              total_price:       Number(item.total_price),
              warehouse_id:      item.warehouse_id || null,
              land_equipment_id: item.land_equipment_id || null,
              land_id:           item.land_id || null,
              vessel_id:         item.vessel_id || null,
              sort_order:        idx,
            }))
          )
          if (ie) throw ie
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      onClose()
    }
  })

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">{invoice ? 'Edit Invoice' : 'New Invoice'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>

          <div className="space-y-5">
            {/* Header fields */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Invoice # *</label>
                <input type="text" required value={formData.invoice_number} onChange={e => set('invoice_number', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Type</label>
                <select value={formData.invoice_type} onChange={e => set('invoice_type', e.target.value)} className={inputCls}>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select value={formData.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="partial">Partial</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">Use the ✓ button in the invoice list to mark as Paid</p>
              </div>
              <div>
                <label className={labelCls}>Company</label>
                <select value={formData.company_id} onChange={e => set('company_id', e.target.value)} className={inputCls}>
                  <option value="">...€” Select ...€”</option>
                  {(companies2.length ? companies2 : companies).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Client / Vendor Name</label>
                <input type="text" value={formData.client_name} onChange={e => set('client_name', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Payment Terms</label>
                <select value={formData.payment_terms} onChange={e => set('payment_terms', e.target.value)} className={inputCls}>
                  <option value="">None specified</option>
                  <option>Due on receipt</option>
                  <option>Net 15</option>
                  <option>Net 30</option>
                  <option>Net 45</option>
                  <option>Net 60</option>
                  <option>50% advance, 50% on delivery</option>
                  <option>100% advance</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Deposit Required (%)</label>
                <input type="number" min="0" max="100" step="1"
                  value={formData.deposit_percent}
                  onChange={e => set('deposit_percent', e.target.value)}
                  placeholder="e.g. 50"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Invoice Date *</label>
                <input type="date" required value={formData.date} onChange={e => set('date', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Due Date</label>
                <input type="date" value={formData.due_date} onChange={e => set('due_date', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Payment Method</label>
                <select value={formData.payment_method} onChange={e => set('payment_method', e.target.value)} className={inputCls}>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Payment Account</label>
                <select value={formData.payment_bank_account_id} onChange={e => set('payment_bank_account_id', e.target.value)} className={inputCls}>
                  <option value="">— Select account —</option>
                  {bankAccounts2.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.account_name}{a.bank_name ? ` — ${a.bank_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Line items */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-800">Line Items</h3>
                <button type="button" onClick={addItem}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                  <Plus className="h-4 w-4" /> Add Item
                </button>
              </div>

              {items.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">
                  No items yet ...€” click "Add Item" to start
                </div>
              )}

              <div className="space-y-3">
                {items.map((item, i) => (
                  <InvoiceItemRow
                    key={i}
                    item={item}
                    index={i}
                    lands={lands}
                    warehouses={warehouses}
                    vessels={vessels}
                    wEquipment={wEquipment}
                    onLoadEquipment={loadWarehouseEquipment}
                    onChange={(field, value) => updateItem(i, field, value)}
                    onRemove={() => removeItem(i)}
                  />
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-72 space-y-2 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-semibold">{subtotal.toLocaleString()} Đ</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-gray-500">
                    <input
                      type="checkbox"
                      checked={formData.apply_tax === 'true'}
                      onChange={e => set('apply_tax', e.target.checked ? 'true' : 'false')}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600"
                    />
                    <span>Tax</span>
                    {formData.apply_tax === 'true' && (
                      <span className="flex items-center gap-1">
                        <input
                          type="number" min="0" max="100" step="0.1"
                          value={formData.tax_rate}
                          onChange={e => set('tax_rate', e.target.value)}
                          className="w-14 px-1 py-0.5 border border-gray-300 rounded text-right text-sm"
                        />
                        <span>%</span>
                      </span>
                    )}
                  </label>
                  <span className="font-semibold">{tax.toLocaleString()} Đ</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base pt-1">
                  <span>Total</span>
                  <span>{total.toLocaleString()} Đ</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className={labelCls}>Notes</label>
              <textarea value={formData.notes} onChange={e => set('notes', e.target.value)}
                rows={3} className={inputCls} placeholder="Payment instructions, references, etc." />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
              <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                {mutation.isPending ? 'Saving...€¦' : invoice ? 'Update Invoice' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ...”€...”€...”€ Invoice Item Row ...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€
function InvoiceItemRow({ item, index, lands, warehouses, vessels, wEquipment, onLoadEquipment, onChange, onRemove }: {
  item: InvoiceItem; index: number; lands: any[]; warehouses: any[]; vessels: any[]
  wEquipment: Record<string, any[]>; onLoadEquipment: (id: string) => void
  onChange: (field: string, value: any) => void; onRemove: () => void
}) {
  const inputCls = 'w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500'
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
      <div className="flex items-start gap-2">
        <span className="text-xs text-gray-400 font-bold mt-2 w-5 text-center">{index + 1}</span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
          <div>
            <label className="text-xs text-gray-500 mb-0.5 block">Type</label>
            <select value={item.item_type} onChange={e => onChange('item_type', e.target.value)} className={inputCls}>
              <option value="equipment_sale">Equipment Sale</option>
              <option value="scrap_sale">Scrap Sale</option>
              <option value="vessel_rental">Vessel Rental</option>
              <option value="service">Service</option>
              <option value="other">Other</option>
            </select>
          </div>

          {item.item_type === 'equipment_sale' && (
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Warehouse</label>
              <select value={item.warehouse_id || ''} onChange={e => { onChange('warehouse_id', e.target.value); onLoadEquipment(e.target.value) }} className={inputCls}>
                <option value="">...€” Select ...€”</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.location}</option>)}
              </select>
            </div>
          )}
          {item.item_type === 'equipment_sale' && item.warehouse_id && (
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Equipment</label>
              <select value={item.land_equipment_id || ''} onChange={e => {
                const equip = (wEquipment[item.warehouse_id!] || []).find(eq => eq.id === e.target.value)
                onChange('land_equipment_id', e.target.value)
                if (equip) { onChange('description', equip.equipment_name); onChange('unit_price', equip.estimated_value || 0) }
              }} className={inputCls}>
                <option value="">...€” Select ...€”</option>
                {(wEquipment[item.warehouse_id] || []).map(eq => <option key={eq.id} value={eq.id}>{eq.equipment_name} — {eq.quantity ?? 0} {eq.unit || 'unit'} available — Đ {eq.estimated_value?.toLocaleString() || 0}</option>)}
              </select>
            </div>
          )}
          {item.item_type === 'scrap_sale' && (
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Land</label>
              <select value={item.land_id || ''} onChange={e => onChange('land_id', e.target.value)} className={inputCls}>
                <option value="">...€” Select ...€”</option>
                {lands.map(l => <option key={l.id} value={l.id}>{l.land_name}</option>)}
              </select>
            </div>
          )}
          {item.item_type === 'scrap_sale' && (
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Material</label>
              <input type="text" value={item.material_type || ''} onChange={e => onChange('material_type', e.target.value)} placeholder="e.g. Iron, Steel" className={inputCls} />
            </div>
          )}
          {item.item_type === 'vessel_rental' && (
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Vessel</label>
              <select value={item.vessel_id || ''} onChange={e => onChange('vessel_id', e.target.value)} className={inputCls}>
                <option value="">...€” Select ...€”</option>
                {vessels.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600 mt-1 p-1 flex-shrink-0">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pl-7">
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-0.5 block">Description *</label>
          <input type="text" required value={item.description} onChange={e => onChange('description', e.target.value)} className={inputCls} placeholder="Item description" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-0.5 block">Qty</label>
          <input type="number" step="0.001" value={item.quantity} onChange={e => onChange('quantity', parseFloat(e.target.value) || 0)} className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-0.5 block">Unit</label>
          <input type="text" value={item.unit} onChange={e => onChange('unit', e.target.value)} placeholder="unit" className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-0.5 block">Unit Price</label>
          <input type="number" step="0.01" value={item.unit_price} onChange={e => onChange('unit_price', parseFloat(e.target.value) || 0)} className={inputCls} />
        </div>
        <div className="flex items-end">
          <div className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-right font-semibold text-gray-900">
            {item.total_price.toLocaleString()} Đ
          </div>
        </div>
      </div>
    </div>
  )
}
