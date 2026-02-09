'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, use } from 'react'
import { ArrowLeft, Plus, Settings, DollarSign, FileText, Ship, Package, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import PaymentSplitsInput from '@/components/PaymentSplitsInput'

type ComponentType = 'engine' | 'generator' | 'radio_equipment' | 'navigation_equipment' | 
  'hull' | 'propeller_shaft' | 'safety_equipment' | 'accommodation' | 'reclassification' | 'other'

type RepairType = 'top_overhaul' | 'major_overhaul' | 'complete_replacement' | 'repair' | 
  'maintenance' | 'inspection' | 'upgrade' | 'reclassification'

export default function OverhaulDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [activeTab, setActiveTab] = useState('overview')
  const [showComponentForm, setShowComponentForm] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [editingExpense, setEditingExpense] = useState<any>(null)
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: project } = useQuery({
    queryKey: ['vessel_overhaul_project', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_overhaul_projects')
        .select('*, vessels(*)')
        .eq('id', resolvedParams.id)
        .single()
      if (error) throw error
      return data
    }
  })

  const { data: tasks } = useQuery({
    queryKey: ['overhaul_tasks', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('overhaul_tasks')
        .select('*')
        .eq('project_id', resolvedParams.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: expenses } = useQuery({
    queryKey: ['overhaul_expenses', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('project_id', resolvedParams.id)
        .in('project_type', ['vessel', 'overhaul'])
        .order('date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: inventoryUsage } = useQuery({
    queryKey: ['overhaul_inventory_usage', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_usage')
        .select(`
          *,
          marine_inventory(equipment_name, category, unit)
        `)
        .eq('overhaul_project_id', resolvedParams.id)
        .order('usage_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: equipmentReplacements } = useQuery({
    queryKey: ['overhaul_equipment_replacements', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_replacements')
        .select(`
          *,
          warehouses(name, location),
          marine_inventory(equipment_name)
        `)
        .eq('overhaul_project_id', resolvedParams.id)
        .order('replacement_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const totalTaskCost = tasks?.reduce((sum, task) => sum + (task.estimated_cost || 0), 0) || 0
  const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0
  const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0
  const totalTasks = tasks?.length || 0
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'components', name: 'Components & Work' },
    { id: 'expenses', name: 'Expenses' },
    { id: 'inventory', name: 'Inventory Used' },
    { id: 'replacements', name: 'Equipment Replaced' },
    { id: 'reclassification', name: 'Vessel Updates' }
  ]

  return (
    <div className="space-y-6">
      <Link href="/dashboard/marine/overhauls" className="inline-flex items-center text-blue-600 hover:text-blue-700">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Overhaul Projects
      </Link>

      {/* Project Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.project_name}</h1>
            <p className="text-gray-600 mt-1">Vessel: {project.vessels?.name || 'N/A'}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            project.status === 'completed' ? 'bg-green-100 text-green-800' :
            project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
            project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {project.status?.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Budget</p>
            <p className="text-2xl font-bold text-blue-900 mt-2">
              {project.total_budget?.toLocaleString() || 0} AED
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-red-600 font-medium">Total Spent</p>
            <p className="text-2xl font-bold text-red-900 mt-2">
              {(project.total_spent || 0).toLocaleString()} AED
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-purple-600 font-medium">Remaining</p>
            <p className="text-2xl font-bold text-purple-900 mt-2">
              {((project.total_budget || 0) - (project.total_spent || 0)).toLocaleString()} AED
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">Progress</p>
            <p className="text-2xl font-bold text-green-900 mt-2">
              {progressPercent.toFixed(0)}%
            </p>
            <p className="text-xs text-green-600 mt-1">{completedTasks} of {totalTasks} tasks</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Vessel Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{project.vessels?.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Vessel Type</dt>
                    <dd className="mt-1 text-sm text-gray-900 capitalize">{project.vessels?.vessel_type?.replace('_', ' ')}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">End Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set'}
                    </dd>
                  </div>
                </dl>
              </div>

              {project.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Project Notes</h4>
                  <p className="text-sm text-gray-900 bg-gray-50 p-4 rounded-lg">{project.notes}</p>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Summary by Component</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {['engine', 'generator', 'radio_equipment', 'navigation_equipment', 'hull', 'propeller_shaft', 'safety_equipment', 'accommodation', 'reclassification'].map(componentType => {
                    const componentTasks = tasks?.filter(t => t.component_type === componentType) || []
                    const componentCost = componentTasks.reduce((sum, t) => sum + (t.estimated_cost || 0), 0)
                    
                    if (componentTasks.length === 0) return null
                    
                    return (
                      <div key={componentType} className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-900 capitalize">
                          {componentType.replace('_', ' ')}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">{componentTasks.length} task(s)</p>
                        <p className="text-lg font-bold text-blue-600 mt-2">
                          {componentCost.toLocaleString()} AED
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Components & Work Tab */}
          {activeTab === 'components' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Component Work Items</h3>
                <button
                  onClick={() => setShowComponentForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center text-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Component Work
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Component</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estimated Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tasks?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <Settings className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No work items yet</h3>
                          <p className="mt-1 text-sm text-gray-500">Start by adding component work items.</p>
                        </td>
                      </tr>
                    ) : (
                      tasks?.map((task) => (
                        <tr key={task.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                            {task.component_type?.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                            {task.repair_type?.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {task.task_name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {(task.manufacturer || task.model || task.year) && (
                              <div className="space-y-1">
                                {task.manufacturer && <p>Make: {task.manufacturer}</p>}
                                {task.model && <p>Model: {task.model}</p>}
                                {task.year && <p>Year: {task.year}</p>}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {task.estimated_cost?.toLocaleString() || 0} AED
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              task.status === 'completed' ? 'bg-green-100 text-green-800' :
                              task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              task.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {task.status?.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => { setEditingTask(task); setShowComponentForm(true); }}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('Delete this work item?')) {
                                  await supabase.from('overhaul_tasks').delete().eq('id', task.id)
                                  queryClient.invalidateQueries({ queryKey: ['overhaul_tasks', resolvedParams.id] })
                                }
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expenses Tab */}
          {activeTab === 'expenses' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Project Expenses</h3>
                  <p className="text-sm text-gray-600 mt-1">Total: {totalExpenses.toLocaleString()} AED</p>
                </div>
                <button
                  onClick={() => setShowExpenseForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center text-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Method</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expenses?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses recorded</h3>
                          <p className="mt-1 text-sm text-gray-500">Start by recording project expenses.</p>
                        </td>
                      </tr>
                    ) : (
                      expenses?.map((expense) => (
                        <tr key={expense.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {expense.date ? new Date(expense.date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                            {expense.category?.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {expense.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                            {expense.amount?.toLocaleString() || 0} AED
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                            {expense.payment_method?.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {expense.reference_number || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => { setEditingExpense(expense); setShowExpenseForm(true); }}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('Delete this expense?')) {
                                  await supabase.from('expenses').delete().eq('id', expense.id)
                                  queryClient.invalidateQueries({ queryKey: ['overhaul_expenses', resolvedParams.id] })
                                }
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Inventory Used Tab */}
          {activeTab === 'inventory' && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Inventory Used in This Project</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Total Cost: ৳{inventoryUsage?.reduce((sum: number, item: any) => sum + (item.total_cost || 0), 0).toLocaleString()}
                </p>
              </div>

              {inventoryUsage && inventoryUsage.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity Used</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {inventoryUsage.map((item: any) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(item.usage_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {item.marine_inventory?.equipment_name || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {item.marine_inventory?.category || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.quantity_used} {item.marine_inventory?.unit || 'pcs'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ৳{parseFloat(item.unit_cost || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ৳{parseFloat(item.total_cost || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                              {item.purpose || 'overhaul'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                            {item.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No inventory used yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Inventory usage will appear here when you use the "Use Inventory" button.</p>
                </div>
              )}
            </div>
          )}

          {/* Equipment Replacements Tab */}
          {activeTab === 'replacements' && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Equipment Replaced in This Project</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Total Cost: ৳{equipmentReplacements?.reduce((sum: number, item: any) => sum + (item.total_cost || 0), 0).toLocaleString()}
                </p>
              </div>

              {equipmentReplacements && equipmentReplacements.length > 0 ? (
                <div className="space-y-4">
                  {equipmentReplacements.map((replacement: any) => (
                    <div key={replacement.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Old Equipment */}
                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-gray-900">Failed Equipment</h4>
                              <p className="text-base font-medium text-gray-900 mt-1">{replacement.old_equipment_name}</p>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Failure Reason</p>
                            <p className="text-sm text-gray-700 mt-1">{replacement.failure_reason}</p>
                          </div>
                          
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Failure Date</p>
                            <p className="text-sm text-gray-700">{replacement.failure_date}</p>
                          </div>
                          
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Disposition</p>
                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                              replacement.old_equipment_disposition === 'sent_to_warehouse' ? 'bg-blue-100 text-blue-800' :
                              replacement.old_equipment_disposition === 'scrapped' ? 'bg-red-100 text-red-800' :
                              replacement.old_equipment_disposition === 'repaired' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {replacement.old_equipment_disposition?.replace('_', ' ')}
                            </span>
                            {replacement.old_equipment_disposition === 'sent_to_warehouse' && replacement.warehouses && (
                              <p className="text-xs text-gray-600 mt-1">
                                📍 {replacement.warehouses.name} ({replacement.warehouses.location})
                              </p>
                            )}
                          </div>
                        </div>

                        {/* New Equipment */}
                        <div className="space-y-3 border-l pl-6">
                          <div className="flex items-start gap-2">
                            <Package className="h-5 w-5 text-green-500 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-gray-900">Replacement</h4>
                              <p className="text-base font-medium text-gray-900 mt-1">
                                {replacement.marine_inventory?.equipment_name || 'New Equipment'}
                              </p>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Source</p>
                            <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 capitalize">
                              {replacement.new_equipment_source?.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Replacement Date</p>
                            <p className="text-sm text-gray-700">{replacement.replacement_date}</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase">Parts Cost</p>
                              <p className="text-sm font-semibold text-gray-900">
                                ৳{parseFloat(replacement.replacement_cost || 0).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase">Labor Cost</p>
                              <p className="text-sm font-semibold text-gray-900">
                                ৳{parseFloat(replacement.labor_cost || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="pt-2 border-t">
                            <p className="text-xs font-medium text-gray-500 uppercase">Total Cost</p>
                            <p className="text-lg font-bold text-red-600">
                              ৳{parseFloat(replacement.total_cost || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {replacement.notes && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-xs font-medium text-gray-500 uppercase">Notes</p>
                          <p className="text-sm text-gray-700 mt-1">{replacement.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No equipment replaced yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Equipment replacements will appear here when you use the "Replace Equipment" button.</p>
                </div>
              )}
            </div>
          )}

          {/* Reclassification Tab */}
          {activeTab === 'reclassification' && (
            <VesselReclassificationForm 
              vessel={project.vessels} 
              projectId={resolvedParams.id}
            />
          )}
        </div>
      </div>

      {showComponentForm && (
        <ComponentWorkForm
          projectId={resolvedParams.id}
          task={editingTask}
          onClose={() => { setShowComponentForm(false); setEditingTask(null); }}
        />
      )}

      {showExpenseForm && (
        <ExpenseForm
          projectId={resolvedParams.id}
          expense={editingExpense}
          onClose={() => { setShowExpenseForm(false); setEditingExpense(null); }}
        />
      )}
    </div>
  )
}

// Component Work Form
function ComponentWorkForm({ projectId, task, onClose }: { projectId: string, task?: any, onClose: () => void }) {
  const [formData, setFormData] = useState({
    component_type: task?.component_type || 'engine' as ComponentType,
    repair_type: task?.repair_type || 'maintenance' as RepairType,
    task_name: task?.task_name || '',
    manufacturer: task?.manufacturer || '',
    model: task?.model || '',
    year: task?.year || '',
    description: task?.description || '',
    estimated_cost: task?.estimated_cost || '',
    actual_cost: task?.actual_cost || '',
    company_id: task?.company_id || '',
    status: task?.status || 'pending'
  })

  const queryClient = useQueryClient()
  const supabase = createClient()

  // Fetch companies for dropdown
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, type')
        .order('name', { ascending: true })
      if (error) throw error
      return data
    }
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (task?.id) {
        // Update existing task
        const { error } = await supabase
          .from('overhaul_tasks')
          .update({
            ...data,
            estimated_cost: data.estimated_cost ? parseFloat(data.estimated_cost) : null,
            actual_cost: data.actual_cost ? parseFloat(data.actual_cost) : null,
            year: data.year ? parseInt(data.year) : null
          })
          .eq('id', task.id)
        if (error) throw error

        // If task is being marked as completed, auto-create expense
        if (data.status === 'completed' && task.status !== 'completed') {
          const expenseAmount = data.actual_cost || data.estimated_cost
          if (expenseAmount) {
            const { error: expenseError } = await supabase
              .from('expenses')
              .insert([{
                project_id: projectId,
                project_type: 'vessel',
                company_id: data.company_id || null,
                date: new Date().toISOString().split('T')[0],
                category: data.repair_type || 'maintenance',
                description: `${data.component_type?.replace('_', ' ')} - ${data.task_name}${data.actual_cost ? ' (Completed)' : ' (Auto-generated)'}`,
                amount: parseFloat(expenseAmount),
                status: 'paid'
              }])
            if (expenseError) console.error('Failed to create expense:', expenseError)
          }
        }
      } else {
        // Insert new task
        const { error } = await supabase
          .from('overhaul_tasks')
          .insert([{
            project_id: projectId,
            ...data,
            estimated_cost: data.estimated_cost ? parseFloat(data.estimated_cost) : null,
            actual_cost: data.actual_cost ? parseFloat(data.actual_cost) : null,
            year: data.year ? parseInt(data.year) : null
          }])
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overhaul_tasks', projectId] })
      queryClient.invalidateQueries({ queryKey: ['overhaul_expenses', projectId] })
      onClose()
    }
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">{task ? 'Edit' : 'Add'} Component Work</h2>
          
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData) }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Component Type *</label>
                <select
                  required
                  value={formData.component_type}
                  onChange={(e) => setFormData({ ...formData, component_type: e.target.value as ComponentType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="engine">Engine</option>
                  <option value="generator">Generator</option>
                  <option value="radio_equipment">Radio Equipment</option>
                  <option value="navigation_equipment">Navigation Equipment</option>
                  <option value="hull">Hull</option>
                  <option value="propeller_shaft">Propeller/Shaft</option>
                  <option value="safety_equipment">Safety Equipment</option>
                  <option value="accommodation">Accommodation</option>
                  <option value="reclassification">Reclassification</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Type *</label>
                <select
                  required
                  value={formData.repair_type}
                  onChange={(e) => setFormData({ ...formData, repair_type: e.target.value as RepairType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="top_overhaul">Top Overhaul</option>
                  <option value="major_overhaul">Major Overhaul</option>
                  <option value="complete_replacement">Complete Replacement</option>
                  <option value="repair">Repair</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inspection">Inspection</option>
                  <option value="upgrade">Upgrade</option>
                  <option value="reclassification">Reclassification</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Description *</label>
                <input
                  type="text"
                  required
                  value={formData.task_name}
                  onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                  placeholder="e.g., Main Engine Major Overhaul"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="e.g., Caterpillar, Cummins"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g., 3516, QSK60"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="e.g., 2015"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost (AED) *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.estimated_cost}
                  onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Planned budget amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contractor/Vendor List</label>
                <select
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Contractor/Vendor (Optional)</option>
                  {companies?.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              {formData.status === 'completed' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Actual Cost (AED) <span className="text-xs text-gray-500">- Amount actually paid</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.actual_cost}
                    onChange={(e) => setFormData({ ...formData, actual_cost: e.target.value })}
                    placeholder="Leave empty to use estimated cost"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 An expense will be automatically created when you mark this as completed
                  </p>
                </div>
              )}

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Details</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Detailed description of work to be performed..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {mutation.isPending ? 'Saving...' : (task ? 'Update Work Item' : 'Add Work Item')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Expense Form
function ExpenseForm({ projectId, expense, onClose }: { projectId: string, expense?: any, onClose: () => void }) {
  const [formData, setFormData] = useState({
    date: expense?.date || new Date().toISOString().split('T')[0],
    category: expense?.category || '',
    description: expense?.description || '',
    amount: expense?.amount || '',
    company_id: expense?.company_id || '',
    payment_method: expense?.payment_method || 'bank_transfer',
    status: expense?.status || 'paid',
    paid_by_owner_id: expense?.paid_by_owner_id || ''
  })

  const [paymentSplits, setPaymentSplits] = useState<any[]>([])

  const queryClient = useQueryClient()
  const supabase = createClient()

  // Fetch companies for dropdown
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, type')
        .order('name', { ascending: true })
      if (error) throw error
      return data
    }
  })

  // Fetch owners for payment splits
  const { data: owners = [] } = useQuery({
    queryKey: ['owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owners')
        .select('id, name')
        .eq('status', 'active')
        .order('name')
      if (error) throw error
      return data || []
    }
  })

  // Fetch existing payment splits when editing
  const { data: existingSplits = [] } = useQuery({
    queryKey: ['payment_splits', expense?.id],
    enabled: !!expense?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_splits')
        .select('*, owners(name)')
        .eq('expense_id', expense.id)
      if (error) throw error
      return (data || []).map(split => ({
        owner_id: split.owner_id,
        owner_name: (split.owners as any)?.name,
        amount_paid: split.amount_paid
      }))
    }
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      let expenseId = expense?.id

      if (expense?.id) {
        // Update existing expense - exclude project_id and project_type
        const { project_id, project_type, paymentSplits, ...updateData } = data
        const { error } = await supabase
          .from('expenses')
          .update({
            ...updateData,
            amount: parseFloat(updateData.amount)
          })
          .eq('id', expense.id)
        if (error) throw error
      } else {
        // Insert new expense
        const { paymentSplits, ...expenseData } = data
        const { data: result, error } = await supabase
          .from('expenses')
          .insert([{
            project_id: projectId,
            project_type: 'vessel',
            ...expenseData,
            amount: parseFloat(expenseData.amount)
          }])
          .select()
        if (error) throw error
        expenseId = result[0].id
      }

      // Handle payment splits
      if (data.paymentSplits && data.paymentSplits.length > 0 && expenseId) {
        // Delete existing splits
        await supabase
          .from('payment_splits')
          .delete()
          .eq('expense_id', expenseId)

        // Insert new splits
        const splitsData = data.paymentSplits.map((split: any) => ({
          expense_id: expenseId,
          owner_id: split.owner_id,
          amount_paid: split.amount_paid,
          payment_date: data.date
        }))

        const { error: splitsError } = await supabase
          .from('payment_splits')
          .insert(splitsData)
        if (splitsError) throw splitsError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overhaul_expenses', projectId] })
      queryClient.invalidateQueries({ queryKey: ['vessel_overhaul_project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['payment_splits'] })
      queryClient.invalidateQueries({ queryKey: ['owner_equity_summary'] })
      onClose()
    }
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">{expense ? 'Edit' : 'Record'} Expense</h2>
          
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ ...formData, paymentSplits }) }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  <option value="parts">Parts & Materials</option>
                  <option value="labor">Labor</option>
                  <option value="equipment_rental">Equipment Rental</option>
                  <option value="contractor">Contractor Services</option>
                  <option value="inspection">Inspection Fees</option>
                  <option value="certification">Certification</option>
                  <option value="transportation">Transportation</option>
                  <option value="accommodation">Accommodation</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (AED) *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contractor/Vendor List</label>
                <select
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Contractor/Vendor (Optional)</option>
                  {companies?.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                <select
                  required
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="credit_card">Credit Card</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status *</label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Payment Information */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold mb-3">Payment Information</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paid By (Single Owner)
                </label>
                <select
                  value={formData.paid_by_owner_id}
                  onChange={(e) => setFormData({ ...formData, paid_by_owner_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Owner (if single payer) --</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty if using split payments below
                </p>
              </div>

              {formData.amount && parseFloat(formData.amount) > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Split Payments (Optional)
                  </label>
                  <PaymentSplitsInput
                    owners={owners}
                    totalAmount={parseFloat(formData.amount)}
                    existingSplits={existingSplits}
                    onChange={setPaymentSplits}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use this if multiple owners are contributing to this expense
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {mutation.isPending ? 'Saving...' : (expense ? 'Update Expense' : 'Add Expense')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Vessel Reclassification Form
function VesselReclassificationForm({ vessel, projectId }: { vessel: any, projectId: string }) {
  const [formData, setFormData] = useState({
    new_classification: vessel?.classification || '',
    new_tonnage: vessel?.tonnage || '',
    new_capacity: vessel?.capacity || '',
    classification_date: new Date().toISOString().split('T')[0],
    certification_body: '',
    certificate_number: '',
    notes: ''
  })

  const supabase = createClient()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      // Update vessel information
      const { error } = await supabase
        .from('vessels')
        .update({
          classification: data.new_classification,
          tonnage: data.new_tonnage ? parseFloat(data.new_tonnage) : null,
          capacity: data.new_capacity ? parseFloat(data.new_capacity) : null
        })
        .eq('id', vessel.id)
      
      if (error) throw error

      // Record reclassification task
      await supabase
        .from('overhaul_tasks')
        .insert([{
          project_id: projectId,
          component_type: 'reclassification',
          repair_type: 'reclassification',
          task_name: `Vessel Reclassification - ${data.new_classification}`,
          description: `Classification Body: ${data.certification_body}\nCertificate: ${data.certificate_number}\n${data.notes}`,
          status: 'completed',
          estimated_cost: 0
        }])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_overhaul_project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['overhaul_tasks', projectId] })
      alert('Vessel reclassification updated successfully!')
    }
  })

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <Ship className="h-5 w-5 text-blue-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Vessel Reclassification</h3>
            <p className="text-sm text-blue-700 mt-1">
              Update vessel classification, tonnage, and capacity after overhaul completion
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Vessel Information</h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">Classification:</dt>
            <dd className="text-gray-900">{vessel?.classification || 'Not set'}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Tonnage:</dt>
            <dd className="text-gray-900">{vessel?.tonnage || 'Not set'}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData) }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Classification *</label>
            <input
              type="text"
              required
              value={formData.new_classification}
              onChange={(e) => setFormData({ ...formData, new_classification: e.target.value })}
              placeholder="e.g., Class A, Lloyd's Register"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Tonnage</label>
            <input
              type="number"
              step="0.01"
              value={formData.new_tonnage}
              onChange={(e) => setFormData({ ...formData, new_tonnage: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Capacity</label>
            <input
              type="number"
              step="0.01"
              value={formData.new_capacity}
              onChange={(e) => setFormData({ ...formData, new_capacity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Classification Date *</label>
            <input
              type="date"
              required
              value={formData.classification_date}
              onChange={(e) => setFormData({ ...formData, classification_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Certification Body *</label>
            <input
              type="text"
              required
              value={formData.certification_body}
              onChange={(e) => setFormData({ ...formData, certification_body: e.target.value })}
              placeholder="e.g., Lloyd's Register, DNV GL"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Number *</label>
            <input
              type="text"
              required
              value={formData.certificate_number}
              onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Additional notes about the reclassification..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Updating...' : 'Update Vessel Classification'}
          </button>
        </div>
      </form>
    </div>
  )
}
