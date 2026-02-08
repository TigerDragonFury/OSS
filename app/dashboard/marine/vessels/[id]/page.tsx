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
        .order('date', { ascending: false})
      if (error) throw error
      return data
    }
  })

  const { data: overhaulProjects } = useQuery({
    queryKey: ['vessel_overhauls', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_overhaul_projects')
        .select('*')
        .eq('vessel_id', resolvedParams.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: overhaulExpenses } = useQuery({
    queryKey: ['vessel_overhaul_expenses', resolvedParams.id],
    queryFn: async () => {
      // First get all overhaul project IDs for this vessel
      const { data: projects } = await supabase
        .from('vessel_overhaul_projects')
        .select('id')
        .eq('vessel_id', resolvedParams.id)
      
      console.log('Overhaul projects for vessel:', projects)
      
      if (!projects || projects.length === 0) return []
      
      const projectIds = projects.map(p => p.id)
      console.log('Project IDs:', projectIds)
      
      // Then get expenses for those overhaul projects (both 'vessel' and 'overhaul' types)
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .in('project_id', projectIds)
        .order('date', { ascending: false })
      
      console.log('Overhaul expenses raw data:', data)
      console.log('Overhaul expenses error:', error)
      
      if (error) throw error
      return data || []
    }
  })

  const { data: vesselRentals } = useQuery({
    queryKey: ['vessel_rentals', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_rentals')
        .select('*')
        .eq('vessel_id', resolvedParams.id)
        .order('start_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: rentalPayments } = useQuery({
    queryKey: ['vessel_rental_payments', resolvedParams.id],
    queryFn: async () => {
      // Get all rental IDs for this vessel
      const { data: rentals } = await supabase
        .from('vessel_rentals')
        .select('id')
        .eq('vessel_id', resolvedParams.id)
      
      if (!rentals || rentals.length === 0) return []
      
      const rentalIds = rentals.map(r => r.id)
      
      // Get payments for those rentals
      const { data, error } = await supabase
        .from('rental_payments')
        .select('*')
        .in('rental_id', rentalIds)
        .eq('status', 'completed')
        .order('payment_date', { ascending: false })
      if (error) throw error
      return data || []
    }
  })

  const { data: inventoryUsage } = useQuery({
    queryKey: ['vessel_inventory_usage', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_usage')
        .select(`
          *,
          marine_inventory(equipment_name, category, unit),
          vessel_overhaul_projects(project_name)
        `)
        .eq('vessel_id', resolvedParams.id)
        .order('usage_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: equipmentReplacements } = useQuery({
    queryKey: ['vessel_equipment_replacements', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_replacements')
        .select(`
          *,
          warehouses(name, location),
          marine_inventory(equipment_name),
          vessel_overhaul_projects(project_name)
        `)
        .eq('vessel_id', resolvedParams.id)
        .order('replacement_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: installedEquipment } = useQuery({
    queryKey: ['vessel_installed_equipment', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_equipment')
        .select('*')
        .eq('vessel_id', resolvedParams.id)
        .order('installation_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  if (!vessel) {
    return <div>Loading...</div>
  }

  const totalEquipmentSales = equipmentSales?.reduce((sum, sale) => sum + (sale.sale_price || 0), 0) || 0
  const totalScrapSales = scrapSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
  const totalRentalIncome = rentalPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0
  const totalRevenue = totalEquipmentSales + totalScrapSales + totalRentalIncome
  
  const totalMovementCosts = movements?.reduce((sum, mov) => sum + (mov.cost || 0), 0) || 0
  const vesselExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0
  const totalOverhaulExpenses = overhaulExpenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0
  const totalInventoryCost = inventoryUsage?.reduce((sum, item) => sum + (item.quantity_used * item.unit_cost), 0) || 0
  const totalReplacementCost = equipmentReplacements?.reduce((sum, item) => sum + (item.replacement_cost || 0) + (item.labor_cost || 0), 0) || 0
  const totalExpenses = vesselExpenses + totalOverhaulExpenses + totalInventoryCost + totalReplacementCost
  const totalCosts = (vessel.purchase_price || 0) + totalMovementCosts + totalExpenses
  const netProfitLoss = totalRevenue - totalCosts

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
              +{totalRevenue.toLocaleString()} AED
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Equipment: {totalEquipmentSales.toLocaleString()} | Scrap: {totalScrapSales.toLocaleString()} | Rentals: {totalRentalIncome.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Costs</p>
            <p className="text-lg font-semibold text-red-600">
              -{totalCosts.toLocaleString()} AED
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Purchase: {(vessel.purchase_price || 0).toLocaleString()} | Movements: {totalMovementCosts.toLocaleString()} | Operations: {totalExpenses.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Net Profit/Loss</p>
            <p className={`text-lg font-bold ${netProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netProfitLoss >= 0 ? '+' : ''}{netProfitLoss.toLocaleString()} AED
            </p>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Revenue Breakdown */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="text-sm font-semibold text-green-700 mb-3">Revenue Breakdown</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Equipment Sales:</span>
                <span className="font-semibold text-gray-900">{totalEquipmentSales.toLocaleString()} AED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Scrap Sales:</span>
                <span className="font-semibold text-gray-900">{totalScrapSales.toLocaleString()} AED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Rental Income:</span>
                <span className="font-semibold text-gray-900">{totalRentalIncome.toLocaleString()} AED</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-green-300">
                <span className="font-semibold text-green-800">Total Revenue:</span>
                <span className="font-bold text-green-800">{totalRevenue.toLocaleString()} AED</span>
              </div>
            </div>
          </div>
          
          {/* Cost Breakdown */}
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h4 className="text-sm font-semibold text-red-700 mb-3">Operational Cost Breakdown</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Vessel Expenses:</span>
                <span className="font-semibold text-gray-900">{vesselExpenses.toLocaleString()} AED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Overhaul Costs:</span>
                <span className="font-semibold text-gray-900">{totalOverhaulExpenses.toLocaleString()} AED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Parts & Inventory:</span>
                <span className="font-semibold text-gray-900">{totalInventoryCost.toLocaleString()} AED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Equipment Replacements:</span>
                <span className="font-semibold text-gray-900">{totalReplacementCost.toLocaleString()} AED</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-red-300">
                <span className="font-semibold text-red-800">Total Operations:</span>
                <span className="font-bold text-red-800">{totalExpenses.toLocaleString()} AED</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'overhauls', name: 'Overhaul Projects' },
              { id: 'rentals', name: 'Rentals & Income' },
              { id: 'equipment', name: 'Equipment Sales' },
              { id: 'scrap', name: 'Scrap Sales' },
              { id: 'movements', name: 'Movements' },
              { id: 'expenses', name: 'All Expenses' },
              { id: 'parts', name: 'Parts Used' },
              { id: 'replacements', name: 'Equipment Replaced' },
              { id: 'installed', name: 'Installed Equipment' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
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
            <ExpensesTab vesselId={resolvedParams.id} expenses={overhaulExpenses || []} />
          )}

          {activeTab === 'rentals' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Vessel Rentals & Income</h3>
                  <p className="text-sm text-gray-600">Rental history and payments received</p>
                </div>
                {totalRentalIncome > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total Rental Income</p>
                    <p className="text-xl font-bold text-green-600">
                      {totalRentalIncome.toLocaleString()} AED
                    </p>
                  </div>
                )}
              </div>
              {!vesselRentals || vesselRentals.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No rental history for this vessel</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {vesselRentals.map((rental: any) => (
                    <div key={rental.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">
                              {rental.customer_name || 'N/A'}
                            </h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              rental.status === 'active' ? 'bg-blue-100 text-blue-800' :
                              rental.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {(rental.status || '').toUpperCase()}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              rental.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                              rental.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              rental.payment_status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {(rental.payment_status || '').toUpperCase()}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Period</p>
                              <p className="font-medium text-gray-900">
                                {new Date(rental.start_date).toLocaleDateString()} - {rental.end_date ? new Date(rental.end_date).toLocaleDateString() : 'Ongoing'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Daily Rate</p>
                              <p className="font-medium text-gray-900">{(rental.daily_rate || 0).toLocaleString()} AED/day</p>
                            </div>
                          </div>
                          {rental.notes && (
                            <p className="text-sm text-gray-600 mt-2">{rental.notes}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm text-gray-600">Total Amount</p>
                          <p className="text-xl font-bold text-green-600">
                            {(rental.total_amount || 0).toLocaleString()} AED
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'overhauls' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Overhaul Projects</h3>
              </div>
              {!overhaulProjects || overhaulProjects.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No overhaul projects for this vessel yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {overhaulProjects.map((project: any) => (
                    <Link
                      key={project.id}
                      href={`/dashboard/marine/overhauls/${project.id}`}
                      className="block p-4 border rounded-lg hover:bg-gray-50 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-blue-600">{project.project_name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{project.description || 'No description'}</p>
                          <div className="flex gap-4 mt-2 text-sm">
                            <span className="text-gray-600">
                              Start: {new Date(project.start_date).toLocaleDateString()}
                            </span>
                            {project.end_date && (
                              <span className="text-gray-600">
                                End: {new Date(project.end_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          project.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {(project.status || '').replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      {project.estimated_cost && (
                        <div className="mt-2 text-sm text-gray-700">
                          Estimated Cost: <span className="font-semibold">{project.estimated_cost.toLocaleString()} AED</span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'parts' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Parts & Inventory Used</h3>
                  <p className="text-sm text-gray-600">All spare parts used for maintenance and overhaul</p>
                </div>
                {inventoryUsage && inventoryUsage.length > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total Cost</p>
                    <p className="text-xl font-bold text-red-600">
                      {inventoryUsage.reduce((sum: number, item: any) => 
                        sum + (item.quantity_used * item.unit_cost), 0
                      ).toLocaleString()} AED
                    </p>
                  </div>
                )}
              </div>
              {!inventoryUsage || inventoryUsage.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No inventory used yet</p>
                  <p className="text-sm mt-2">Use the "Use Inventory" button above to record parts usage</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Item</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Category</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Project</th>
                        <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Quantity</th>
                        <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Unit Cost</th>
                        <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Total Cost</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Purpose</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {inventoryUsage.map((item: any) => (
                        <tr key={item.id}>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                            {new Date(item.usage_date).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-900">
                            {item.marine_inventory?.equipment_name || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600">
                            {item.marine_inventory?.category || 'N/A'}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-600">
                            {item.vessel_overhaul_projects?.project_name || 'General Maintenance'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-900">
                            {item.quantity_used} {item.marine_inventory?.unit || ''}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-600">
                            {item.unit_cost?.toLocaleString()} AED
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-right font-semibold text-gray-900">
                            {(item.quantity_used * item.unit_cost).toLocaleString()} AED
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-600">
                            {item.purpose || 'N/A'}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-600">
                            {item.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'replacements' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Equipment Replacements</h3>
                  <p className="text-sm text-gray-600">History of equipment failures and replacements</p>
                </div>
                {equipmentReplacements && equipmentReplacements.length > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total Replacement Cost</p>
                    <p className="text-xl font-bold text-red-600">
                      {equipmentReplacements.reduce((sum: number, item: any) => 
                        sum + (item.replacement_cost || 0) + (item.labor_cost || 0), 0
                      ).toLocaleString()} AED
                    </p>
                  </div>
                )}
              </div>
              {!equipmentReplacements || equipmentReplacements.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No equipment replacements recorded</p>
                  <p className="text-sm mt-2">Use the "Replace Equipment" button above to record failures and replacements</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {equipmentReplacements.map((replacement: any) => (
                    <div key={replacement.id} className="border rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-6">
                        {/* Failed Equipment */}
                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-red-700">Failed Equipment</h4>
                              <p className="text-lg font-medium text-gray-900 mt-1">{replacement.old_equipment_name}</p>
                            </div>
                          </div>
                          <div className="space-y-2 pl-7">
                            <div>
                              <p className="text-xs text-gray-600">Failure Reason</p>
                              <p className="text-sm text-gray-900">{replacement.failure_reason || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Replacement Date</p>
                              <p className="text-sm text-gray-900">
                                {new Date(replacement.replacement_date).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Disposition</p>
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                replacement.old_equipment_disposition === 'warehouse' ? 'bg-blue-100 text-blue-800' :
                                replacement.old_equipment_disposition === 'scrap' ? 'bg-red-100 text-red-800' :
                                replacement.old_equipment_disposition === 'repair' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {(replacement.old_equipment_disposition || '').toUpperCase()}
                              </span>
                            </div>
                            {replacement.old_equipment_disposition === 'warehouse' && replacement.warehouse_id && (
                              <div>
                                <p className="text-xs text-gray-600">Sent to Warehouse</p>
                                <p className="text-sm text-gray-900">
                                  {replacement.warehouses?.name} ({replacement.warehouses?.location})
                                </p>
                              </div>
                            )}
                            {replacement.vessel_overhaul_projects?.project_name && (
                              <div>
                                <p className="text-xs text-gray-600">Overhaul Project</p>
                                <p className="text-sm text-blue-600">
                                  {replacement.vessel_overhaul_projects.project_name}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Replacement Equipment */}
                        <div className="space-y-3 border-l pl-6">
                          <div className="flex items-start gap-2">
                            <Package className="h-5 w-5 text-green-500 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-green-700">Replacement</h4>
                              <p className="text-lg font-medium text-gray-900 mt-1">
                                {replacement.new_equipment_name || replacement.marine_inventory?.equipment_name || 'N/A'}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2 pl-7">
                            <div>
                              <p className="text-xs text-gray-600">Source</p>
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                replacement.replacement_source === 'inventory' ? 'bg-blue-100 text-blue-800' :
                                replacement.replacement_source === 'purchase' ? 'bg-green-100 text-green-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {(replacement.replacement_source || '').toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Installation Date</p>
                              <p className="text-sm text-gray-900">
                                {new Date(replacement.replacement_date).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="pt-2 border-t">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Parts Cost:</span>
                                <span className="font-medium">{(replacement.replacement_cost || 0).toLocaleString()} AED</span>
                              </div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Labor Cost:</span>
                                <span className="font-medium">{(replacement.labor_cost || 0).toLocaleString()} AED</span>
                              </div>
                              <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                                <span className="text-gray-900">Total Cost:</span>
                                <span className="text-red-600">
                                  {((replacement.replacement_cost || 0) + (replacement.labor_cost || 0)).toLocaleString()} AED
                                </span>
                              </div>
                            </div>
                            {replacement.notes && (
                              <div>
                                <p className="text-xs text-gray-600">Notes</p>
                                <p className="text-sm text-gray-900">{replacement.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'installed' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Currently Installed Equipment</h3>
                  <p className="text-sm text-gray-600">Active equipment on this vessel</p>
                </div>
              </div>
              {!installedEquipment || installedEquipment.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No equipment installations recorded</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Equipment Name</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Installation Date</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {installedEquipment.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-3 py-4 text-sm font-medium text-gray-900">
                            {item.equipment_name}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-600">
                            {item.equipment_type || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600">
                            {new Date(item.installation_date).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-4 text-sm">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              item.status === 'active' ? 'bg-green-100 text-green-800' :
                              item.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {(item.status || '').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-600">
                            {item.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
          queryClient.invalidateQueries({ queryKey: ['vessel_inventory_usage', resolvedParams.id] })
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
          queryClient.invalidateQueries({ queryKey: ['vessel_equipment_replacements', resolvedParams.id] })
          queryClient.invalidateQueries({ queryKey: ['vessel_installed_equipment', resolvedParams.id] })
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
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">All Expenses</h3>
          <p className="text-sm text-gray-600">Vessel expenses and overhaul project costs</p>
        </div>
        {expenses.length > 0 && (
          <div className="text-right">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-xl font-bold text-red-600">
              {expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0).toLocaleString()} AED
            </p>
          </div>
        )}
      </div>
      {expenses.length > 0 ? (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <div key={expense.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{expense.expense_type}</p>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      expense.project_type === 'overhaul' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {expense.project_type === 'overhaul' ? 'OVERHAUL' : 'VESSEL'}
                    </span>
                  </div>
                  {expense.vessel_overhaul_projects && (
                    <p className="text-sm text-blue-600 mt-1">
                      Project: {expense.vessel_overhaul_projects.project_name}
                    </p>
                  )}
                  {expense.description && <p className="text-sm text-gray-600 mt-1">{expense.description}</p>}
                </div>
                <div className="text-right ml-4">
                  <p className="font-semibold text-red-600">{expense.amount?.toLocaleString()} AED</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(expense.date).toLocaleDateString()}</p>
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
