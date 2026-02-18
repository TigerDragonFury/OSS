'use client'

import { useEffect, useState } from 'react'
import { Plus, DollarSign, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthContext'
import { hasModulePermission } from '@/lib/auth/rolePermissions'

interface Land {
  id: string
  land_name: string
  remaining_tonnage?: number
  scrap_tonnage_sold?: number
}

interface Warehouse {
  id: string
  location: string
}

interface Equipment {
  id: string
  equipment_name: string
  warehouse_id: string | null
  status: string
  condition: string
  estimated_value: number | null
  quantity: number | null
  unit: string | null
}

interface Company {
  id: string
  name: string
}

interface BankAccount {
  account_id: string
  account_name: string
  calculated_balance: number
}

export default function QuickTransactionsPage() {
  const [activeTab, setActiveTab] = useState<'scrap' | 'equipment' | 'expense'>('scrap')
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  
  // Get user role and permissions
  const userRole = user?.role || user?.roles?.[0] || 'storekeeper'
  const canCreate = hasModulePermission(userRole, ['finance', 'quickEntry'], 'create')

  // Bank accounts
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])

  // Scrap sales state
  const [lands, setLands] = useState<Land[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedLand, setSelectedLand] = useState<any>(null)
  const [scrapForm, setScrapForm] = useState({
    land_id: '',
    sale_date: new Date().toISOString().split('T')[0],
    material_type: '',
    quantity_tons: '',
    price_per_ton: '',
    buyer_name: '',
    buyer_company_id: '',
    payment_method: 'transfer',
    bank_account_id: '',
  })

  // Equipment sales state
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [warehouseEquipment, setWarehouseEquipment] = useState<Equipment[]>([])
  const [equipmentForm, setEquipmentForm] = useState({
    warehouse_id: '',
    land_equipment_id: '',
    item_name: '',
    sale_date: new Date().toISOString().split('T')[0],
    quantity: '1',
    sale_price: '',
    customer_name: '',
    customer_company_id: '',
    payment_method: 'transfer',
    bank_account_id: '',
  })

  // Expense state
  const [expenseForm, setExpenseForm] = useState({
    expense_type: '',
    category: 'labor',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    payment_method: 'transfer',
    bank_account_id: '',
    description: '',
  })

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch lands
      const { data: landsData } = await supabase.from('land_purchases').select('id, land_name, remaining_tonnage, scrap_tonnage_sold').order('land_name')
      setLands(landsData || [])

      // Fetch companies
      const { data: companiesData } = await supabase.from('companies').select('id, name')
      setCompanies(companiesData || [])

      // Fetch warehouses
      const { data: warehousesData } = await supabase.from('warehouses').select('id, location')
      setWarehouses(warehousesData || [])

      // Fetch ALL available equipment (for reference)
      const { data: equipmentData } = await supabase
        .from('land_equipment')
        .select('id, equipment_name, warehouse_id, status, condition, estimated_value, quantity, unit')
        .in('status', ['available', 'in_warehouse'])
        .order('equipment_name')
      setEquipmentList(equipmentData || [])

      // Fetch bank accounts
      const { data: accountsData } = await supabase
        .from('bank_account_reconciliation')
        .select('account_id, account_name, calculated_balance')
        .eq('status', 'active')
        .order('account_name')
      setBankAccounts(accountsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  // Load equipment filtered by selected warehouse (unsold only)
  const handleWarehouseChange = async (warehouseId: string) => {
    setEquipmentForm({ ...equipmentForm, warehouse_id: warehouseId, land_equipment_id: '', item_name: '' })
    setWarehouseEquipment([])
    if (!warehouseId) return

    // Query equipment in this warehouse that is NOT sold
    // We rely on status field directly — 'sold' is set on sale, restored on refund
    const { data, error } = await supabase
      .from('land_equipment')
      .select('id, equipment_name, warehouse_id, status, condition, estimated_value, quantity, unit')
      .eq('warehouse_id', warehouseId)
      .in('status', ['available', 'in_warehouse'])
      .order('equipment_name')

    if (error) console.error('Error fetching warehouse equipment:', error)
    setWarehouseEquipment(data || [])
  }

  const handleEquipmentSelect = (equipmentId: string) => {
    const eq = warehouseEquipment.find(e => e.id === equipmentId)
    setEquipmentForm({
      ...equipmentForm,
      land_equipment_id: equipmentId,
      item_name: eq?.equipment_name || equipmentForm.item_name,
      sale_price: eq?.estimated_value?.toString() || equipmentForm.sale_price,
    })
  }

  const handleScrapSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const total = parseFloat(scrapForm.quantity_tons) * parseFloat(scrapForm.price_per_ton)

      const { error } = await supabase.from('land_scrap_sales').insert([
        {
          land_id: scrapForm.land_id,
          sale_date: scrapForm.sale_date,
          material_type: scrapForm.material_type,
          quantity_tons: parseFloat(scrapForm.quantity_tons),
          price_per_ton: parseFloat(scrapForm.price_per_ton),
          total_amount: total,
          buyer_name: scrapForm.buyer_name,
          buyer_company_id: scrapForm.buyer_company_id || null,
          bank_account_id: scrapForm.bank_account_id || null,
          payment_method: scrapForm.payment_method,
        }
      ])

      if (error) throw error

      // Record income
      const scrapIncRow: Record<string, unknown> = {
        income_date: scrapForm.sale_date,
        income_type: 'scrap_sale',
        source_type: 'land',
        source_id: scrapForm.land_id,
        amount: total,
        customer_company_id: scrapForm.buyer_company_id || null,
        description: `Scrap Sale: ${scrapForm.material_type} - ${scrapForm.quantity_tons} tons @ ${scrapForm.price_per_ton} Đ/ton`,
        payment_method: scrapForm.payment_method,
        bank_account_id: scrapForm.bank_account_id || null,
      }
      const { error: scrapIncErr } = await supabase.from('income_records').insert([scrapIncRow])
      if (scrapIncErr) {
        const { bank_account_id: _b, ...baseRow } = scrapIncRow as any
        await supabase.from('income_records').insert([baseRow])
      }

      // Update remaining tonnage on land
      const currentLand = lands.find(l => l.id === scrapForm.land_id)
      if (currentLand) {
        const newRemaining = (currentLand.remaining_tonnage || 0) - parseFloat(scrapForm.quantity_tons)
        await supabase.from('land_purchases').update({
          remaining_tonnage: Math.max(0, newRemaining),
          scrap_tonnage_sold: (currentLand.scrap_tonnage_sold || 0) + parseFloat(scrapForm.quantity_tons)
        }).eq('id', scrapForm.land_id)
      }

      alert('Scrap sale recorded successfully!')
      setScrapForm({
        land_id: '',
        sale_date: new Date().toISOString().split('T')[0],
        material_type: '',
        quantity_tons: '',
        price_per_ton: '',
        buyer_name: '',
        buyer_company_id: '',
        payment_method: 'transfer',
        bank_account_id: '',
      })
      setSelectedLand(null)
      
      // Refresh data
      fetchData()
    } catch (error) {
      console.error('Error recording scrap sale:', error)
      alert('Failed to record scrap sale')
    } finally {
      setLoading(false)
    }
  }

  const handleEquipmentSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const soldQty = Math.max(1, parseFloat(equipmentForm.quantity) || 1)
      const salePrice = parseFloat(equipmentForm.sale_price)
      const unitPrice = salePrice / soldQty

      // 1. Generate invoice number
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

      // 2. Create invoice (status paid immediately)
      const { data: inv, error: invErr } = await supabase
        .from('invoices')
        .insert([{
          invoice_number:         invoiceNumber,
          invoice_type:           'income',
          status:                 'paid',
          company_id:             equipmentForm.customer_company_id || null,
          client_name:            equipmentForm.customer_name,
          date:                   equipmentForm.sale_date,
          due_date:               equipmentForm.sale_date,
          payment_method:         equipmentForm.payment_method,
          payment_bank_account_id: equipmentForm.bank_account_id || null,
          total:                  salePrice,
        }])
        .select('id')
        .single()
      if (invErr) throw invErr

      // 3. Create invoice line item
      const { error: itemErr } = await supabase.from('invoice_items').insert([{
        invoice_id:        inv.id,
        item_type:         'equipment_sale',
        description:       equipmentForm.item_name,
        quantity:          soldQty,
        unit:              'unit',
        unit_price:        unitPrice,
        total_price:       salePrice,
        warehouse_id:      equipmentForm.warehouse_id || null,
        land_equipment_id: equipmentForm.land_equipment_id || null,
        sort_order:        0,
      }])
      if (itemErr) throw itemErr

      // 4. Decrement equipment quantity; only mark sold when nothing remains
      if (equipmentForm.land_equipment_id) {
        const { data: equip } = await supabase
          .from('land_equipment')
          .select('quantity, status')
          .eq('id', equipmentForm.land_equipment_id)
          .single()
        const remaining = (Number(equip?.quantity) || 0) - soldQty
        await supabase
          .from('land_equipment')
          .update({
            quantity: Math.max(remaining, 0),
            status:   remaining <= 0 ? 'sold' : (equip?.status || 'available'),
          })
          .eq('id', equipmentForm.land_equipment_id)
      }

      // 5. Write ONE income record with bank_account_id so bank balance updates
      const equipIncRow: Record<string, unknown> = {
        income_date:         equipmentForm.sale_date,
        income_type:         'equipment_sale',
        source_type:         'other',
        amount:              salePrice,
        description:         `Equipment Sale: ${equipmentForm.item_name}${equipmentForm.customer_name ? ' — ' + equipmentForm.customer_name : ''} (Invoice ${invoiceNumber})`,
        customer_company_id: equipmentForm.customer_company_id || null,
        payment_method:      equipmentForm.payment_method,
        bank_account_id:     equipmentForm.bank_account_id || null,
        reference_id:        inv.id,
      }
      const { error: incErr } = await supabase.from('income_records').insert([equipIncRow])
      if (incErr) {
        const { bank_account_id: _b, reference_id: _r, ...baseRow } = equipIncRow as any
        const { error: incErr2 } = await supabase.from('income_records').insert([baseRow])
        if (incErr2) throw incErr2
      }

      alert(`Equipment sale recorded! Invoice ${invoiceNumber} created and marked paid.`)
      setEquipmentForm({
        warehouse_id: '',
        land_equipment_id: '',
        item_name: '',
        sale_date: new Date().toISOString().split('T')[0],
        quantity: '1',
        sale_price: '',
        customer_name: '',
        customer_company_id: '',
        payment_method: 'transfer',
        bank_account_id: '',
      })
      setWarehouseEquipment([])
      fetchData()
    } catch (error) {
      console.error('Error recording equipment sale:', error)
      alert('Failed to record equipment sale: ' + (error as any)?.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const expRow: Record<string, unknown> = {
        expense_type: expenseForm.expense_type,
        category: expenseForm.category,
        amount: parseFloat(expenseForm.amount),
        date: expenseForm.date,
        vendor_name: expenseForm.vendor_name,
        payment_method: expenseForm.payment_method,
        bank_account_id: expenseForm.bank_account_id || null,
        description: expenseForm.description,
        status: 'paid',
      }
      const { error } = await supabase.from('expenses').insert([expRow])
      if (error) {
        const { bank_account_id: _b, ...baseRow } = expRow as any
        const { error: err2 } = await supabase.from('expenses').insert([baseRow])
        if (err2) throw err2
      }

      alert('Expense recorded successfully!')
      setExpenseForm({
        expense_type: '',
        category: 'labor',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        vendor_name: '',
        payment_method: 'transfer',
        bank_account_id: '',
        description: '',
      })
    } catch (error) {
      console.error('Error recording expense:', error)
      alert('Failed to record expense')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quick Entry</h1>
        <p className="text-gray-600 mt-1">Fast transaction recording</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('scrap')}
          className={`px-4 py-3 font-medium border-b-2 ${
            activeTab === 'scrap'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Scrap Sales
        </button>
        <button
          onClick={() => setActiveTab('equipment')}
          className={`px-4 py-3 font-medium border-b-2 ${
            activeTab === 'equipment'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Equipment Sales
        </button>
        <button
          onClick={() => setActiveTab('expense')}
          className={`px-4 py-3 font-medium border-b-2 ${
            activeTab === 'expense'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Expenses
        </button>
      </div>

      {/* Scrap Sales Form */}
      {activeTab === 'scrap' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Scrap Sale</h2>
          <form onSubmit={handleScrapSaleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Land *</label>
                <select
                  value={scrapForm.land_id}
                  onChange={(e) => {
                    setScrapForm({ ...scrapForm, land_id: e.target.value })
                    setSelectedLand(lands.find(l => l.id === e.target.value))
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select land...</option>
                  {lands.map((land) => (
                    <option key={land.id} value={land.id}>
                      {land.land_name} (Remaining: {land.remaining_tonnage || 0} tons)
                    </option>
                  ))}
                </select>
              </div>
              {selectedLand && (
                <div className="flex items-end">
                  <div className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-gray-600">Available Tonnage</p>
                    <p className="text-lg font-bold text-blue-600">{selectedLand.remaining_tonnage || 0} tons</p>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Date *</label>
                <input
                  type="date"
                  value={scrapForm.sale_date}
                  onChange={(e) => setScrapForm({ ...scrapForm, sale_date: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Type *</label>
                <input
                  type="text"
                  value={scrapForm.material_type}
                  onChange={(e) => setScrapForm({ ...scrapForm, material_type: e.target.value })}
                  placeholder="e.g., steel, copper, aluminum"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (tons) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={scrapForm.quantity_tons}
                  onChange={(e) => setScrapForm({ ...scrapForm, quantity_tons: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price per Ton (Đ) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={scrapForm.price_per_ton}
                  onChange={(e) => setScrapForm({ ...scrapForm, price_per_ton: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total (Auto)</label>
                <input
                  type="text"
                  disabled
                  value={
                    scrapForm.quantity_tons && scrapForm.price_per_ton
                      ? (parseFloat(scrapForm.quantity_tons) * parseFloat(scrapForm.price_per_ton)).toLocaleString()
                      : '0'
                  }
                  className="w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-lg text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Name *</label>
                <input
                  type="text"
                  value={scrapForm.buyer_name}
                  onChange={(e) => setScrapForm({ ...scrapForm, buyer_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Company</label>
                <select
                  value={scrapForm.buyer_company_id}
                  onChange={(e) => setScrapForm({ ...scrapForm, buyer_company_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select company...</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Received In Bank Account *</label>
                <select
                  value={scrapForm.bank_account_id}
                  onChange={(e) => setScrapForm({ ...scrapForm, bank_account_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select account...</option>
                  {bankAccounts.map((acc) => (
                    <option key={acc.account_id} value={acc.account_id}>
                      {acc.account_name} (Đ {acc.calculated_balance?.toLocaleString() || 0})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                <select
                  value={scrapForm.payment_method}
                  onChange={(e) => setScrapForm({ ...scrapForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              {canCreate ? (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {loading ? 'Recording...' : 'Record Sale'}
                </button>
              ) : (
                <div className="text-sm text-gray-600">You don't have permission to record sales</div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Equipment Sales Form */}
      {activeTab === 'equipment' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Equipment Sale</h2>
          <form onSubmit={handleEquipmentSaleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse *</label>
                <select
                  value={equipmentForm.warehouse_id}
                  onChange={(e) => handleWarehouseChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select warehouse...</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Date *</label>
                <input
                  type="date"
                  value={equipmentForm.sale_date}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, sale_date: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipment in Warehouse *
                  {equipmentForm.warehouse_id && (
                    <span className="ml-2 text-xs text-gray-500">
                      ({warehouseEquipment.length} unsold item{warehouseEquipment.length !== 1 ? 's' : ''} available)
                    </span>
                  )}
                </label>
                <select
                  value={equipmentForm.land_equipment_id}
                  onChange={(e) => handleEquipmentSelect(e.target.value)}
                  required
                  disabled={!equipmentForm.warehouse_id}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">
                    {!equipmentForm.warehouse_id
                      ? 'Select a warehouse first...'
                      : warehouseEquipment.length === 0
                      ? 'No unsold equipment in this warehouse'
                      : 'Select equipment...'}
                  </option>
                  {warehouseEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.equipment_name}
                      {eq.condition ? ` (${eq.condition})` : ''}
                      {` — ${eq.quantity ?? 0} ${eq.unit || 'unit'} available`}
                      {eq.estimated_value ? ` — Đ ${eq.estimated_value.toLocaleString()}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  value={equipmentForm.item_name}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, item_name: e.target.value })}
                  placeholder="Auto-filled from equipment selection"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Sold *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={equipmentForm.quantity}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, quantity: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price (Đ) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={equipmentForm.sale_price}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, sale_price: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={equipmentForm.customer_name}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, customer_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Company</label>
                <select
                  value={equipmentForm.customer_company_id}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, customer_company_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select company...</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                <select
                  value={equipmentForm.payment_method}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Received In Bank Account *</label>
                <select
                  value={equipmentForm.bank_account_id}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, bank_account_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select account...</option>
                  {bankAccounts.map((acc) => (
                    <option key={acc.account_id} value={acc.account_id}>
                      {acc.account_name} (Đ {acc.calculated_balance?.toLocaleString() || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              {canCreate ? (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {loading ? 'Recording...' : 'Record Sale'}
                </button>
              ) : (
                <div className="text-sm text-gray-600">You don't have permission to record sales</div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Expense Form */}
      {activeTab === 'expense' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Expense</h2>
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type *</label>
                <input
                  type="text"
                  value={expenseForm.expense_type}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_type: e.target.value })}
                  placeholder="e.g., Labor, Materials, Fuel"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="labor">Labor</option>
                  <option value="materials">Materials</option>
                  <option value="fuel">Fuel</option>
                  <option value="equipment">Equipment</option>
                  <option value="utilities">Utilities</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Đ) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name *</label>
                <input
                  type="text"
                  value={expenseForm.vendor_name}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vendor_name: e.target.value })}
                  placeholder="Contractor, supplier, etc."
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                <select
                  value={expenseForm.payment_method}
                  onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paid From Bank Account *</label>
                <select
                  value={expenseForm.bank_account_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, bank_account_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select account...</option>
                  {bankAccounts.map((acc) => (
                    <option key={acc.account_id} value={acc.account_id}>
                      {acc.account_name} (Đ {acc.calculated_balance?.toLocaleString() || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder="Optional details about the expense"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              {canCreate ? (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {loading ? 'Recording...' : 'Record Expense'}
                </button>
              ) : (
                <div className="text-sm text-gray-600">You don't have permission to record expenses</div>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
