'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Truck, Plus, Edit2, Trash2, DollarSign, TrendingUp, TrendingDown,
  MapPin, Package, Fuel, Wrench, X, CheckCircle, Clock, AlertCircle,
  BarChart3, ChevronDown,
} from 'lucide-react'

const supabase = createClient()

type Tab = 'overview' | 'jobs' | 'rentals' | 'expenses' | 'fleet'

const EXPENSE_CATEGORIES = [
  { value: 'diesel', label: 'Diesel / Fuel' },
  { value: 'maintenance', label: 'Maintenance & Repairs' },
  { value: 'tires', label: 'Tires' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'registration', label: 'Registration & Permits' },
  { value: 'tolls', label: 'Tolls & Road Fees' },
  { value: 'driver_wages', label: 'Driver Wages' },
  { value: 'washing', label: 'Washing & Cleaning' },
  { value: 'other', label: 'Other' },
]

const TRAILER_TYPES = ['Flatbed', 'Enclosed/Box', 'Refrigerated', 'Tanker', 'Tipper', 'Low Loader', 'Curtainsider', 'Other']

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-gray-100 text-gray-500',
    active: 'bg-blue-100 text-blue-700',
    maintenance: 'bg-orange-100 text-orange-700',
    sold: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold capitalize ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Modal wrapper ────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-all"

