'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, use } from 'react'
import { ArrowLeft, Plus, Package, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import UseInventoryModal from '@/components/UseInventoryModal'
import ReplaceEquipmentModal from '@/components/ReplaceEquipmentModal'

export default function VesselDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [activeTab, setActiveTab] = useState('overview')
  const [showUseInventory, setShowUseInventory] = useState(false)
  const [showReplaceEquipment, setShowReplaceEquipment] = useState(false)
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: vessel } = useQuery({
    queryKey: ['vessel', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessels')
        .select('*')
        .eq('id', resolvedParams.id)
        .single()
      if (error) throw error
      return data
    }
  })

  const { data: equipmentSales } = useQuery({
    queryKey: ['vessel_equipment_sales', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_equipment_sales')
        .select('*')
        .eq('vessel_id', resolvedParams.id)
        .order('sale_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: scrapSales } = useQuery({
    queryKey: ['vessel_scrap_sales', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_scrap_sales')
        .select('*')
        .eq('vessel_id', resolvedParams.id)
        .order('sale_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: movements } = useQuery({
    queryKey: ['vessel_movements', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_movements')
        .select('*')
        .eq('vessel_id', resolvedParams.id)
        .order('movement_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: expenses } = useQuery({
    queryKey: ['vessel_expenses', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('project_id', resolvedParams.id)
        .eq('project_type', 'vessel')
        .order('date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  if (!vessel) {
    return <div>Loading...</div>
  }

  const totalEquipmentSales = equipmentSales?.reduce((sum, sale) => sum + (sale.sale_price || 0), 0) || 0
  const totalScrapSales = scrapSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
  const totalMovementCosts = movements?.reduce((sum, mov) => sum + (mov.cost || 0), 0) || 0
  const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0
  const netProfitLoss = totalEquipmentSales + totalScrapSales - (vessel.purchase_price || 0) - totalMovementCosts - totalExpenses

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Link href="/dashboard/marine/vessels" className="inline-flex items-center text-blue-600 hover:text-blue-700">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Vessels
        </Link>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowUseInventory(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Package className="h-5 w-5" />
            Use Inventory
          </button>
          
          <button
            onClick={() => setShowReplaceEquipment(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <AlertTriangle className="h-5 w-5" />
            Replace Equipment
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{vessel.name}</h1>
            <p className="text-gray-600 mt-1">{vessel.vessel_type}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            vessel.status === 'active' ? 'bg-green-100 text-green-800' :
            vessel.status === 'scrapping' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {vessel.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-600">Purchase Price</p>
            <p className="text-lg font-semibold">{vessel.purchase_price?.toLocaleString() || 'N/A'} AED</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-lg font-semibold text-green-600">
              +{(totalEquipmentSales + totalScrapSales).toLocaleString()} AED
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Costs</p>
            <p className="text-lg font-semibold text-red-600">
              -{((vessel.purchase_price || 0) + totalMovementCosts + totalExpenses).toLocaleString()} AED
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Net Profit/Loss</p>
            <p className={`text-lg font-bold ${netProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netProfitLoss >= 0 ? '+' : ''}{netProfitLoss.toLocaleString()} AED
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {['overview', 'equipment', 'scrap', 'movements', 'expenses'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-medium">{vessel.current_location || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tonnage</p>
                  <p className="font-medium">{vessel.tonnage || 'N/A'} tons</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Year Built</p>
                  <p className="font-medium">{vessel.year_built || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Classification</p>
                  <p className="font-medium">{vessel.classification_status || 'N/A'}</p>
                </div>
              </div>
              {vessel.notes && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Notes</p>
                  <p className="text-gray-900">{vessel.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'equipment' && (
            <EquipmentSalesTab vesselId={resolvedParams.id} sales={equipmentSales || []} />
          )}

          {activeTab === 'scrap' && (
            <ScrapSalesTab vesselId={resolvedParams.id} sales={scrapSales || []} />
          )}

          {activeTab === 'movements' && (
            <MovementsTab vesselId={resolvedParams.id} movements={movements || []} />
          )}

          {activeTab === 'expenses' && (
            <ExpensesTab vesselId={resolvedParams.id} expenses={expenses || []} />
          )}
        </div>
      </div>

      {/* Modals */}
      <UseInventoryModal
        isOpen={showUseInventory}
        onClose={() => setShowUseInventory(false)}
        vesselId={resolvedParams.id}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['marine_inventory'] })
        }}
      />

      <ReplaceEquipmentModal
        isOpen={showReplaceEquipment}
        onClose={() => setShowReplaceEquipment(false)}
        vesselId={resolvedParams.id}
        vesselName={vessel?.name || 'Unknown Vessel'}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['equipment_replacements'] })
          queryClient.invalidateQueries({ queryKey: ['land_equipment'] })
        }}
      />
    </div>
  )
}

function EquipmentSalesTab({ vesselId, sales }: { vesselId: string, sales: any[] }) {
  const [isAdding, setIsAdding] = useState(false)
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Equipment Sales</h3>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center text-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Sale
        </button>
      </div>

      {sales.length > 0 ? (
        <div className="space-y-3">
          {sales.map((sale) => (
            <div key={sale.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">{sale.equipment_name}</h4>
                  {sale.description && (
                    <p className="text-sm text-gray-600 mt-1">{sale.description}</p>
                  )}
                  {sale.buyer_name && (
                    <p className="text-sm text-gray-600 mt-1">Buyer: {sale.buyer_name}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    {sale.sale_price?.toLocaleString()} AED
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{sale.sale_date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No equipment sales recorded</p>
      )}

      {isAdding && <EquipmentSaleForm vesselId={vesselId} onClose={() => setIsAdding(false)} />}
    </div>
  )
}

function EquipmentSaleForm({ vesselId, onClose }: { vesselId: string, onClose: () => void }) {
  const [formData, setFormData] = useState({
    equipment_name: '',
    description: '',
    sale_date: new Date().toISOString().split('T')[0],
    sale_price: '',
    buyer_name: '',
    notes: ''
  })

  const queryClient = useQueryClient()
  const supabase = createClient()

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('vessel_equipment_sales')
        .insert([{ ...data, vessel_id: vesselId }])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_equipment_sales', vesselId] })
      onClose()
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Add Equipment Sale</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Name *</label>
            <input
              type="text"
              required
              value={formData.equipment_name}
              onChange={(e) => setFormData({ ...formData, equipment_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price (AED) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.sale_price}
              onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sale Date *</label>
            <input
              type="date"
              required
              value={formData.sale_date}
              onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Name</label>
            <input
              type="text"
              value={formData.buyer_name}
              onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {mutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ScrapSalesTab({ vesselId, sales }: { vesselId: string, sales: any[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Scrap Metal Sales</h3>
      {sales.length > 0 ? (
        <div className="space-y-3">
          {sales.map((sale) => (
            <div key={sale.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{sale.tonnage} tons</p>
                  <p className="text-sm text-gray-600">@ {sale.price_per_ton?.toLocaleString()} AED/ton</p>
                  {sale.buyer_name && <p className="text-sm text-gray-600 mt-1">Buyer: {sale.buyer_name}</p>}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">{sale.total_amount?.toLocaleString()} AED</p>
                  <p className="text-xs text-gray-500 mt-1">{sale.sale_date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No scrap sales recorded</p>
      )}
    </div>
  )
}

function MovementsTab({ vesselId, movements }: { vesselId: string, movements: any[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Vessel Movements</h3>
      {movements.length > 0 ? (
        <div className="space-y-3">
          {movements.map((movement) => (
            <div key={movement.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{movement.from_location} → {movement.to_location}</p>
                  {movement.description && <p className="text-sm text-gray-600 mt-1">{movement.description}</p>}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-600">{movement.cost?.toLocaleString()} AED</p>
                  <p className="text-xs text-gray-500 mt-1">{movement.movement_date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No movements recorded</p>
      )}
    </div>
  )
}

function ExpensesTab({ vesselId, expenses }: { vesselId: string, expenses: any[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Expenses</h3>
      {expenses.length > 0 ? (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <div key={expense.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{expense.expense_type}</p>
                  {expense.description && <p className="text-sm text-gray-600 mt-1">{expense.description}</p>}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-600">{expense.amount?.toLocaleString()} AED</p>
                  <p className="text-xs text-gray-500 mt-1">{expense.date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No expenses recorded</p>
      )}
    </div>
  )
}
