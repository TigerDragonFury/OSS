'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthContext'
import { hasModulePermission } from '@/lib/auth/rolePermissions'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  TrendingUp,
  DollarSign,
  Package,
  LandPlot,
  Ship,
  FileText,
  ArrowDownCircle,
  Filter,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface IncomeRecord {
  id: string
  income_date: string
  income_type: string
  source_type?: string
  amount: number
  description?: string
  customer_company_id?: string
  payment_method?: string
  bank_account_id?: string
  reference_id?: string
  companies?: { name: string }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INCOME_TYPE_LABELS: Record<string, string> = {
  scrap_sale:       'Scrap Sale',
  equipment_sale:   'Equipment Sale',
  vessel_rental:    'Vessel Rental',
  invoice:          'Invoice',
  other:            'Other',
}

const INCOME_TYPE_ICONS: Record<string, React.ReactNode> = {
  scrap_sale:     <LandPlot  className="h-4 w-4" />,
  equipment_sale: <Package   className="h-4 w-4" />,
  vessel_rental:  <Ship      className="h-4 w-4" />,
  invoice:        <FileText  className="h-4 w-4" />,
  other:          <DollarSign className="h-4 w-4" />,
}

const INCOME_TYPE_COLORS: Record<string, string> = {
  scrap_sale:     'bg-yellow-100 text-yellow-700',
  equipment_sale: 'bg-blue-100 text-blue-700',
  vessel_rental:  'bg-purple-100 text-purple-700',
  invoice:        'bg-green-100 text-green-700',
  other:          'bg-gray-100 text-gray-700',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IncomePage() {
  const supabase = createClient()
  const { user } = useAuth()

  const userRole = user?.role || user?.roles?.[0] || 'storekeeper'
  const canView = hasModulePermission(userRole, ['finance', 'income'], 'view')

  // Filters
  const [filterType,  setFilterType]  = useState('all')
  const [filterMonth, setFilterMonth] = useState('')       // YYYY-MM
  const [search,      setSearch]      = useState('')

  // Fetch income_records
  const { data: records, isLoading } = useQuery({
    queryKey: ['income_records', filterType, filterMonth],
    queryFn: async () => {
      let q = supabase
        .from('income_records')
        .select('*, companies:customer_company_id(name)')
        .order('income_date', { ascending: false })

      if (filterType !== 'all') q = q.eq('income_type', filterType)

      if (filterMonth) {
        const start = filterMonth + '-01'
        const year = parseInt(filterMonth.split('-')[0])
        const month = parseInt(filterMonth.split('-')[1])
        const end = new Date(year, month, 0).toISOString().split('T')[0]
        q = q.gte('income_date', start).lte('income_date', end)
      }

      const { data, error } = await q
      if (error) throw error
      return data as IncomeRecord[]
    },
    enabled: canView
  })

  // Filtered by search
  const filtered = (records || []).filter(r => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      r.description?.toLowerCase().includes(term) ||
      r.income_type?.toLowerCase().includes(term) ||
      r.companies?.name?.toLowerCase().includes(term) ||
      r.payment_method?.toLowerCase().includes(term)
    )
  })

  // Summaries
  const totalIncome = filtered.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  const byType = filtered.reduce<Record<string, number>>((acc, r) => {
    acc[r.income_type] = (acc[r.income_type] || 0) + Number(r.amount)
    return acc
  }, {})

  if (!canView) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p>You do not have permission to view income records.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Income</h1>
        <p className="text-gray-600 mt-1">All income records across scrap, equipment, rentals and invoices</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-5 border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Total Income</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{totalIncome.toLocaleString()} Đ</p>
        </div>
        {Object.entries(byType).map(([type, amount]) => (
          <div key={type} className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500 flex items-center gap-1">
              {INCOME_TYPE_ICONS[type]}
              {INCOME_TYPE_LABELS[type] || type}
            </p>
            <p className="text-xl font-bold text-gray-900 mt-1">{Number(amount).toLocaleString()} Đ</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Income Type</label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Types</option>
              <option value="scrap_sale">Scrap Sale</option>
              <option value="equipment_sale">Equipment Sale</option>
              <option value="vessel_rental">Vessel Rental</option>
              <option value="invoice">Invoice</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
            <input
              type="month"
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search description, company..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {(filterType !== 'all' || filterMonth || search) && (
          <button
            onClick={() => { setFilterType('all'); setFilterMonth(''); setSearch('') }}
            className="mt-3 text-xs text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        )}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.income_date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full ${
                      INCOME_TYPE_COLORS[record.income_type] || 'bg-gray-100 text-gray-700'
                    }`}>
                      {INCOME_TYPE_ICONS[record.income_type]}
                      {INCOME_TYPE_LABELS[record.income_type] || record.income_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                    {record.description || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {record.companies?.name || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {record.payment_method?.replace('_', ' ') || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-bold text-green-600">
                      + {Number(record.amount).toLocaleString()} AED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <ArrowDownCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No income records found.</p>
            </div>
          )}
        </div>
      )}

      {/* Footer total */}
      {filtered.length > 0 && (
        <div className="flex justify-end">
          <div className="bg-white rounded-lg shadow px-6 py-4 flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Showing {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </span>
            <span className="text-lg font-bold text-green-600">
              Total: {totalIncome.toLocaleString()} AED
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