export default function TrailersPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('overview')

  // Modal states
  const [jobModal, setJobModal] = useState<{ open: boolean; data?: any }>({ open: false })
  const [rentalModal, setRentalModal] = useState<{ open: boolean; data?: any }>({ open: false })
  const [expenseModal, setExpenseModal] = useState<{ open: boolean; data?: any }>({ open: false })
  const [fleetModal, setFleetModal] = useState<{ open: boolean; data?: any }>({ open: false })

  // ── Queries ────────────────────────────────────────────────
  const { data: trailers = [] } = useQuery({
    queryKey: ['trailers'],
    queryFn: async () => {
      const { data } = await supabase.from('trailers').select('*').order('name')
      return data || []
    }
  })

  const { data: jobs = [] } = useQuery({
    queryKey: ['haulage_jobs'],
    queryFn: async () => {
      const { data } = await supabase.from('haulage_jobs')
        .select('*, trailers(name), bank_accounts(account_name)')
        .order('job_date', { ascending: false })
      return data || []
    }
  })

  const { data: rentals = [] } = useQuery({
    queryKey: ['trailer_rentals'],
    queryFn: async () => {
      const { data } = await supabase.from('trailer_rentals')
        .select('*, bank_accounts(account_name)')
        .order('rental_date', { ascending: false })
      return data || []
    }
  })

  const { data: expenses = [] } = useQuery({
    queryKey: ['trailer_expenses'],
    queryFn: async () => {
      const { data } = await supabase.from('trailer_expenses')
        .select('*, trailers(name), bank_accounts(account_name)')
        .order('expense_date', { ascending: false })
      return data || []
    }
  })

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank_accounts_active'],
    queryFn: async () => {
      const { data } = await supabase.from('bank_accounts').select('id, account_name').eq('status', 'active').order('account_name')
      return data || []
    }
  })

  // ── Summary stats ──────────────────────────────────────────
  const totalIncome = jobs.filter((j: any) => j.payment_status === 'paid' && !j.is_own_goods)
    .reduce((s: number, j: any) => s + (j.charge_amount || 0), 0)
  const pendingIncome = jobs.filter((j: any) => j.payment_status === 'pending' && !j.is_own_goods)
    .reduce((s: number, j: any) => s + (j.charge_amount || 0), 0)
  const totalRentalCost = rentals.reduce((s: number, r: any) => s + (r.rental_cost || 0), 0)
  const totalExpenses = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0)
  const netProfit = totalIncome - totalRentalCost - totalExpenses

  // ── Mutations ──────────────────────────────────────────────
  const saveJob = useMutation({
    mutationFn: async (form: any) => {
      const payload = {
        trailer_id: form.trailer_id || null,
        job_date: form.job_date,
        client_name: form.is_own_goods ? 'Own Goods' : form.client_name,
        origin: form.origin,
        destination: form.destination,
        cargo_description: form.cargo_description,
        cargo_weight_tons: form.cargo_weight_tons ? parseFloat(form.cargo_weight_tons) : null,
        distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
        charge_amount: parseFloat(form.charge_amount) || 0,
        is_own_goods: !!form.is_own_goods,
        payment_status: form.payment_status,
        payment_date: form.payment_date || null,
        bank_account_id: form.bank_account_id || null,
        notes: form.notes,
      }
      if (form.id) {
        await supabase.from('haulage_jobs').update(payload).eq('id', form.id)
      } else {
        await supabase.from('haulage_jobs').insert(payload)
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['haulage_jobs'] }); setJobModal({ open: false }) }
  })

  const deleteJob = useMutation({
    mutationFn: async (id: string) => { await supabase.from('haulage_jobs').delete().eq('id', id) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['haulage_jobs'] })
  })

  const saveRental = useMutation({
    mutationFn: async (form: any) => {
      const payload = {
        rental_date: form.rental_date,
        trailer_description: form.trailer_description,
        rental_company: form.rental_company,
        origin: form.origin,
        destination: form.destination,
        cargo_description: form.cargo_description,
        rental_cost: parseFloat(form.rental_cost),
        payment_status: form.payment_status,
        bank_account_id: form.bank_account_id || null,
        notes: form.notes,
      }
      if (form.id) {
        await supabase.from('trailer_rentals').update(payload).eq('id', form.id)
      } else {
        await supabase.from('trailer_rentals').insert(payload)
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trailer_rentals'] }); setRentalModal({ open: false }) }
  })

  const deleteRental = useMutation({
    mutationFn: async (id: string) => { await supabase.from('trailer_rentals').delete().eq('id', id) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trailer_rentals'] })
  })

  const saveExpense = useMutation({
    mutationFn: async (form: any) => {
      const payload = {
        trailer_id: form.trailer_id || null,
        expense_date: form.expense_date,
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
        vendor: form.vendor,
        bank_account_id: form.bank_account_id || null,
        notes: form.notes,
      }
      if (form.id) {
        await supabase.from('trailer_expenses').update(payload).eq('id', form.id)
      } else {
        await supabase.from('trailer_expenses').insert(payload)
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trailer_expenses'] }); setExpenseModal({ open: false }) }
  })

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => { await supabase.from('trailer_expenses').delete().eq('id', id) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trailer_expenses'] })
  })

  const saveTrailer = useMutation({
    mutationFn: async (form: any) => {
      const payload = {
        name: form.name,
        plate_number: form.plate_number,
        trailer_type: form.trailer_type,
        capacity_tons: form.capacity_tons ? parseFloat(form.capacity_tons) : null,
        year_purchased: form.year_purchased ? parseInt(form.year_purchased) : null,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
        status: form.status,
        notes: form.notes,
      }
      if (form.id) {
        await supabase.from('trailers').update(payload).eq('id', form.id)
      } else {
        await supabase.from('trailers').insert(payload)
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trailers'] }); setFleetModal({ open: false }) }
  })

  const deleteTrailer = useMutation({
    mutationFn: async (id: string) => { await supabase.from('trailers').delete().eq('id', id) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trailers'] })
  })

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'jobs', label: 'Haulage Jobs', icon: Truck },
    { key: 'rentals', label: 'Trailer Rentals', icon: Package },
    { key: 'expenses', label: 'Expenses', icon: Fuel },
    { key: 'fleet', label: 'My Fleet', icon: Wrench },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Trailers & Logistics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Haulage jobs, rented trailers, and operating expenses</p>
        </div>
        <div className="flex gap-2">
          {tab === 'jobs' && (
            <button onClick={() => setJobModal({ open: true, data: undefined })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              <Plus className="h-4 w-4" /> Add Job
            </button>
          )}
          {tab === 'rentals' && (
            <button onClick={() => setRentalModal({ open: true, data: undefined })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              <Plus className="h-4 w-4" /> Add Rental
            </button>
          )}
          {tab === 'expenses' && (
            <button onClick={() => setExpenseModal({ open: true, data: undefined })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              <Plus className="h-4 w-4" /> Add Expense
            </button>
          )}
          {tab === 'fleet' && (
            <button onClick={() => setFleetModal({ open: true, data: undefined })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              <Plus className="h-4 w-4" /> Add Trailer
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Income (Paid)" value={`${totalIncome.toLocaleString()} AED`} sub="From haulage jobs" icon={TrendingUp} color="bg-emerald-50 text-emerald-600" />
            <StatCard label="Pending Income" value={`${pendingIncome.toLocaleString()} AED`} sub="Awaiting payment" icon={Clock} color="bg-amber-50 text-amber-600" />
            <StatCard label="Total Costs" value={`${(totalRentalCost + totalExpenses).toLocaleString()} AED`} sub="Rentals + expenses" icon={TrendingDown} color="bg-red-50 text-red-500" />
            <div className={`rounded-xl border p-5 shadow-sm ${netProfit >= 0 ? 'bg-blue-600 border-blue-600' : 'bg-red-500 border-red-500'}`}>
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Net Profit</p>
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{netProfit.toLocaleString()}</p>
              <p className="text-xs text-white/60 mt-0.5">AED</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Recent jobs */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Recent Haulage Jobs</h3>
                <button onClick={() => setTab('jobs')} className="text-xs text-blue-600 hover:underline">View all</button>
              </div>
              <div className="divide-y divide-gray-50">
                {jobs.slice(0, 6).map((j: any) => (
                  <div key={j.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {j.is_own_goods ? <span className="text-violet-600">Own Goods</span> : j.client_name}
                      </p>
                      <p className="text-xs text-gray-400">{j.origin} → {j.destination} · {new Date(j.job_date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-800">{j.charge_amount?.toLocaleString()} AED</p>
                      <StatusBadge status={j.payment_status} />
                    </div>
                  </div>
                ))}
                {jobs.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No jobs recorded yet</p>}
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800">Cost Breakdown</h3>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Trailer Rentals</span>
                  <span className="font-semibold text-gray-800">{totalRentalCost.toLocaleString()} AED</span>
                </div>
                {EXPENSE_CATEGORIES.map(cat => {
                  const total = expenses.filter((e: any) => e.category === cat.value).reduce((s: number, e: any) => s + e.amount, 0)
                  if (!total) return null
                  return (
                    <div key={cat.value} className="flex justify-between text-sm">
                      <span className="text-gray-500">{cat.label}</span>
                      <span className="font-semibold text-gray-800">{total.toLocaleString()} AED</span>
                    </div>
                  )
                })}
                <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-bold">
                  <span>Total Costs</span>
                  <span className="text-red-600">{(totalRentalCost + totalExpenses).toLocaleString()} AED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HAULAGE JOBS ──────────────────────────────────────── */}
      {tab === 'jobs' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Route</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trailer</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Charge</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map((j: any) => (
                  <tr key={j.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{new Date(j.job_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{j.is_own_goods ? '— Own Goods —' : j.client_name}</p>
                      {j.cargo_description && <p className="text-xs text-gray-400">{j.cargo_description}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p>{j.origin}</p>
                      <p className="text-gray-400">→ {j.destination}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{j.trailers?.name || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{j.charge_amount?.toLocaleString()} AED</td>
                    <td className="px-4 py-3"><StatusBadge status={j.payment_status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setJobModal({ open: true, data: j })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => confirm('Delete this job?') && deleteJob.mutate(j.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">No haulage jobs recorded. Click "Add Job" to get started.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TRAILER RENTALS ───────────────────────────────────── */}
      {tab === 'rentals' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trailer / Company</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Route</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cargo</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cost</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rentals.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{new Date(r.rental_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{r.trailer_description || '—'}</p>
                      <p className="text-xs text-gray-400">{r.rental_company || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.origin && <><p>{r.origin}</p><p className="text-gray-400">→ {r.destination}</p></>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">{r.cargo_description || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">{r.rental_cost?.toLocaleString()} AED</td>
                    <td className="px-4 py-3"><StatusBadge status={r.payment_status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setRentalModal({ open: true, data: r })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => confirm('Delete this rental?') && deleteRental.mutate(r.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rentals.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">No trailer rentals recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── EXPENSES ──────────────────────────────────────────── */}
      {tab === 'expenses' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trailer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.map((e: any) => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{new Date(e.expense_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 capitalize">
                        {EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label || e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{e.description}</td>
                    <td className="px-4 py-3 text-gray-500">{e.trailers?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{e.vendor || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">{e.amount?.toLocaleString()} AED</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setExpenseModal({ open: true, data: e })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => confirm('Delete this expense?') && deleteExpense.mutate(e.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">No expenses recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── FLEET ─────────────────────────────────────────────── */}
      {tab === 'fleet' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trailers.map((t: any) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-blue-600" />
                </div>
                <StatusBadge status={t.status} />
              </div>
              <h3 className="font-bold text-gray-900">{t.name}</h3>
              {t.plate_number && <p className="text-xs text-gray-500 mt-0.5">{t.plate_number}</p>}
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                {t.trailer_type && <div className="flex justify-between text-xs"><span className="text-gray-400">Type</span><span className="font-medium text-gray-700">{t.trailer_type}</span></div>}
                {t.capacity_tons && <div className="flex justify-between text-xs"><span className="text-gray-400">Capacity</span><span className="font-medium text-gray-700">{t.capacity_tons} tons</span></div>}
                {t.purchase_price && <div className="flex justify-between text-xs"><span className="text-gray-400">Purchase Price</span><span className="font-medium text-gray-700">{t.purchase_price.toLocaleString()} AED</span></div>}
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setFleetModal({ open: true, data: t })}
                  className="flex-1 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                  Edit
                </button>
                <button onClick={() => confirm('Delete this trailer?') && deleteTrailer.mutate(t.id)}
                  className="flex-1 py-1.5 text-xs font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          ))}
          {trailers.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <Truck className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No trailers in your fleet yet. Click "Add Trailer" to register one.</p>
            </div>
          )}
        </div>
      )}

      {/* ── JOB MODAL ─────────────────────────────────────────── */}
      {jobModal.open && (
        <JobModal
          data={jobModal.data}
          trailers={trailers}
          bankAccounts={bankAccounts}
          onClose={() => setJobModal({ open: false })}
          onSave={(form: any) => saveJob.mutate(form)}
          saving={saveJob.isPending}
        />
      )}

      {/* ── RENTAL MODAL ──────────────────────────────────────── */}
      {rentalModal.open && (
        <RentalModal
          data={rentalModal.data}
          bankAccounts={bankAccounts}
          onClose={() => setRentalModal({ open: false })}
          onSave={(form: any) => saveRental.mutate(form)}
          saving={saveRental.isPending}
        />
      )}

      {/* ── EXPENSE MODAL ─────────────────────────────────────── */}
      {expenseModal.open && (
        <ExpenseModal
          data={expenseModal.data}
          trailers={trailers}
          bankAccounts={bankAccounts}
          onClose={() => setExpenseModal({ open: false })}
          onSave={(form: any) => saveExpense.mutate(form)}
          saving={saveExpense.isPending}
        />
      )}

      {/* ── FLEET MODAL ───────────────────────────────────────── */}
      {fleetModal.open && (
        <FleetModal
          data={fleetModal.data}
          onClose={() => setFleetModal({ open: false })}
          onSave={(form: any) => saveTrailer.mutate(form)}
          saving={saveTrailer.isPending}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Sub-components: Modals
// ─────────────────────────────────────────────────────────────

function JobModal({ data, trailers, bankAccounts, onClose, onSave, saving }: any) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    id: data?.id || '',
    trailer_id: data?.trailer_id || '',
    job_date: data?.job_date || today,
    client_name: data?.client_name || '',
    origin: data?.origin || '',
    destination: data?.destination || '',
    cargo_description: data?.cargo_description || '',
    cargo_weight_tons: data?.cargo_weight_tons || '',
    distance_km: data?.distance_km || '',
    charge_amount: data?.charge_amount || '',
    is_own_goods: data?.is_own_goods || false,
    payment_status: data?.payment_status || 'pending',
    payment_date: data?.payment_date || '',
    bank_account_id: data?.bank_account_id || '',
    notes: data?.notes || '',
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal title={form.id ? 'Edit Haulage Job' : 'Add Haulage Job'} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-lg border border-violet-100">
          <input type="checkbox" id="own_goods" checked={form.is_own_goods}
            onChange={e => set('is_own_goods', e.target.checked)}
            className="w-4 h-4 accent-violet-600" />
          <label htmlFor="own_goods" className="text-sm font-medium text-violet-800">
            Personal / Own Goods Run (not a client job)
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Job Date *">
            <input type="date" className={inputCls} value={form.job_date} onChange={e => set('job_date', e.target.value)} />
          </FormRow>
          <FormRow label="Trailer">
            <select className={inputCls} value={form.trailer_id} onChange={e => set('trailer_id', e.target.value)}>
              <option value="">— None / Rented —</option>
              {trailers.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </FormRow>
        </div>

        {!form.is_own_goods && (
          <FormRow label="Client Name *">
            <input className={inputCls} placeholder="Company or person name" value={form.client_name}
              onChange={e => set('client_name', e.target.value)} />
          </FormRow>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Origin *">
            <input className={inputCls} placeholder="From" value={form.origin} onChange={e => set('origin', e.target.value)} />
          </FormRow>
          <FormRow label="Destination *">
            <input className={inputCls} placeholder="To" value={form.destination} onChange={e => set('destination', e.target.value)} />
          </FormRow>
        </div>

        <FormRow label="Cargo Description">
          <input className={inputCls} placeholder="What was shipped?" value={form.cargo_description}
            onChange={e => set('cargo_description', e.target.value)} />
        </FormRow>

        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Weight (tons)">
            <input type="number" className={inputCls} placeholder="0.00" value={form.cargo_weight_tons}
              onChange={e => set('cargo_weight_tons', e.target.value)} />
          </FormRow>
          <FormRow label="Distance (km)">
            <input type="number" className={inputCls} placeholder="0" value={form.distance_km}
              onChange={e => set('distance_km', e.target.value)} />
          </FormRow>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormRow label={form.is_own_goods ? 'Estimated Value (AED)' : 'Charge Amount (AED) *'}>
            <input type="number" className={inputCls} placeholder="0.00" value={form.charge_amount}
              onChange={e => set('charge_amount', e.target.value)} />
          </FormRow>
          <FormRow label="Payment Status">
            <select className={inputCls} value={form.payment_status} onChange={e => set('payment_status', e.target.value)}>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </FormRow>
        </div>

        {form.payment_status === 'paid' && (
          <div className="grid grid-cols-2 gap-3">
            <FormRow label="Payment Date">
              <input type="date" className={inputCls} value={form.payment_date} onChange={e => set('payment_date', e.target.value)} />
            </FormRow>
            <FormRow label="Bank Account">
              <select className={inputCls} value={form.bank_account_id} onChange={e => set('bank_account_id', e.target.value)}>
                <option value="">— Select —</option>
                {bankAccounts.map((b: any) => <option key={b.id} value={b.id}>{b.account_name}</option>)}
              </select>
            </FormRow>
          </div>
        )}

        <FormRow label="Notes">
          <textarea className={inputCls} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </FormRow>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {saving ? 'Saving…' : 'Save Job'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function RentalModal({ data, bankAccounts, onClose, onSave, saving }: any) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    id: data?.id || '',
    rental_date: data?.rental_date || today,
    trailer_description: data?.trailer_description || '',
    rental_company: data?.rental_company || '',
    origin: data?.origin || '',
    destination: data?.destination || '',
    cargo_description: data?.cargo_description || '',
    rental_cost: data?.rental_cost || '',
    payment_status: data?.payment_status || 'paid',
    bank_account_id: data?.bank_account_id || '',
    notes: data?.notes || '',
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal title={form.id ? 'Edit Trailer Rental' : 'Add Trailer Rental'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Date *">
            <input type="date" className={inputCls} value={form.rental_date} onChange={e => set('rental_date', e.target.value)} />
          </FormRow>
          <FormRow label="Rental Cost (AED) *">
            <input type="number" className={inputCls} placeholder="0.00" value={form.rental_cost}
              onChange={e => set('rental_cost', e.target.value)} />
          </FormRow>
        </div>

        <FormRow label="Trailer Description">
          <input className={inputCls} placeholder="e.g. 40ft flatbed trailer" value={form.trailer_description}
            onChange={e => set('trailer_description', e.target.value)} />
        </FormRow>

        <FormRow label="Rental Company / Owner">
          <input className={inputCls} placeholder="Who you rented from" value={form.rental_company}
            onChange={e => set('rental_company', e.target.value)} />
        </FormRow>

        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Origin">
            <input className={inputCls} placeholder="From" value={form.origin} onChange={e => set('origin', e.target.value)} />
          </FormRow>
          <FormRow label="Destination">
            <input className={inputCls} placeholder="To" value={form.destination} onChange={e => set('destination', e.target.value)} />
          </FormRow>
        </div>

        <FormRow label="Cargo / Purpose">
          <input className={inputCls} placeholder="What was shipped?" value={form.cargo_description}
            onChange={e => set('cargo_description', e.target.value)} />
        </FormRow>

        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Payment Status">
            <select className={inputCls} value={form.payment_status} onChange={e => set('payment_status', e.target.value)}>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
          </FormRow>
          <FormRow label="Bank Account">
            <select className={inputCls} value={form.bank_account_id} onChange={e => set('bank_account_id', e.target.value)}>
              <option value="">— Select —</option>
              {bankAccounts.map((b: any) => <option key={b.id} value={b.id}>{b.account_name}</option>)}
            </select>
          </FormRow>
        </div>

        <FormRow label="Notes">
          <textarea className={inputCls} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </FormRow>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {saving ? 'Saving…' : 'Save Rental'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ExpenseModal({ data, trailers, bankAccounts, onClose, onSave, saving }: any) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    id: data?.id || '',
    trailer_id: data?.trailer_id || '',
    expense_date: data?.expense_date || today,
    category: data?.category || 'diesel',
    description: data?.description || '',
    amount: data?.amount || '',
    vendor: data?.vendor || '',
    bank_account_id: data?.bank_account_id || '',
    notes: data?.notes || '',
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal title={form.id ? 'Edit Expense' : 'Add Expense'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Date *">
            <input type="date" className={inputCls} value={form.expense_date} onChange={e => set('expense_date', e.target.value)} />
          </FormRow>
          <FormRow label="Trailer">
            <select className={inputCls} value={form.trailer_id} onChange={e => set('trailer_id', e.target.value)}>
              <option value="">— General —</option>
              {trailers.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </FormRow>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Category *">
            <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
              {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </FormRow>
          <FormRow label="Amount (AED) *">
            <input type="number" className={inputCls} placeholder="0.00" value={form.amount}
              onChange={e => set('amount', e.target.value)} />
          </FormRow>
        </div>

        <FormRow label="Description *">
          <input className={inputCls} placeholder="e.g. Diesel fill-up at ADNOC" value={form.description}
            onChange={e => set('description', e.target.value)} />
        </FormRow>

        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Vendor / Supplier">
            <input className={inputCls} placeholder="Station, garage, etc." value={form.vendor}
              onChange={e => set('vendor', e.target.value)} />
          </FormRow>
          <FormRow label="Bank Account">
            <select className={inputCls} value={form.bank_account_id} onChange={e => set('bank_account_id', e.target.value)}>
              <option value="">— Select —</option>
              {bankAccounts.map((b: any) => <option key={b.id} value={b.id}>{b.account_name}</option>)}
            </select>
          </FormRow>
        </div>

        <FormRow label="Notes">
          <textarea className={inputCls} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </FormRow>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {saving ? 'Saving…' : 'Save Expense'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function FleetModal({ data, onClose, onSave, saving }: any) {
  const [form, setForm] = useState({
    id: data?.id || '',
    name: data?.name || '',
    plate_number: data?.plate_number || '',
    trailer_type: data?.trailer_type || '',
    capacity_tons: data?.capacity_tons || '',
    year_purchased: data?.year_purchased || '',
    purchase_price: data?.purchase_price || '',
    status: data?.status || 'active',
    notes: data?.notes || '',
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal title={form.id ? 'Edit Trailer' : 'Add Trailer'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Trailer Name *">
            <input className={inputCls} placeholder="e.g. Trailer 1" value={form.name} onChange={e => set('name', e.target.value)} />
          </FormRow>
          <FormRow label="Plate Number">
            <input className={inputCls} placeholder="ABC-1234" value={form.plate_number} onChange={e => set('plate_number', e.target.value)} />
          </FormRow>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Type">
            <select className={inputCls} value={form.trailer_type} onChange={e => set('trailer_type', e.target.value)}>
              <option value="">— Select —</option>
              {TRAILER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormRow>
          <FormRow label="Capacity (tons)">
            <input type="number" className={inputCls} placeholder="0.00" value={form.capacity_tons}
              onChange={e => set('capacity_tons', e.target.value)} />
          </FormRow>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Year Purchased">
            <input type="number" className={inputCls} placeholder="2020" value={form.year_purchased}
              onChange={e => set('year_purchased', e.target.value)} />
          </FormRow>
          <FormRow label="Purchase Price (AED)">
            <input type="number" className={inputCls} placeholder="0.00" value={form.purchase_price}
              onChange={e => set('purchase_price', e.target.value)} />
          </FormRow>
        </div>

        <FormRow label="Status">
          <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="maintenance">Under Maintenance</option>
            <option value="sold">Sold</option>
          </select>
        </FormRow>

        <FormRow label="Notes">
          <textarea className={inputCls} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </FormRow>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || !form.name}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {saving ? 'Saving…' : 'Save Trailer'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
