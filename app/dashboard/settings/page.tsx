'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef, useEffect } from 'react'
import {
  Settings, Bell, Lock, Database, Building2, Users,
  Upload, Save, Check, Shield, Edit2, X, UserCheck, AlertCircle
} from 'lucide-react'
import { ROLE_PERMISSIONS } from '@/lib/auth/rolePermissions'

const MODULE_LABELS: Record<string, string> = {
  // ── General ──────────────────────────────────────────────────
  'dashboard':              'Dashboard',
  'companies':              'Companies',
  'profile':                'My Profile',
  // ── Marine ───────────────────────────────────────────────────
  'marine.vessels':         'Vessels',
  'marine.warehouses':      'Warehouses',
  'marine.inventory':       'Marine Inventory',
  'marine.equipment':       'Equipment Tracking',
  'marine.requisitions':    'Requisitions',
  'marine.overhauls':       'Overhauls',
  'marine.maintenance':     'Maintenance',
  'marine.fuel':            'Fuel Records',
  'marine.customers':       'Marine Customers',
  'marine.rentals':         'Vessel Rentals',
  // ── Rentals ──────────────────────────────────────────────────
  'rentals.bookings':       'Rental Bookings',
  'rentals.customers':      'Rental Customers',
  'rentals.payments':       'Rental Payments',
  // ── Scrap ────────────────────────────────────────────────────
  'scrap.lands':            'Scrap Lands',
  'scrap.equipment':        'Scrap Equipment',
  // ── Logistics ────────────────────────────────────────────────
  'trailers':               'Trailers / Logistics',
  // ── Finance ──────────────────────────────────────────────────
  'finance.quickEntry':     'Quick Entry',
  'finance.quotations':     'Quotations',
  'finance.invoices':       'Invoices',
  'finance.income':         'Income',
  'finance.expenses':       'Expenses',
  'finance.bankAccounts':   'Bank Accounts',
  'finance.reports':        'Reports',
  // ── Crew & HR ────────────────────────────────────────────────
  'crew.assignments':       'Crew Assignments',
  'crew.certifications':    'Crew Certifications',
  'hr.employees':           'Employees',
  'hr.salaries':            'Salaries',
  // ── System ───────────────────────────────────────────────────
  'settings':               'Settings',
}

const ROLES = ['admin', 'accountant', 'hr', 'storekeeper']
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  accountant: 'Accountant',
  hr: 'HR',
  storekeeper: 'Storekeeper',
}
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  accountant: 'bg-blue-100 text-blue-700',
  hr: 'bg-purple-100 text-purple-700',
  storekeeper: 'bg-amber-100 text-amber-700',
}

function flattenPermissions(perms: any, prefix = ''): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(perms)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && 'canView' in (v as any)) {
      out[key] = v
    } else if (v && typeof v === 'object') {
      Object.assign(out, flattenPermissions(v, key))
    }
  }
  return out
}

/** Convert a permission object → level string */
function toLevel(a: any): string {
  if (!a?.canView) return 'none'
  if (a.canDelete) return 'full'
  if (a.canEdit)   return 'edit'
  if (a.canCreate) return 'create'
  return 'view'
}

/** Convert level string → permission object */
function fromLevel(level: string) {
  switch (level) {
    case 'full':   return { canView: true, canCreate: true, canEdit: true,  canDelete: true  }
    case 'edit':   return { canView: true, canCreate: true, canEdit: true,  canDelete: false }
    case 'create': return { canView: true, canCreate: true, canEdit: false, canDelete: false }
    case 'view':   return { canView: true, canCreate: false, canEdit: false, canDelete: false }
    default:       return { canView: false, canCreate: false, canEdit: false, canDelete: false }
  }
}

