'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthContext'
import { hasModulePermission } from '@/lib/auth/rolePermissions'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import {
  Plus,
  Trash2,
  Edit2,
  Eye,
  CheckCircle,
  XCircle,
  FileText,
  ArrowRight,
  ClipboardCheck,
  Printer,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuoteItem {
  id?: string
  item_type: 'equipment_sale' | 'scrap_sale' | 'vessel_rental' | 'service' | 'other'
  description: string
  quantity: number
  unit: string
  unit_price: number
  total_price: number
  // Equipment
  warehouse_id?: string
  land_equipment_id?: string
  // Scrap
  land_id?: string
  material_type?: string
  // Rental
  vessel_id?: string
}

interface Quotation {
  id: string
  quotation_number: string
  company_id?: string
  client_name?: string
  date: string
  valid_until?: string
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'converted' | 'expired'
  subtotal: number
  tax: number
  total: number
  payment_terms?: string
  deposit_percent?: number
  notes?: string
  converted_to_invoice_id?: string
  companies?: { name: string }
  quotation_items?: QuoteItem[]
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuotationsPage() {
  const [isAdding, setIsAdding] = useState(false)
  const [editing, setEditing] = useState<Quotation | null>(null)
  const [viewing, setViewing] = useState<Quotation | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { user } = useAuth()

  const userRole = user?.role || user?.roles?.[0] || 'storekeeper'
  const canCreate = hasModulePermission(userRole, ['finance', 'quotations'], 'create')
  const canEdit   = hasModulePermission(userRole, ['finance', 'quotations'], 'edit')
  const canDelete = hasModulePermission(userRole, ['finance', 'quotations'], 'delete')

  // Fetch quotations
  const { data: quotations, isLoading } = useQuery({
    queryKey: ['quotations', filterStatus],
    queryFn: async () => {
      let q = supabase
        .from('quotations')
        .select('*, companies(name), quotation_items(*)')
        .order('date', { ascending: false })
      if (filterStatus !== 'all') q = q.eq('status', filterStatus)
      const { data, error } = await q
      if (error) throw error
      return data as Quotation[]
    }
  })

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quotations').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotations'] })
  })

  // Approve
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quotations').update({ status: 'approved' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotations'] })
  })

  // Reject
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quotations').update({ status: 'rejected' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotations'] })
  })

  // Convert approved quotation → Invoice
  const convertMutation = useMutation({
    mutationFn: async (quotation: Quotation) => {
      // Re-fetch the quotation fresh to get all items with correct values
      const { data: freshQ, error: fetchErr } = await supabase
        .from('quotations')
        .select('*, quotation_items(*)')
        .eq('id', quotation.id)
        .single()
      if (fetchErr) throw fetchErr
      const q = freshQ

      // 1. Generate sequential invoice number INV-YYYY-XXX
      const year = new Date().getFullYear()
      const prefix = `INV-${year}-`
      const { data: lastInv } = await supabase
        .from('invoices')
        .select('invoice_number')
        .ilike('invoice_number', `${prefix}%`)
        .order('invoice_number', { ascending: false })
        .limit(1)
      let invoiceNumber = `${prefix}001`
      if (lastInv && lastInv.length > 0) {
        const seq = parseInt(lastInv[0].invoice_number.replace(prefix, ''), 10)
        invoiceNumber = `${prefix}${String((isNaN(seq) ? 0 : seq) + 1).padStart(3, '0')}`
      }

      // 2. Create invoice (status draft — income records written only when marked paid)
      const { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .insert([{
          invoice_number:  invoiceNumber,
          company_id:      q.company_id || null,
          client_name:     q.client_name || null,
          invoice_type:    'income',
          date:            new Date().toISOString().split('T')[0],
          subtotal:        q.subtotal,
          tax:             q.tax,
          total:           q.total,
          status:          'draft',
          notes:           q.notes,
          payment_terms:   q.payment_terms || null,
          deposit_percent: q.deposit_percent || null,
        }])
        .select()
        .single()
      if (invErr) throw invErr

      // 3. Copy each line item to invoice_items (preserves item_type + equipment/land refs)
      const items = q.quotation_items || []
      if (items.length > 0) {
        const invItems = items.map((qi: QuoteItem, i: number) => ({
          invoice_id:        invoice.id,
          quotation_item_id: qi.id || null,
          item_type:         qi.item_type,
          description:       qi.description,
          quantity:          Number(qi.quantity),
          unit:              qi.unit,
          unit_price:        Number(qi.unit_price),
          total_price:       Number(qi.total_price),
          warehouse_id:      qi.warehouse_id || null,
          land_equipment_id: qi.land_equipment_id || null,
          land_id:           qi.land_id || null,
          material_type:     qi.material_type || null,
          vessel_id:         qi.vessel_id || null,
          sort_order:        i,
        }))
        const { error: itemErr } = await supabase.from('invoice_items').insert(invItems)
        if (itemErr) throw new Error('Failed to copy items: ' + itemErr.message)
      }

      // NOTE: income_records are intentionally NOT created here.
      // They are created by markPaidMutation when the invoice is actually paid,
      // so the correct bank account is recorded and equipment is deducted only once.

      // 4. Mark quotation as converted
      const { error: qErr } = await supabase
        .from('quotations')
        .update({ status: 'converted', converted_to_invoice_id: invoice.id })
        .eq('id', q.id)
      if (qErr) throw qErr

      return invoice
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['income_records'] })
      alert('Quotation converted to invoice successfully!')
    },
    onError: (error: any) => {
      console.error('Convert error:', error)
      alert('Failed to convert: ' + error.message)
    }
  })

  const statusColors: Record<string, string> = {
    draft:     'bg-gray-100 text-gray-700',
    sent:      'bg-blue-100 text-blue-700',
    approved:  'bg-green-100 text-green-700',
    rejected:  'bg-red-100 text-red-700',
    converted: 'bg-purple-100 text-purple-700',
    expired:   'bg-yellow-100 text-yellow-700',
  }

  const totalQuotes      = quotations?.length || 0
  const approvedQuotes   = quotations?.filter(q => q.status === 'approved').length || 0
  const convertedValue   = quotations?.filter(q => q.status === 'converted').reduce((s, q) => s + (q.total || 0), 0) || 0
  const pendingQuotes    = quotations?.filter(q => q.status === 'sent').length || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quotations</h1>
          <p className="text-gray-600 mt-1">Create quotes, get approval, convert to invoice</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            New Quotation
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Total Quotes</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalQuotes}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Awaiting Approval</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{pendingQuotes}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Approved</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{approvedQuotes}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Converted Value</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{convertedValue.toLocaleString()} Đ</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {['all', 'draft', 'sent', 'approved', 'rejected', 'converted', 'expired'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-lg font-medium capitalize text-sm ${
              filterStatus === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quote #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Until</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quotations?.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {q.quotation_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{q.client_name || '—'}</div>
                    {q.companies && <div className="text-xs text-gray-500">{q.companies.name}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{q.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{q.valid_until || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {q.quotation_items?.length || 0} item{q.quotation_items?.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {q.total?.toLocaleString() || 0} AED
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[q.status] || 'bg-gray-100 text-gray-700'}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {/* View */}
                      <button
                        onClick={() => setViewing(q)}
                        title="View details"
                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* Edit (draft/sent only) */}
                      {canEdit && ['draft', 'sent'].includes(q.status) && (
                        <button
                          onClick={() => setEditing(q)}
                          title="Edit"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}

                      {/* Approve */}
                      {canEdit && q.status === 'sent' && (
                        <button
                          onClick={() => approveMutation.mutate(q.id)}
                          title="Approve"
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}

                      {/* Reject */}
                      {canEdit && q.status === 'sent' && (
                        <button
                          onClick={() => rejectMutation.mutate(q.id)}
                          title="Reject"
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}

                      {/* Convert to Invoice (approved only) */}
                      {canCreate && q.status === 'approved' && (
                        <button
                          onClick={() => {
                            if (confirm(`Convert "${q.quotation_number}" to an invoice?`)) {
                              convertMutation.mutate(q)
                            }
                          }}
                          title="Convert to Invoice"
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded flex items-center gap-1 text-xs font-medium"
                        >
                          <ArrowRight className="h-4 w-4" />
                          Invoice
                        </button>
                      )}

                      {/* Print / Export PDF */}
                      <button
                        onClick={() => window.open(`/dashboard/finance/quotations/${q.id}/print?auto=1`, '_blank')}
                        title="Export PDF"
                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                      >
                        <Printer className="h-4 w-4" />
                      </button>

                      {/* Delete */}
                      {canDelete && ['draft', 'rejected', 'expired'].includes(q.status) && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete quotation ${q.quotation_number}?`)) {
                              deleteMutation.mutate(q.id)
                            }
                          }}
                          title="Delete"
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(!quotations || quotations.length === 0) && (
            <div className="text-center py-12">
              <ClipboardCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No quotations found.</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {(isAdding || editing) && (
        <QuotationForm
          quotation={editing || undefined}
          onClose={() => { setIsAdding(false); setEditing(null) }}
        />
      )}
      {viewing && (
        <QuotationDetail
          quotation={viewing}
          onClose={() => setViewing(null)}
          onEdit={canEdit ? () => { setEditing(viewing); setViewing(null) } : undefined}
          onConvert={canCreate && viewing.status === 'approved' ? () => {
            if (confirm(`Convert "${viewing.quotation_number}" to an invoice?`)) {
              convertMutation.mutate(viewing)
              setViewing(null)
            }
          } : undefined}
        />
      )}
    </div>
  )
}

// ─── Quotation Detail Modal ────────────────────────────────────────────────────

function QuotationDetail({ quotation, onClose, onEdit, onConvert }: {
  quotation: Quotation
  onClose: () => void
  onEdit?: () => void
  onConvert?: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{quotation.quotation_number}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  quotation.status === 'approved' ? 'bg-green-100 text-green-700' :
                  quotation.status === 'converted' ? 'bg-purple-100 text-purple-700' :
                  quotation.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  quotation.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {quotation.status}
                </span>
                {quotation.companies && (
                  <span className="text-sm text-gray-500">{quotation.companies.name}</span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
            <div>
              <p className="text-gray-500">Client</p>
              <p className="font-medium">{quotation.client_name || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Date</p>
              <p className="font-medium">{quotation.date}</p>
            </div>
            <div>
              <p className="text-gray-500">Valid Until</p>
              <p className="font-medium">{quotation.valid_until || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Total</p>
              <p className="font-bold text-gray-900">{quotation.total?.toLocaleString() || 0} Đ</p>
            </div>
          </div>

          {/* Line Items */}
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(quotation.quotation_items || []).map((item, i) => (
                  <tr key={item.id || i}>
                    <td className="px-4 py-3">{item.description}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {item.item_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{item.quantity} {item.unit}</td>
                    <td className="px-4 py-3 text-right">{Number(item.unit_price).toLocaleString()} Đ</td>
                    <td className="px-4 py-3 text-right font-semibold">{Number(item.total_price).toLocaleString()} Đ</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-sm font-medium text-gray-600">Subtotal</td>
                  <td className="px-4 py-2 text-right text-sm font-semibold">{quotation.subtotal?.toLocaleString() || 0} Đ</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-sm font-medium text-gray-600">Tax</td>
                  <td className="px-4 py-2 text-right text-sm font-semibold">{quotation.tax > 0 ? `${quotation.tax?.toLocaleString()} Đ` : '—'}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right font-bold text-gray-900">Total</td>
                  <td className="px-4 py-2 text-right font-bold text-gray-900">{quotation.total?.toLocaleString() || 0} Đ</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {quotation.notes && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-gray-700">
              <p className="font-medium text-gray-900 mb-1">Notes</p>
              {quotation.notes}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm">
              Close
            </button>
            <button
              onClick={() => window.open(`/dashboard/finance/quotations/${quotation.id}/print?auto=1`, '_blank')}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center gap-2 text-sm"
            >
              <Printer className="h-4 w-4" /> Print / PDF
            </button>
            {onEdit && (
              <button onClick={onEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm">
                <Edit2 className="h-4 w-4" /> Edit
              </button>
            )}
            {onConvert && (
              <button onClick={onConvert} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm">
                <ArrowRight className="h-4 w-4" /> Convert to Invoice
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Quotation Form ────────────────────────────────────────────────────────────

function QuotationForm({ quotation, onClose }: { quotation?: Quotation; onClose: () => void }) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)

  // Generate a unique quotation number based on year + sequence
  const generateQuotationNumber = async (): Promise<string> => {
    const year = new Date().getFullYear()
    const prefix = `QUO-${year}-`
    const { data } = await supabase
      .from('quotations')
      .select('quotation_number')
      .ilike('quotation_number', `${prefix}%`)
      .order('quotation_number', { ascending: false })
      .limit(1)
    if (data && data.length > 0) {
      const last = data[0].quotation_number
      const seq = parseInt(last.replace(prefix, ''), 10)
      return `${prefix}${String((isNaN(seq) ? 0 : seq) + 1).padStart(3, '0')}`
    }
    return `${prefix}001`
  }

  // Header fields
  const [formData, setFormData] = useState({
    quotation_number: quotation?.quotation_number || '',
    company_id:       quotation?.company_id || '',
    client_name:      quotation?.client_name || '',
    date:             quotation?.date || new Date().toISOString().split('T')[0],
    valid_until:      quotation?.valid_until || '',
    status:           quotation?.status || 'draft',
    payment_terms:    quotation?.payment_terms || '',
    deposit_percent:  quotation?.deposit_percent?.toString() || '',
    tax_rate:         '5',
    apply_tax:        quotation ? (quotation.tax > 0 ? 'true' : 'false') : 'true',
    notes:            quotation?.notes || ''
  })

  // Line items
  const [items, setItems] = useState<QuoteItem[]>(
    quotation?.quotation_items?.map(qi => ({
      ...qi,
      quantity:   Number(qi.quantity),
      unit_price: Number(qi.unit_price),
      total_price: Number(qi.total_price),
    })) || []
  )

  // Reference data
  const [companies,   setCompanies]   = useState<any[]>([])
  const [lands,       setLands]       = useState<any[]>([])
  const [warehouses,  setWarehouses]  = useState<any[]>([])
  const [vessels,     setVessels]     = useState<any[]>([])
  const [wEquipment,  setWEquipment]  = useState<Record<string, any[]>>({})

  useEffect(() => {
    const load = async () => {
      const [c, l, w, v] = await Promise.all([
        supabase.from('companies').select('id, name').order('name'),
        supabase.from('land_purchases').select('id, land_name, remaining_tonnage').order('land_name'),
        supabase.from('warehouses').select('id, location').order('location'),
        supabase.from('vessels').select('id, name').order('name'),
      ])
      setCompanies(c.data || [])
      setLands(l.data || [])
      setWarehouses(w.data || [])
      setVessels(v.data || [])
    }
    load()

    // Auto-generate quotation number for new quotations
    if (!quotation) {
      generateQuotationNumber().then(num =>
        setFormData(prev => ({ ...prev, quotation_number: num }))
      )
    }
  }, [])

  const loadWarehouseEquipment = async (warehouseId: string) => {
    if (!warehouseId || wEquipment[warehouseId]) return
    const { data } = await supabase
      .from('land_equipment')
      .select('id, equipment_name, estimated_value, status, quantity, unit')
      .eq('warehouse_id', warehouseId)
      .in('status', ['available', 'in_warehouse'])
      .order('equipment_name')
    setWEquipment(prev => ({ ...prev, [warehouseId]: data || [] }))
  }

  // ── Item helpers ──────────────────────────────────────────────────────────

  const blankItem = (): QuoteItem => ({
    item_type:   'service',
    description: '',
    quantity:    1,
    unit:        'unit',
    unit_price:  0,
    total_price: 0,
  })

  const addItem = () => setItems(prev => [...prev, blankItem()])

  const removeItem = (index: number) =>
    setItems(prev => prev.filter((_, i) => i !== index))

  const updateItem = (index: number, field: string, value: any) => {
    setItems(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      // Auto-calculate total
      if (field === 'quantity' || field === 'unit_price') {
        const qty = field === 'quantity' ? Number(value) : Number(next[index].quantity)
        const up  = field === 'unit_price' ? Number(value) : Number(next[index].unit_price)
        next[index].total_price = qty * up
      }
      return next
    })
  }

  // When equipment is chosen, auto-fill unit_price
  const handleEquipmentSelect = (index: number, equipmentId: string, warehouseId: string) => {
    const eq = (wEquipment[warehouseId] || []).find((e: any) => e.id === equipmentId)
    if (!eq) return
    setItems(prev => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        land_equipment_id: equipmentId,
        description: eq.equipment_name,
        unit_price:  eq.estimated_value || 0,
        total_price: Number(next[index].quantity) * (eq.estimated_value || 0),
      }
      return next
    })
  }

  // ── Totals ────────────────────────────────────────────────────────────────

  const subtotal    = items.reduce((s, i) => s + (Number(i.total_price) || 0), 0)
  const applyTax    = formData.apply_tax === 'true'
  const taxRate     = parseFloat(formData.tax_rate) || 0
  const taxAmount   = applyTax ? Math.round(subtotal * taxRate / 100 * 100) / 100 : 0
  const grandTotal  = subtotal + taxAmount

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) { alert('Add at least one item'); return }
    setSaving(true)
    try {
      const payload = {
        quotation_number: formData.quotation_number,
        company_id:       formData.company_id || null,
        client_name:      formData.client_name || null,
        date:             formData.date,
        valid_until:      formData.valid_until || null,
        status:           formData.status,
        subtotal,
        tax:              taxAmount,
        total:            grandTotal,
        payment_terms:    formData.payment_terms || null,
        deposit_percent:  formData.deposit_percent ? parseFloat(formData.deposit_percent) : null,
        notes:            formData.notes || null,
      }

      let quotationId = quotation?.id

      if (quotation) {
        const { error } = await supabase.from('quotations').update(payload).eq('id', quotation.id)
        if (error) throw error
        // Remove old items and re-insert
        await supabase.from('quotation_items').delete().eq('quotation_id', quotation.id)
      } else {
        const { data, error } = await supabase.from('quotations').insert([payload]).select().single()
        if (error) throw error
        quotationId = data.id
      }

      // Insert items
      if (items.length > 0 && quotationId) {
        const itemsPayload = items.map((item, i) => ({
          quotation_id:      quotationId,
          item_type:         item.item_type,
          description:       item.description,
          quantity:          item.quantity,
          unit:              item.unit,
          unit_price:        item.unit_price,
          total_price:       item.total_price,
          warehouse_id:      item.warehouse_id || null,
          land_equipment_id: item.land_equipment_id || null,
          land_id:           item.land_id || null,
          material_type:     item.material_type || null,
          vessel_id:         item.vessel_id || null,
          sort_order:        i,
        }))
        const { error } = await supabase.from('quotation_items').insert(itemsPayload)
        if (error) throw error
      }

      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      onClose()
    } catch (err: any) {
      console.error('Save error:', err)
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {quotation ? 'Edit Quotation' : 'New Quotation'}
          </h2>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Header */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quote Number *</label>
                <input
                  type="text" required
                  value={formData.quotation_number}
                  onChange={e => setFormData({ ...formData, quotation_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date" required
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                <input
                  type="date"
                  value={formData.valid_until}
                  onChange={e => setFormData({ ...formData, valid_until: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <select
                  value={formData.company_id}
                  onChange={e => setFormData({ ...formData, company_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select company...</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="Contact person"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                <select
                  value={formData.payment_terms}
                  onChange={e => setFormData({ ...formData, payment_terms: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Required (%)</label>
                <input
                  type="number" min="0" max="100" step="1"
                  value={formData.deposit_percent}
                  onChange={e => setFormData({ ...formData, deposit_percent: e.target.value })}
                  placeholder="e.g. 50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm"
                >
                  <Plus className="h-4 w-4" /> Add Item
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <ItemRow
                    key={index}
                    index={index}
                    item={item}
                    lands={lands}
                    warehouses={warehouses}
                    vessels={vessels}
                    wEquipment={wEquipment}
                    onChange={updateItem}
                    onRemove={removeItem}
                    onWarehouseSelect={loadWarehouseEquipment}
                    onEquipmentSelect={handleEquipmentSelect}
                  />
                ))}

                {items.length === 0 && (
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-500">
                    No items yet. Click "Add Item" to start.
                  </div>
                )}
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span><span>{subtotal.toLocaleString()} Đ</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 items-center">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.apply_tax === 'true'}
                      onChange={e => setFormData({ ...formData, apply_tax: e.target.checked ? 'true' : 'false' })}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600"
                    />
                    <span>Tax</span>
                    {formData.apply_tax === 'true' && (
                      <span className="flex items-center gap-1">
                        <input
                          type="number" min="0" max="100" step="0.1"
                          value={formData.tax_rate}
                          onChange={e => setFormData({ ...formData, tax_rate: e.target.value })}
                          className="w-14 px-1 py-0.5 border border-gray-300 rounded text-right text-sm"
                        />
                        <span>%</span>
                      </span>
                    )}
                  </label>
                  <span>{taxAmount.toLocaleString()} Đ</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2">
                  <span>Total</span><span>{grandTotal.toLocaleString()} Đ</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : quotation ? 'Update Quotation' : 'Create Quotation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Line Item Row ─────────────────────────────────────────────────────────────

function ItemRow({
  index, item, lands, warehouses, vessels, wEquipment,
  onChange, onRemove, onWarehouseSelect, onEquipmentSelect,
}: {
  index: number
  item: QuoteItem
  lands: any[]
  warehouses: any[]
  vessels: any[]
  wEquipment: Record<string, any[]>
  onChange: (i: number, field: string, value: any) => void
  onRemove: (i: number) => void
  onWarehouseSelect: (id: string) => void
  onEquipmentSelect: (i: number, equipmentId: string, warehouseId: string) => void
}) {
  const typeOptions: { value: string; label: string }[] = [
    { value: 'equipment_sale',  label: 'Equipment Sale'  },
    { value: 'scrap_sale',      label: 'Scrap Sale'      },
    { value: 'vessel_rental',   label: 'Vessel Rental'   },
    { value: 'service',         label: 'Service'         },
    { value: 'other',           label: 'Other'           },
  ]

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
      {/* Row 1: type + description + remove */}
      <div className="flex gap-3 items-start">
        <div className="w-40 shrink-0">
          <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
          <select
            value={item.item_type}
            onChange={e => onChange(index, 'item_type', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          >
            {typeOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
          <input
            type="text" required
            value={item.description}
            onChange={e => onChange(index, 'description', e.target.value)}
            placeholder="Describe the item or service..."
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="mt-5 p-1.5 text-red-500 hover:bg-red-50 rounded"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Row 2: type-specific selectors */}
      {item.item_type === 'equipment_sale' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Warehouse</label>
            <select
              value={item.warehouse_id || ''}
              onChange={e => {
                onChange(index, 'warehouse_id', e.target.value)
                onChange(index, 'land_equipment_id', '')
                onWarehouseSelect(e.target.value)
              }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="">Select warehouse...</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.location}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Equipment</label>
            <select
              value={item.land_equipment_id || ''}
              onChange={e => onEquipmentSelect(index, e.target.value, item.warehouse_id || '')}
              disabled={!item.warehouse_id}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-100"
            >
              <option value="">Select equipment...</option>
              {(wEquipment[item.warehouse_id || ''] || []).map((eq: any) => (
                <option key={eq.id} value={eq.id}>
                  {eq.equipment_name} — {eq.quantity ?? 0} {eq.unit || 'unit'} available — Đ {eq.estimated_value?.toLocaleString() || 0}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {item.item_type === 'scrap_sale' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Land</label>
            <select
              value={item.land_id || ''}
              onChange={e => onChange(index, 'land_id', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="">Select land...</option>
              {lands.map(l => (
                <option key={l.id} value={l.id}>{l.land_name} ({l.remaining_tonnage || 0} tons)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Material Type</label>
            <input
              type="text"
              value={item.material_type || ''}
              onChange={e => onChange(index, 'material_type', e.target.value)}
              placeholder="e.g. steel, copper..."
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
      )}

      {item.item_type === 'vessel_rental' && (
        <div className="w-1/2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Vessel</label>
          <select
            value={item.vessel_id || ''}
            onChange={e => onChange(index, 'vessel_id', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          >
            <option value="">Select vessel...</option>
            {vessels.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Row 3: qty + unit + unit_price + total */}
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
          <input
            type="number" step="0.001" min="0"
            value={item.quantity}
            onChange={e => onChange(index, 'quantity', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
          <input
            type="text"
            value={item.unit}
            onChange={e => onChange(index, 'unit', e.target.value)}
            placeholder="unit / ton / day"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unit Price (Đ)</label>
          <input
            type="number" step="0.01" min="0"
            value={item.unit_price}
            onChange={e => onChange(index, 'unit_price', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Total (Đ)</label>
          <div className="px-2 py-1.5 bg-white border border-gray-200 rounded text-sm font-semibold text-gray-900">
            {Number(item.total_price).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}
