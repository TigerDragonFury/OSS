'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import {
  Settings, Bell, Lock, Database, Building2, Users,
  Upload, Save, Check, Shield
} from 'lucide-react'
import { ROLE_PERMISSIONS } from '@/lib/auth/rolePermissions'

// ...”€...”€...”€ helpers ...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€...”€
const MODULE_LABELS: Record<string, string> = {
  'finance.bankAccounts': 'Bank Accounts',
  'finance.expenses': 'Expenses',
  'finance.reports': 'Reports',
  'finance.quickEntry': 'Quick Entry',
  'finance.quotations': 'Quotations',
  'finance.income': 'Income',
  'finance.invoices': 'Invoices',
  'hr.employees': 'Employees',
  'hr.salaries': 'Salaries',
  'marine.vessels': 'Vessels',
  'marine.customers': 'Customers',
  'marine.rentals': 'Rentals',
  'scrap.lands': 'Scrap Lands',
  'scrap.equipment': 'Equipment',
  'warehouse.inventory': 'Inventory',
  'warehouse.sales': 'Sales',
  'settings': 'Settings',
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

  // ...”€...”€ Company Settings ...”€...”€
  const { data: settings } = useQuery({
    queryKey: ['company_settings'],
    queryFn: async () => {
      const { data } = await supabase.from('company_settings').select('*').limit(1).maybeSingle()
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
  if (settings && !formLoaded) { setForm(settings); setFormLoaded(true) }
  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }))

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data }
      if (!payload.id) delete payload.id  // let DB generate UUID on insert
      const { error } = await supabase
        .from('company_settings')
        .upsert(payload, { onConflict: 'id' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (err: any) => {
      alert(`Save failed: ${err?.message || JSON.stringify(err)}`)
    }
  })

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `company-logo.${ext}`
      const { error: upErr } = await supabase.storage
        .from('company-assets')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('company-assets').getPublicUrl(path)
      setForm((p: any) => ({ ...p, logo_url: publicUrl }))
    } catch (err: any) {
      alert(`Upload failed: ${err?.message || JSON.stringify(err)}`)
    }
    setUploadingLogo(false)
  }

  const [activeTab2] = useState('company') // unused ...€” keeping original notifications state below
  const [notifications, setNotifications] = useState({
    email: true, sms: false, push: true,
    rental: true, maintenance: true, inventory: true, financial: false
  })

  const tabs = [
    { id: 'company',       name: 'Company',       icon: Building2 },
    { id: 'documents',     name: 'Documents',     icon: Settings },
    { id: 'permissions',   name: 'Permissions',   icon: Users },
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
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage company profile, document templates and system preferences</p>
      </div>

      <div className="bg-white rounded-xl shadow">
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
                  className={`flex items-center px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap ${
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
          {/* ...”€...”€ COMPANY TAB ...”€...”€ */}
          {activeTab === 'company' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900">Company Profile</h3>

              {/* Logo upload */}
              <div>
                <label className={labelCls}>Company Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden">
                    {form?.logo_url
                      ? <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                      : <Building2 className="h-10 w-10 text-gray-300" />
                    }
                  </div>
                  <div>
                    <button type="button" onClick={() => fileRef.current?.click()}
                      disabled={uploadingLogo}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
                      <Upload className="h-4 w-4" />
                      {uploadingLogo ? 'Uploading...€¦' : 'Upload Logo'}
                    </button>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG or SVG · max 2 MB · shown on quotations &amp; invoices</p>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    {form?.logo_url && (
                      <button type="button" onClick={() => set('logo_url', '')}
                        className="text-xs text-red-500 hover:text-red-700 mt-1 block">Remove logo</button>
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
                  <input type="text" value={form?.company_tagline || ''} onChange={e => set('company_tagline', e.target.value)} placeholder="Operations Support Systems" className={inputCls} />
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
                      <option value="AED">AED (Đ) — UAE Dirham</option>
                      <option value="USD">USD ($) — US Dollar</option>
                      <option value="EUR">EUR (€) — Euro</option>
                      <option value="SAR">SAR — Saudi Riyal</option>
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

          {/* ...”€...”€ DOCUMENTS TAB ...”€...”€ */}
          {activeTab === 'documents' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900">Quotation &amp; Invoice Defaults</h3>
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
                <label className={labelCls}>Quotation Default Terms &amp; Conditions</label>
                <textarea value={form?.quotation_terms || ''} onChange={e => set('quotation_terms', e.target.value)} rows={5} className={inputCls} placeholder="These terms appear on every quotation...€¦" />
              </div>
              <div>
                <label className={labelCls}>Invoice Default Terms &amp; Conditions</label>
                <textarea value={form?.invoice_terms || ''} onChange={e => set('invoice_terms', e.target.value)} rows={5} className={inputCls} placeholder="These terms appear on every invoice...€¦" />
              </div>
              <div>
                <label className={labelCls}>Bank Details (printed on invoices)</label>
                <textarea value={form?.bank_details || ''} onChange={e => set('bank_details', e.target.value)} rows={4} className={inputCls}
                  placeholder={'Bank Name: XYZ Bank\nAccount Name: OSS Group\nIBAN: AE000000000000000000\nSwift: XYZBAEAD'} />
              </div>
            </div>
          )}

          {/* ...”€...”€ PERMISSIONS TAB ...”€...”€ */}
          {activeTab === 'permissions' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Shield className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Role Permissions</h3>
                  <p className="text-sm text-gray-500">Read-only overview. Edit <code className="bg-gray-100 px-1 rounded text-xs">lib/auth/rolePermissions.ts</code> to change access levels.</p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="px-4 py-3 text-left font-medium w-44">Module</th>
                      {['admin', 'accountant', 'hr', 'storekeeper'].map(r => (
                        <th key={r} className="px-3 py-3 text-center font-medium capitalize w-32">{r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries(MODULE_LABELS).map(([key, label], i) => {
                      const getAccess = (role: string) => {
                        const flat = flattenPermissions(ROLE_PERMISSIONS[role] || {})
                        return flat[key]
                      }
                      const badge = (a: any) => {
                        if (!a?.canView) return <span className="px-2 py-0.5 rounded text-xs bg-red-50 text-red-500 font-medium">No Access</span>
                        if (a.canCreate && a.canEdit && a.canDelete) return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">Full</span>
                        if (a.canCreate && a.canEdit) return <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 font-medium">Cr+Edit</span>
                        if (a.canCreate) return <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700 font-medium">Vw+Cr</span>
                        return <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 font-medium">View</span>
                      }
                      return (
                        <tr key={key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2.5 font-medium text-gray-800">{label}</td>
                          {['admin', 'accountant', 'hr', 'storekeeper'].map(r => (
                            <td key={r} className="px-3 py-2.5 text-center">{badge(getAccess(r))}</td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ...”€...”€ NOTIFICATIONS TAB ...”€...”€ */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 max-w-lg">
              <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Channels</h4>
                <div className="space-y-3">
                  {[['email','Email Notifications'],['sms','SMS Notifications'],['push','Push Notifications']].map(([k,l]) => (
                    <label key={k} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={(notifications as any)[k]} onChange={e => setNotifications(n => ({ ...n, [k]: e.target.checked }))} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4" />
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
                      <input type="checkbox" checked={(notifications as any)[k]} onChange={e => setNotifications(n => ({ ...n, [k]: e.target.checked }))} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4" />
                      <span className="text-sm text-gray-700">{l}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ...”€...”€ SECURITY TAB ...”€...”€ */}
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

          {/* ...”€...”€ SYSTEM TAB ...”€...”€ */}
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

          {/* Save */}
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