export default function SettingsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState('company')
  const [saved, setSaved] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const userRole = user?.role || user?.roles?.[0] || 'storekeeper'
  const isAdmin = userRole === 'admin'

  // â”€â”€ Company Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { data: settings } = useQuery({
    queryKey: ['company_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_settings').select('*').limit(1).maybeSingle()
      if (error) console.error('company_settings error:', error)
      return data
    }
  })

  const defaultForm = {
    company_name: 'OSS Group',
    company_tagline: 'Operations Support Systems',
    logo_url: '',
    address_line1: '', address_line2: '', city: '', country: 'UAE',
    phone: '', email: '', website: '', trn: '',
    currency: 'AED', date_format: 'DD/MM/YYYY',
    quotation_prefix: 'QUO', invoice_prefix: 'INV',
    default_payment_terms: 'Net 30', default_tax_rate: 0,
    quotation_terms: '', invoice_terms: '', bank_details: '',
  }

  const [form, setForm] = useState<any>(defaultForm)
  const [formLoaded, setFormLoaded] = useState(false)

  // Proper effect-based form init (avoids setState-in-render anti-pattern)
  useEffect(() => {
    if (settings && !formLoaded) {
      setForm(settings)
      setFormLoaded(true)
    }
  }, [settings, formLoaded])

  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }))

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const { id, created_at, updated_at, ...payload } = data
      if (id) {
        const { error } = await supabase.from('company_settings').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('company_settings').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (err: any) => alert(`Save failed: ${err?.message || JSON.stringify(err)}`)
  })

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `company-logo.${ext}`
      const { error: upErr } = await supabase.storage.from('company-assets').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('company-assets').getPublicUrl(path)
      setForm((p: any) => ({ ...p, logo_url: publicUrl }))
    } catch (err: any) { alert(`Upload failed: ${err?.message}`) }
    setUploadingLogo(false)
  }

  // â”€â”€ Users (permissions tab) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['all_users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('id, full_name, email, role, is_active, last_login').order('full_name')
      if (error) console.error('users fetch error:', error)
      return data || []
    },
    enabled: activeTab === 'permissions'
  })

  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({})

  const saveUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from('users').update({ role }).eq('id', userId)
      if (error) throw error
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['all_users'] })
      setEditingUser(null)
      setPendingRoles(p => { const n = { ...p }; delete n[userId]; return n })
    },
    onError: (err: any) => alert(`Failed to update role: ${err?.message}`)
  })

  const toggleUserActive = useMutation({
    mutationFn: async ({ userId, is_active }: { userId: string; is_active: boolean }) => {
      const { error } = await supabase.from('users').update({ is_active }).eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all_users'] })
  })

  // ── Role Permissions (editable matrix) ─────────────────────────────────────
  const { data: dbRolePerms, isLoading: permsLoading } = useQuery({
    queryKey: ['role_permissions_db'],
    queryFn: async () => {
      const { data, error } = await supabase.from('role_permissions').select('role, permissions')
      if (error) console.error('role_permissions fetch error:', error)
      const map: Record<string, Record<string, string>> = {}
      for (const row of data || []) map[row.role] = row.permissions
      return map
    },
    enabled: activeTab === 'permissions'
  })

  /** Working copy of permissions for editing */
  const [editPerms, setEditPerms] = useState<Record<string, Record<string, string>>>({})
  const [permsSeeded, setPermsSeeded] = useState(false)

  useEffect(() => {
    if (permsSeeded) return
    const moduleKeys = Object.keys(MODULE_LABELS)
    if (dbRolePerms && Object.keys(dbRolePerms).length > 0) {
      // Fill any keys missing from DB rows with 'none'
      const filled: Record<string, Record<string, string>> = {}
      for (const role of ROLES) {
        filled[role] = {}
        for (const key of moduleKeys) {
          filled[role][key] = dbRolePerms[role]?.[key] ?? 'none'
        }
      }
      setEditPerms(filled)
      setPermsSeeded(true)
    } else if (!permsLoading) {
      // DB empty – seed from static ROLE_PERMISSIONS
      const seed: Record<string, Record<string, string>> = {}
      for (const role of ROLES) {
        seed[role] = {}
        const flat = flattenPermissions(ROLE_PERMISSIONS[role] || {})
        for (const key of moduleKeys) seed[role][key] = toLevel(flat[key])
      }
      setEditPerms(seed)
      setPermsSeeded(true)
    }
  }, [dbRolePerms, permsLoading, permsSeeded])

  const setPermLevel = (role: string, key: string, level: string) =>
    setEditPerms(p => ({ ...p, [role]: { ...p[role], [key]: level } }))

  const [permsSaving, setPermsSaving] = useState(false)
  const [permsSaved, setPermsSaved] = useState(false)

  const savePermissions = async () => {
    setPermsSaving(true)
    try {
      for (const role of ROLES) {
        const { error } = await supabase.from('role_permissions')
          .upsert({ role, permissions: editPerms[role] ?? {}, updated_at: new Date().toISOString() },
                   { onConflict: 'role' })
        if (error) throw error
      }
      queryClient.invalidateQueries({ queryKey: ['role_permissions_db'] })
      setPermsSaved(true)
      setTimeout(() => setPermsSaved(false), 3000)
    } catch (err: any) {
      alert(`Failed to save permissions: ${err?.message}`)
    }
    setPermsSaving(false)
  }

  const [notifications, setNotifications] = useState({
    email: true, sms: false, push: true,
    rental: true, maintenance: true, inventory: true, financial: false
  })

  const tabs = [
    { id: 'company',       name: 'Company',       icon: Building2 },
    { id: 'documents',     name: 'Documents',     icon: Settings },
    { id: 'permissions',   name: 'Users & Access', icon: Users },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security',      name: 'Security',      icon: Lock },
    { id: 'system',        name: 'System',        icon: Database },
  ]

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'
  const sectionCls = 'border-t border-gray-100 pt-6 mt-6'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Company profile, document templates and user permissions</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Tabs */}
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex -mb-px min-w-max">
            {tabs.map(tab => {
              const Icon = tab.icon
              const restricted = !isAdmin && ['company', 'documents', 'permissions'].includes(tab.id)
              return (
                <button
                  key={tab.id}
                  onClick={() => !restricted && setActiveTab(tab.id)}
                  disabled={restricted}
                  className={`flex items-center px-5 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : restricted
                      ? 'border-transparent text-gray-300 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                  {restricted && <Lock className="h-3 w-3 ml-1 opacity-40" />}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* â”€â”€ COMPANY TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === 'company' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900">Company Profile</h3>
              <div>
                <label className={labelCls}>Company Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden">
                    {form?.logo_url
                      ? <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                      : <Building2 className="h-10 w-10 text-gray-300" />}
                  </div>
                  <div>
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingLogo}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
                      <Upload className="h-4 w-4" />
                      {uploadingLogo ? 'Uploadingâ€¦' : 'Upload Logo'}
                    </button>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG or SVG Â· max 2 MB</p>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    {form?.logo_url && (
                      <button type="button" onClick={() => set('logo_url', '')} className="text-xs text-red-500 hover:text-red-700 mt-1 block">Remove logo</button>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Company Name</label>
                  <input type="text" value={form?.company_name || ''} onChange={e => set('company_name', e.target.value)} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Tagline</label>
                  <input type="text" value={form?.company_tagline || ''} onChange={e => set('company_tagline', e.target.value)} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Address Line 1</label>
                  <input type="text" value={form?.address_line1 || ''} onChange={e => set('address_line1', e.target.value)} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Address Line 2</label>
                  <input type="text" value={form?.address_line2 || ''} onChange={e => set('address_line2', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input type="text" value={form?.city || ''} onChange={e => set('city', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Country</label>
                  <input type="text" value={form?.country || ''} onChange={e => set('country', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="text" value={form?.phone || ''} onChange={e => set('phone', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={form?.email || ''} onChange={e => set('email', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Website</label>
                  <input type="text" value={form?.website || ''} onChange={e => set('website', e.target.value)} placeholder="https://" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>TRN (Tax Reg. No.)</label>
                  <input type="text" value={form?.trn || ''} onChange={e => set('trn', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className={sectionCls}>
                <h4 className="font-semibold text-gray-800 mb-3 text-sm">Regional</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Currency</label>
                    <select value={form?.currency || 'AED'} onChange={e => set('currency', e.target.value)} className={inputCls}>
                      <option value="AED">AED â€” UAE Dirham</option>
                      <option value="USD">USD â€” US Dollar</option>
                      <option value="EUR">EUR â€” Euro</option>
                      <option value="SAR">SAR â€” Saudi Riyal</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Date Format</label>
                    <select value={form?.date_format || 'DD/MM/YYYY'} onChange={e => set('date_format', e.target.value)} className={inputCls}>
                      <option>DD/MM/YYYY</option>
                      <option>MM/DD/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* â”€â”€ DOCUMENTS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === 'documents' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900">Quotation & Invoice Defaults</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Quotation Number Prefix</label>
                  <input type="text" value={form?.quotation_prefix || 'QUO'} onChange={e => set('quotation_prefix', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Invoice Number Prefix</label>
                  <input type="text" value={form?.invoice_prefix || 'INV'} onChange={e => set('invoice_prefix', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Default Payment Terms</label>
                  <select value={form?.default_payment_terms || 'Net 30'} onChange={e => set('default_payment_terms', e.target.value)} className={inputCls}>
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
                  <label className={labelCls}>Default Tax Rate (%)</label>
                  <input type="number" step="0.01" min="0" max="100" value={form?.default_tax_rate ?? 0} onChange={e => set('default_tax_rate', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Quotation Default Terms & Conditions</label>
                <textarea value={form?.quotation_terms || ''} onChange={e => set('quotation_terms', e.target.value)} rows={5} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Invoice Default Terms & Conditions</label>
                <textarea value={form?.invoice_terms || ''} onChange={e => set('invoice_terms', e.target.value)} rows={5} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Bank Details (printed on invoices)</label>
                <textarea value={form?.bank_details || ''} onChange={e => set('bank_details', e.target.value)} rows={4} className={inputCls}
                  placeholder={'Bank Name: XYZ Bank\nAccount Name: OSS Group\nIBAN: AE000000000000000000\nSwift: XYZBAEAD'} />
              </div>
            </div>
          )}

          {/* â”€â”€ PERMISSIONS / USERS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === 'permissions' && (
            <div className="space-y-8">
              {/* User Management */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                </div>
                <p className="text-sm text-gray-500 mb-5">Change a user's role to control what pages and actions they can access. Changes take effect on their next login.</p>

                {usersLoading ? (
                  <div className="text-center py-10 text-gray-400 text-sm">Loading usersâ€¦</div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Login</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {allUsers.map((u: any) => {
                          const isEditing = editingUser === u.id
                          const pendingRole = pendingRoles[u.id] ?? u.role ?? 'storekeeper'
                          const isCurrentUser = u.id === user?.id
                          return (
                            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-800">{u.full_name || 'â€”'}</p>
                                <p className="text-xs text-gray-400">{u.email}</p>
                              </td>
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <select
                                    value={pendingRole}
                                    onChange={e => setPendingRoles(p => ({ ...p, [u.id]: e.target.value }))}
                                    className="px-2 py-1.5 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                                  >
                                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                                  </select>
                                ) : (
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                                    {ROLE_LABELS[u.role] || u.role || 'Unknown'}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => !isCurrentUser && toggleUserActive.mutate({ userId: u.id, is_active: !u.is_active })}
                                  disabled={isCurrentUser}
                                  title={isCurrentUser ? "Can't deactivate yourself" : ''}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                                    u.is_active !== false ? 'bg-emerald-500' : 'bg-gray-300'
                                  } ${isCurrentUser ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${u.is_active !== false ? 'translate-x-4' : 'translate-x-1'}`} />
                                </button>
                                <span className="ml-2 text-xs text-gray-500">{u.is_active !== false ? 'Active' : 'Inactive'}</span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-400">
                                {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                              </td>
                              <td className="px-4 py-3">
                                {isCurrentUser ? (
                                  <span className="text-xs text-gray-400 italic">You</span>
                                ) : isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => saveUserRole.mutate({ userId: u.id, role: pendingRole })}
                                      disabled={saveUserRole.isPending}
                                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                                    >
                                      {saveUserRole.isPending ? 'Savingâ€¦' : 'Save'}
                                    </button>
                                    <button
                                      onClick={() => { setEditingUser(null); setPendingRoles(p => { const n = { ...p }; delete n[u.id]; return n }) }}
                                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { setEditingUser(u.id); setPendingRoles(p => ({ ...p, [u.id]: u.role || 'storekeeper' })) }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                                  >
                                    <Edit2 className="h-3 w-3" /> Change Role
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                        {allUsers.length === 0 && (
                          <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">No users found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>Role changes take effect on the user's <strong>next login</strong>. Ask them to log out and back in to apply the new permissions immediately.</p>
                </div>
              </div>

              {/* Role Permissions – Editable Matrix */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-gray-500" />
                    <h3 className="text-base font-semibold text-gray-800">Role Permissions</h3>
                  </div>
                  <button
                    onClick={savePermissions}
                    disabled={permsSaving || !isAdmin}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {permsSaved
                      ? <><Check className="h-4 w-4" /> Saved!</>
                      : <><Save className="h-4 w-4" /> Save Permissions</>}
                  </button>
                </div>
                {!isAdmin && (
                  <div className="mb-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Only admins can modify role permissions.
                  </div>
                )}
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="px-4 py-3 text-left font-medium w-44 text-xs uppercase tracking-wide">Module</th>
                        {ROLES.map(r => (
                          <th key={r} className="px-3 py-3 text-center font-medium text-xs uppercase tracking-wide w-32">{ROLE_LABELS[r]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Object.entries(MODULE_LABELS).map(([key, label], i) => (
                        <tr key={key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2 font-medium text-gray-700 text-xs">{label}</td>
                          {ROLES.map(role => {
                            const level = editPerms[role]?.[key] ?? 'none'
                            const isAdminRole = role === 'admin'
                            return (
                              <td key={role} className="px-3 py-1.5 text-center">
                                <select
                                  value={level}
                                  disabled={!isAdmin || isAdminRole}
                                  onChange={e => setPermLevel(role, key, e.target.value)}
                                  className={`w-full text-xs rounded-lg border px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors ${
                                    isAdminRole ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' :
                                    level === 'full'   ? 'bg-green-50 text-green-700 border-green-200' :
                                    level === 'edit'   ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    level === 'create' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                    level === 'view'   ? 'bg-gray-50 text-gray-700 border-gray-200' :
                                    'bg-red-50 text-red-500 border-red-200'
                                  }`}
                                >
                                  <option value="none">No Access</option>
                                  <option value="view">View</option>
                                  <option value="create">View + Create</option>
                                  <option value="edit">View + Edit</option>
                                  <option value="full">Full</option>
                                </select>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-gray-400">Changes apply on the user's next login. Admin role always has full access.</p>
              </div>
            </div>
          )}

          {/* â”€â”€ NOTIFICATIONS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 max-w-lg">
              <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Channels</h4>
                <div className="space-y-3">
                  {[['email','Email Notifications'],['sms','SMS Notifications'],['push','Push Notifications']].map(([k,l]) => (
                    <label key={k} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={(notifications as any)[k]} onChange={e => setNotifications(n => ({ ...n, [k]: e.target.checked }))} className="rounded border-gray-300 text-blue-600 h-4 w-4" />
                      <span className="text-sm text-gray-700">{l}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className={sectionCls}>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Event Types</h4>
                <div className="space-y-3">
                  {[['rental','Rental Updates'],['maintenance','Maintenance Alerts'],['inventory','Inventory Alerts'],['financial','Financial Updates']].map(([k,l]) => (
                    <label key={k} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={(notifications as any)[k]} onChange={e => setNotifications(n => ({ ...n, [k]: e.target.checked }))} className="rounded border-gray-300 text-blue-600 h-4 w-4" />
                      <span className="text-sm text-gray-700">{l}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* â”€â”€ SECURITY TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === 'security' && (
            <div className="space-y-5 max-w-lg">
              <h3 className="text-lg font-semibold text-gray-900">Security</h3>
              {[
                { title:'Password', desc:'Last changed: Never', btn:'Change Password', cls:'bg-blue-600 hover:bg-blue-700' },
                { title:'Two-Factor Authentication', desc:'Status: Not enabled', btn:'Enable 2FA', cls:'bg-green-600 hover:bg-green-700' },
                { title:'Active Sessions', desc:'1 active session', btn:'Sign Out All Devices', cls:'bg-red-600 hover:bg-red-700' },
              ].map(item => (
                <div key={item.title} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-500 mb-3">{item.desc}</p>
                  <button className={`px-4 py-2 text-white rounded-lg text-sm ${item.cls}`}>{item.btn}</button>
                </div>
              ))}
            </div>
          )}

          {/* â”€â”€ SYSTEM TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === 'system' && (
            <div className="space-y-4 max-w-lg">
              <h3 className="text-lg font-semibold text-gray-900">System Information</h3>
              {[['Version','1.0.0'],['Framework','Next.js 16 + Supabase'],['Last Backup','Today at 3:00 AM'],['Storage Used','2.4 GB / 100 GB']].map(([k,v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-gray-100 text-sm">
                  <span className="font-medium text-gray-700">{k}</span>
                  <span className="text-gray-900">{v}</span>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Clear Cache</button>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">Export Data</button>
              </div>
            </div>
          )}

          {/* Save (Company + Documents) */}
          {['company', 'documents'].includes(activeTab) && (
            <div className="pt-6 border-t border-gray-100 mt-8">
              <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm">
                {saved ? <><Check className="h-4 w-4" /> Saved!</> : <><Save className="h-4 w-4" /> Save Changes</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
