'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'next/navigation'
import { Printer } from 'lucide-react'
import { useEffect } from 'react'

export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const { data: inv, isLoading } = useQuery({
    queryKey: ['invoice-print', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, companies(name, type), invoice_items(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    }
  })

  const { data: settings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('company_settings').select('*').limit(1).maybeSingle()
      return data
    }
  })

  // Auto-trigger print dialog when ?auto=1 is in the URL
  useEffect(() => {
    if (inv) document.title = `OSS Invoice - ${inv.invoice_number}`
    if (searchParams?.get('auto') === '1' && inv && settings !== undefined) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [inv, settings, searchParams])

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  )

  if (!inv) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      Invoice not found.
    </div>
  )

  const items = (inv.invoice_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
  const subtotal = items.reduce((s: number, i: any) => s + Number(i.total_price || 0), 0)
  const tax = Number(inv.tax || 0)
  const total = subtotal + tax

  const companyName = settings?.company_name || 'OSS Group'
  const companyTagline = settings?.company_tagline || 'Operations Support Systems'
  const logoUrl = settings?.logo_url
  const currency = settings?.currency || 'AED'
  const bankDetails = settings?.bank_details
  const invoiceTerms = settings?.invoice_terms

  const STATUS_COLOR: Record<string, string> = {
    draft:     '#6b7280',
    sent:      '#2563eb',
    paid:      '#16a34a',
    overdue:   '#dc2626',
    cancelled: '#6b7280',
    partial:   '#d97706',
  }

  return (
    <>
      {/* Print button — hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </button>
        <button
          onClick={() => window.close()}
          className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg shadow hover:bg-gray-50 text-sm"
        >
          Close
        </button>
      </div>

      {/* A4 Document */}
      <div
        id="invoice-doc"
        className="bg-white mx-auto my-8 print:my-0 print:shadow-none"
        style={{ width: '210mm', minHeight: '297mm', padding: '12mm 14mm', fontFamily: 'system-ui, sans-serif' }}
      >
        {/* ── Header strip ── */}
        <div
          className="rounded-xl mb-8 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)', padding: '20px 28px', color: '#fff' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ height: 52, width: 'auto', objectFit: 'contain', background: 'rgba(255,255,255)', borderRadius: 8, padding: 4 }} />
            ) : null}
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>{companyName}</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{companyTagline}</div>
              {settings?.address_line1 && (
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                  {settings.address_line1}{settings.city ? `, ${settings.city}` : ''}{settings.country ? `, ${settings.country}` : ''}
                </div>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 2 }}>INVOICE</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>{inv.invoice_number}</div>
            {settings?.trn && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>TRN: {settings.trn}</div>}
          </div>
        </div>

        {/* ── Meta row ── */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Bill To */}
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '16px 20px', borderLeft: '4px solid #2563eb' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Bill To
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
              {inv.client_name || inv.companies?.name || '—'}
            </div>
            {inv.companies && inv.client_name && (
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{inv.companies.name}</div>
            )}
          </div>

          {/* Invoice details */}
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '16px 20px' }}>
            <div className="grid grid-cols-2 gap-y-2" style={{ fontSize: 13 }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Invoice #</span>
              <span style={{ fontWeight: 700, color: '#1e293b' }}>{inv.invoice_number}</span>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Invoice Date</span>
              <span>{new Date(inv.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              {inv.due_date && (
                <>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Due Date</span>
                  <span>{new Date(inv.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </>
              )}
              {inv.payment_terms && (
                <>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Payment Terms</span>
                  <span>{inv.payment_terms}</span>
                </>
              )}
              <span style={{ color: '#64748b', fontWeight: 600 }}>Status</span>
              <span>
                <span style={{
                  background: (STATUS_COLOR[inv.status] || '#6b7280') + '1a',
                  color: STATUS_COLOR[inv.status] || '#6b7280',
                  fontSize: 11, fontWeight: 700, padding: '2px 10px',
                  borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.5
                }}>
                  {inv.status}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Items table ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#1e3a5f', color: '#fff' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', borderRadius: '8px 0 0 8px', width: 32 }}>#</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', width: 80 }}>Qty</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', width: 60 }}>Unit</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', width: 110 }}>Unit Price</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', width: 120, borderRadius: '0 8px 8px 0' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, idx: number) => (
              <tr
                key={item.id}
                style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}
              >
                <td style={{ padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.description}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, textTransform: 'capitalize' }}>
                    {item.item_type?.replace(/_/g, ' ')}
                  </div>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>{Number(item.quantity).toLocaleString()}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>{item.unit || 'unit'}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  {Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>
                  {currency} {Number(item.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '20px 12px', textAlign: 'center', color: '#94a3b8' }}>No line items</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ── Totals ── */}
        <div className="flex justify-end mb-8">
          <div style={{ width: 280 }}>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #e2e8f0', fontSize: 13 }}>
              <span style={{ color: '#64748b' }}>Subtotal</span>
              <span style={{ fontWeight: 600 }}>{currency} {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #e2e8f0', fontSize: 13 }}>
                <span style={{ color: '#64748b' }}>Tax / VAT</span>
                <span style={{ fontWeight: 600 }}>{currency} {tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div
              className="flex justify-between py-3 mt-1 rounded-lg"
              style={{ background: '#1e3a5f', color: '#fff', padding: '12px 16px', marginTop: 8 }}
            >
              <span style={{ fontWeight: 700, fontSize: 15 }}>Total Amount</span>
              <span style={{ fontWeight: 900, fontSize: 17 }}>{currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {inv.deposit_percent != null && Number(inv.deposit_percent) > 0 && (
              <div className="flex justify-between py-2" style={{ fontSize: 13, marginTop: 8, borderTop: '1px dashed #bfdbfe', paddingTop: 10 }}>
                <span style={{ color: '#2563eb', fontWeight: 600 }}>Deposit Due ({inv.deposit_percent}%)</span>
                <span style={{ fontWeight: 700, color: '#2563eb' }}>{currency} {(total * Number(inv.deposit_percent) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Notes ── */}
        {inv.notes && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 13 }}>
            <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 6, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>Notes</div>
            <div style={{ color: '#78350f', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{inv.notes}</div>
          </div>
        )}

        {/* ── Terms ── */}
        <div style={{ background: '#f1f5f9', borderRadius: 10, padding: '14px 18px', marginBottom: bankDetails ? 24 : 32, fontSize: 12, color: '#64748b', lineHeight: 1.8 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>Terms & Conditions</div>
          {invoiceTerms ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{invoiceTerms}</div>
          ) : inv.payment_terms ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{inv.payment_terms}</div>
          ) : (
            <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No terms specified.</div>
          )}
        </div>

        {/* ── Bank Details ── */}
        {bankDetails && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '14px 18px', marginBottom: 32, fontSize: 12, color: '#1e40af' }}>
            <div style={{ fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>Bank / Payment Details</div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.9 }}>{bankDetails}</div>
          </div>
        )}

        {/* ── Signature ── */}
        <div className="grid grid-cols-2 gap-16">
          <div>
            <div style={{ borderTop: '2px solid #1e3a5f', paddingTop: 8, color: '#1e3a5f', fontWeight: 700, fontSize: 13 }}>
              Authorized Signature
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{companyName}</div>
          </div>
          <div>
            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 8, color: '#64748b', fontWeight: 700, fontSize: 13 }}>
              Client Acceptance
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Name &amp; Date</div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            marginTop: 40, paddingTop: 12, borderTop: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'space-between',
            fontSize: 11, color: '#94a3b8'
          }}
        >
          <span>{companyName}{settings?.email ? ` · ${settings.email}` : ''}{settings?.phone ? ` · ${settings.phone}` : ''}</span>
          <span>{inv.invoice_number} · Generated {new Date().toLocaleDateString('en-GB')}</span>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; }
          #invoice-doc { margin: 0; width: 100%; box-shadow: none; }
        }
      `}</style>
    </>
  )
}
