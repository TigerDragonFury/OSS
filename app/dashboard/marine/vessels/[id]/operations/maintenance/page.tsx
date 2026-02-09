'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Clock, User, AlertCircle, Check, X } from 'lucide-react'

export default function VesselMaintenancePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [showForm, setShowForm] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<any>(null)
  const [showTimeLog, setShowTimeLog] = useState(false)
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

  const { data: issues, isLoading } = useQuery({
    queryKey: ['maintenance_issues', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_maintenance_issues')
        .select(`
          *,
          reported_by_employee:employees!vessel_maintenance_issues_reported_by_fkey(full_name),
          assigned_to_employee:employees!vessel_maintenance_issues_assigned_to_fkey(full_name)
        `)
        .eq('vessel_id', resolvedParams.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: employees } = useQuery({
    queryKey: ['employees_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, position')
        .eq('status', 'active')
        .order('full_name')
      if (error) throw error
      return data
    }
  })

  if (!vessel) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  }

  const statusColors: { [key: string]: { bg: string, text: string } } = {
    reported: { bg: 'bg-blue-100', text: 'text-blue-800' },
    assigned: { bg: 'bg-purple-100', text: 'text-purple-800' },
    in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    parts_ordered: { bg: 'bg-orange-100', text: 'text-orange-800' },
    completed: { bg: 'bg-green-100', text: 'text-green-800' },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-800' }
  }

  const priorityColors: { [key: string]: { bg: string, text: string } } = {
    critical: { bg: 'bg-red-100', text: 'text-red-800' },
    high: { bg: 'bg-orange-100', text: 'text-orange-800' },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    low: { bg: 'bg-green-100', text: 'text-green-800' }
  }

  const openIssues = issues?.filter(i => !['completed', 'cancelled'].includes(i.status)) || []
  const closedIssues = issues?.filter(i => ['completed', 'cancelled'].includes(i.status)) || []

  return (
    <div className="space-y-6">
      <Link href={`/dashboard/marine/vessels/${vessel.id}/operations`} className="inline-flex items-center text-blue-600 hover:text-blue-700">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Operations
      </Link>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Maintenance Issues</h1>
            <p className="text-gray-600 mt-1">{vessel.name} - Track maintenance work orders and repairs</p>
          </div>
          <button
            onClick={() => { setSelectedIssue(null); setShowForm(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Report Issue
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Open Issues</p>
            <p className="text-3xl font-bold text-blue-900 mt-2">{openIssues.length}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-yellow-600 font-medium">In Progress</p>
            <p className="text-3xl font-bold text-yellow-900 mt-2">
              {issues?.filter(i => i.status === 'in_progress').length || 0}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">Completed</p>
            <p className="text-3xl font-bold text-green-900 mt-2">
              {issues?.filter(i => i.status === 'completed').length || 0}
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-purple-600 font-medium">Total Cost</p>
            <p className="text-3xl font-bold text-purple-900 mt-2">
              {issues?.reduce((sum, i) => sum + (i.total_cost || 0), 0).toLocaleString()} AED
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Open Issues */}
          {openIssues.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Open Issues ({openIssues.length})</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {openIssues.map((issue) => (
                  <div key={issue.id} className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">{issue.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${priorityColors[issue.priority].bg} ${priorityColors[issue.priority].text}`}>
                            {issue.priority?.toUpperCase()}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[issue.status].bg} ${statusColors[issue.status].text}`}>
                            {issue.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">{issue.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                          <div>
                            <p className="text-gray-600">Issue #</p>
                            <p className="font-medium">{issue.issue_number}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Category</p>
                            <p className="font-medium capitalize">{issue.category || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Location</p>
                            <p className="font-medium">{issue.location_on_vessel || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Reported</p>
                            <p className="font-medium">{new Date(issue.reported_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Reported By</p>
                            <p className="font-medium">{issue.reported_by_employee?.full_name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Assigned To</p>
                            <p className="font-medium">{issue.assigned_to_employee?.full_name || 'Unassigned'}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Est. Hours</p>
                            <p className="font-medium">{issue.estimated_hours || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Total Cost</p>
                            <p className="font-semibold text-red-600">{issue.total_cost?.toLocaleString() || 0} AED</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => { setSelectedIssue(issue); setShowForm(true); }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => { setSelectedIssue(issue); setShowTimeLog(true); }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded flex items-center"
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Log Time
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Closed Issues */}
          {closedIssues.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Closed Issues ({closedIssues.length})</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {closedIssues.slice(0, 10).map((issue) => (
                  <div key={issue.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{issue.title}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[issue.status].bg} ${statusColors[issue.status].text}`}>
                            {issue.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {issue.issue_number} • Completed {issue.completed_date ? new Date(issue.completed_date).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{issue.total_cost?.toLocaleString() || 0} AED</p>
                        <p className="text-xs text-gray-500">{issue.actual_hours || 0} hrs</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {issues?.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Maintenance Issues</h3>
              <p className="text-gray-600 mb-6">Get started by reporting your first maintenance issue</p>
              <button
                onClick={() => { setSelectedIssue(null); setShowForm(true); }}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 inline-flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Report First Issue
              </button>
            </div>
          )}
        </>
      )}

      {showForm && (
        <MaintenanceIssueForm
          issue={selectedIssue}
          vesselId={vessel.id}
          employees={employees || []}
          onClose={() => { setShowForm(false); setSelectedIssue(null); }}
        />
      )}

      {showTimeLog && selectedIssue && (
        <TimeLogModal
          issue={selectedIssue}
          employees={employees || []}
          onClose={() => { setShowTimeLog(false); setSelectedIssue(null); }}
        />
      )}
    </div>
  )
}

function MaintenanceIssueForm({ issue, vesselId, employees, onClose }: any) {
  const [formData, setFormData] = useState({
    title: issue?.title || '',
    description: issue?.description || '',
    category: issue?.category || 'other',
    priority: issue?.priority || 'medium',
    status: issue?.status || 'reported',
    assigned_to: issue?.assigned_to || '',
    location_on_vessel: issue?.location_on_vessel || '',
    estimated_hours: issue?.estimated_hours || '',
    labor_cost: issue?.labor_cost || '',
    parts_cost: issue?.parts_cost || '',
    notes: issue?.notes || ''
  })

  const queryClient = useQueryClient()
  const supabase = createClient()

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      // Auto-generate issue number if new
      if (!issue) {
        const { data: lastIssue } = await supabase
          .from('vessel_maintenance_issues')
          .select('issue_number')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        
        const lastNum = lastIssue?.issue_number ? parseInt(lastIssue.issue_number.split('-')[1]) : 0
        data.issue_number = `MNT-${String(lastNum + 1).padStart(5, '0')}`
        data.vessel_id = vesselId
      }

      if (issue) {
        const { error } = await supabase
          .from('vessel_maintenance_issues')
          .update(data)
          .eq('id', issue.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('vessel_maintenance_issues')
          .insert([data])
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_issues', vesselId] })
      onClose()
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      ...formData,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
      labor_cost: formData.labor_cost ? parseFloat(formData.labor_cost) : null,
      parts_cost: formData.parts_cost ? parseFloat(formData.parts_cost) : null,
      assigned_to: formData.assigned_to || null
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">{issue ? 'Edit' : 'Report'} Maintenance Issue</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="engine">Engine</option>
                  <option value="electrical">Electrical</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="hull">Hull</option>
                  <option value="deck">Deck</option>
                  <option value="navigation">Navigation</option>
                  <option value="safety">Safety</option>
                  <option value="hvac">HVAC</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="reported">Reported</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="parts_ordered">Parts Ordered</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Unassigned</option>
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} - {emp.position}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location on Vessel</label>
              <input
                type="text"
                value={formData.location_on_vessel}
                onChange={(e) => setFormData({ ...formData, location_on_vessel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Engine Room, Main Deck, Bridge"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Est. Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Labor Cost (AED)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.labor_cost}
                  onChange={(e) => setFormData({ ...formData, labor_cost: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parts Cost (AED)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.parts_cost}
                  onChange={(e) => setFormData({ ...formData, parts_cost: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
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
                {mutation.isPending ? 'Saving...' : issue ? 'Update Issue' : 'Create Issue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function TimeLogModal({ issue, employees, onClose }: any) {
  const [formData, setFormData] = useState({
    employee_id: '',
    work_date: new Date().toISOString().split('T')[0],
    hours_worked: '',
    work_description: ''
  })

  const queryClient = useQueryClient()
  const supabase = createClient()

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('maintenance_time_logs')
        .insert([{
          maintenance_issue_id: issue.id,
          ...data,
          hours_worked: parseFloat(data.hours_worked)
        }])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_issues'] })
      onClose()
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.employee_id || !formData.hours_worked) {
      alert('Please select employee and enter hours worked')
      return
    }
    mutation.mutate(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Log Time - {issue.issue_number}</h2>
          <p className="text-sm text-gray-600 mb-6">{issue.title}</p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
              <select
                required
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Employee</option>
                {employees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Date *</label>
              <input
                type="date"
                required
                value={formData.work_date}
                onChange={(e) => setFormData({ ...formData, work_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hours Worked *</label>
              <input
                type="number"
                required
                step="0.25"
                min="0"
                value={formData.hours_worked}
                onChange={(e) => setFormData({ ...formData, hours_worked: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 2.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Description</label>
              <textarea
                value={formData.work_description}
                onChange={(e) => setFormData({ ...formData, work_description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="What work was done?"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
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
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {mutation.isPending ? 'Logging...' : 'Log Time'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
