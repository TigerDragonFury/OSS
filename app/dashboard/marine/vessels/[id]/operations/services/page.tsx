'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Calendar, AlertTriangle, Check } from 'lucide-react'

export default function ServiceSchedulesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [showForm, setShowForm] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null)
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

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['service_schedules', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_service_schedules')
        .select('*')
        .eq('vessel_id', resolvedParams.id)
        .order('next_service_date', { ascending: true })
      if (error) throw error
      return data
    }
  })

  if (!vessel) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  }

  const activeSchedules = schedules?.filter(s => s.status === 'active') || []
  const overdueSchedules = schedules?.filter(s => {
    const nextDate = new Date(s.next_service_date)
    return s.status === 'active' && nextDate < new Date()
  }) || []
  const upcomingSchedules = schedules?.filter(s => {
    const nextDate = new Date(s.next_service_date)
    const in30Days = new Date()
    in30Days.setDate(in30Days.getDate() + 30)
    return s.status === 'active' && nextDate >= new Date() && nextDate <= in30Days
  }) || []

  const frequencyTypeLabels:{ [key: string]: string } = {
    hours: 'Operating Hours',
    days: 'Days',
    weeks: 'Weeks',
    months: 'Months',
    years: 'Years'
  }

  return (
    <div className="space-y-6">
      <Link href={`/dashboard/marine/vessels/${vessel.id}/operations`} className="inline-flex items-center text-blue-600 hover:text-blue-700">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Operations
      </Link>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Service Schedules</h1>
            <p className="text-gray-600 mt-1">{vessel.name} - Automated maintenance scheduling</p>
          </div>
          <button
            onClick={() => { setSelectedSchedule(null); setShowForm(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Schedule
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Active Schedules</p>
            <p className="text-3xl font-bold text-blue-900 mt-2">{activeSchedules.length}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-red-600 font-medium">Overdue</p>
            <p className="text-3xl font-bold text-red-900 mt-2">{overdueSchedules.length}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-yellow-600 font-medium">Due within 30 days</p>
            <p className="text-3xl font-bold text-yellow-900 mt-2">{upcomingSchedules.length}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Overdue Services */}
          {overdueSchedules.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <h2 className="text-lg font-semibold text-red-900">Overdue Services ({overdueSchedules.length})</h2>
              </div>
              <div className="space-y-3">
                {overdueSchedules.map((schedule) => (
                  <div key={schedule.id} className="bg-white rounded-lg p-4 shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">{schedule.service_type}</h3>
                        <p className="text-sm text-gray-600 mt-1">{schedule.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-red-600 font-medium">
                            Due: {new Date(schedule.next_service_date).toLocaleDateString()}
                          </span>
                          <span className="text-gray-600">
                            Every {schedule.frequency_value} {frequencyTypeLabels[schedule.frequency_type]}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => { setSelectedSchedule(schedule); setShowForm(true); }}
                        className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Services */}
          {upcomingSchedules.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Upcoming Services (Next 30 Days)</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {upcomingSchedules.map((schedule) => (
                  <div key={schedule.id} className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{schedule.service_type}</h3>
                        <p className="text-sm text-gray-600 mt-1">{schedule.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                          <div>
                            <p className="text-gray-600">Next Service</p>
                            <p className="font-medium text-yellow-600">{new Date(schedule.next_service_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Last Service</p>
                            <p className="font-medium">{schedule.last_service_date ? new Date(schedule.last_service_date).toLocaleDateString() : 'Never'}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Frequency</p>
                            <p className="font-medium">Every {schedule.frequency_value} {frequencyTypeLabels[schedule.frequency_type]}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Estimated Cost</p>
                            <p className="font-medium">{schedule.estimated_cost?.toLocaleString() || 0} Đ</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={async () => {
                            if (confirm('Mark this service as completed?')) {
                              const today = new Date().toISOString().split('T')[0]
                              const { error } = await supabase
                                .from('vessel_service_schedules')
                                .update({ last_service_date: today, status: 'completed' })
                                .eq('id', schedule.id)
                              if (!error) {
                                // Auto-create expense if estimated cost exists
                                if (schedule.estimated_cost > 0) {
                                  await supabase.from('expenses').insert({
                                    description: `Service Completed: ${schedule.service_type}`,
                                    expense_type: 'service',
                                    category: 'maintenance',
                                    amount: schedule.estimated_cost,
                                    date: today,
                                    project_id: vessel.id,
                                    project_type: 'vessel',
                                    status: 'paid',
                                    vendor_name: schedule.service_provider || null,
                                  })
                                }
                                queryClient.invalidateQueries({ queryKey: ['service_schedules'] })
                                queryClient.invalidateQueries({ queryKey: ['vessel_all_expenses'] })
                                queryClient.invalidateQueries({ queryKey: ['expenses'] })
                              }
                            }
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded flex items-center"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Complete
                        </button>
                        <button
                          onClick={() => { setSelectedSchedule(schedule); setShowForm(true); }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Active Schedules */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Active Schedules</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {activeSchedules.map((schedule) => {
                const isOverdue = new Date(schedule.next_service_date) < new Date()
                const daysUntil = Math.ceil((new Date(schedule.next_service_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                
                return (
                  <div key={schedule.id} className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">{schedule.service_type}</h3>
                          {isOverdue && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              OVERDUE
                            </span>
                          )}
                          {!isOverdue && daysUntil <= 30 && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              DUE SOON
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{schedule.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 text-sm">
                          <div>
                            <p className="text-gray-600">Next Service</p>
                            <p className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                              {new Date(schedule.next_service_date).toLocaleDateString()}
                            </p>
                            {!isOverdue && (
                              <p className="text-xs text-gray-500">in {daysUntil} days</p>
                            )}
                          </div>
                          <div>
                            <p className="text-gray-600">Last Service</p>
                            <p className="font-medium">{schedule.last_service_date ? new Date(schedule.last_service_date).toLocaleDateString() : 'Never'}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Frequency</p>
                            <p className="font-medium">Every {schedule.frequency_value} {frequencyTypeLabels[schedule.frequency_type]}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Est. Cost</p>
                            <p className="font-medium">{schedule.estimated_cost?.toLocaleString() || 0} Đ</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Est. Duration</p>
                            <p className="font-medium">{schedule.estimated_duration_hours || 0} hrs</p>
                          </div>
                        </div>
                        {schedule.service_provider && (
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">Provider:</span> {schedule.service_provider}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={async () => {
                            if (confirm('Mark this service as completed?')) {
                              const today = new Date().toISOString().split('T')[0]
                              const { error } = await supabase
                                .from('vessel_service_schedules')
                                .update({ last_service_date: today, status: 'completed' })
                                .eq('id', schedule.id)
                              if (!error) {
                                if (schedule.estimated_cost > 0) {
                                  await supabase.from('expenses').insert({
                                    description: `Service Completed: ${schedule.service_type}`,
                                    expense_type: 'service',
                                    category: 'maintenance',
                                    amount: schedule.estimated_cost,
                                    date: today,
                                    project_id: vessel.id,
                                    project_type: 'vessel',
                                    status: 'paid',
                                    vendor_name: schedule.service_provider || null,
                                  })
                                }
                                queryClient.invalidateQueries({ queryKey: ['service_schedules'] })
                                queryClient.invalidateQueries({ queryKey: ['vessel_all_expenses'] })
                                queryClient.invalidateQueries({ queryKey: ['expenses'] })
                              }
                            }
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedSchedule(schedule); setShowForm(true); }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {schedules?.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Service Schedules</h3>
              <p className="text-gray-600 mb-6">Set up automated maintenance schedules to stay on top of vessel services</p>
              <button
                onClick={() => { setSelectedSchedule(null); setShowForm(true); }}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 inline-flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create First Schedule
              </button>
            </div>
          )}
        </>
      )}

      {showForm && (
        <ServiceScheduleForm
          schedule={selectedSchedule}
          vesselId={vessel.id}
          onClose={() => { setShowForm(false); setSelectedSchedule(null); }}
        />
      )}
    </div>
  )
}

function ServiceScheduleForm({ schedule, vesselId, onClose }: any) {
  const [formData, setFormData] = useState({
    service_type: schedule?.service_type || '',
    description: schedule?.description || '',
    frequency_type: schedule?.frequency_type || 'months',
    frequency_value: schedule?.frequency_value || '',
    last_service_date: schedule?.last_service_date || '',
    estimated_cost: schedule?.estimated_cost || '',
    estimated_duration_hours: schedule?.estimated_duration_hours || '',
    service_provider: schedule?.service_provider || '',
    parts_needed: schedule?.parts_needed || '',
    notes: schedule?.notes || '',
    status: schedule?.status || 'active'
  })

  const queryClient = useQueryClient()
  const supabase = createClient()

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const isNewCompletion = data.status === 'completed' && (!schedule || schedule.status !== 'completed')

      if (schedule) {
        const { error } = await supabase
          .from('vessel_service_schedules')
          .update({ ...data, last_service_date: isNewCompletion ? new Date().toISOString().split('T')[0] : data.last_service_date })
          .eq('id', schedule.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('vessel_service_schedules')
          .insert([{ ...data, vessel_id: vesselId }])
        if (error) throw error
      }

      // Auto-create expense when completing a schedule with a cost
      if (isNewCompletion && parseFloat(data.estimated_cost) > 0) {
        await supabase.from('expenses').insert({
          description: `Service Completed: ${data.service_type}`,
          expense_type: 'service',
          category: 'maintenance',
          amount: parseFloat(data.estimated_cost),
          date: new Date().toISOString().split('T')[0],
          project_id: vesselId,
          project_type: 'vessel',
          status: 'paid',
          vendor_name: data.service_provider || null,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_schedules', vesselId] })
      queryClient.invalidateQueries({ queryKey: ['vessel_all_expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      onClose()
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      ...formData,
      frequency_value: parseInt(formData.frequency_value),
      estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
      estimated_duration_hours: formData.estimated_duration_hours ? parseFloat(formData.estimated_duration_hours) : null,
      last_service_date: formData.last_service_date || null
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">{schedule ? 'Edit' : 'Create'} Service Schedule</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Type *</label>
              <input
                type="text"
                required
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Engine Oil Change, Hull Inspection"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency Type *</label>
                <select
                  required
                  value={formData.frequency_type}
                  onChange={(e) => setFormData({ ...formData, frequency_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="hours">Operating Hours</option>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Every (Number) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.frequency_value}
                  onChange={(e) => setFormData({ ...formData, frequency_value: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 3"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Service Date</label>
              <input
                type="date"
                value={formData.last_service_date}
                onChange={(e) => setFormData({ ...formData, last_service_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty if never serviced. Next service date will be calculated automatically.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost (Đ)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.estimated_cost}
                  onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Est. Duration (Hours)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.estimated_duration_hours}
                  onChange={(e) => setFormData({ ...formData, estimated_duration_hours: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Provider</label>
              <input
                type="text"
                value={formData.service_provider}
                onChange={(e) => setFormData({ ...formData, service_provider: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Company or person performing service"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parts Needed</label>
              <textarea
                value={formData.parts_needed}
                onChange={(e) => setFormData({ ...formData, parts_needed: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="List of parts required for this service"
              />
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
                <option value="suspended">Suspended</option>
              </select>
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
                {mutation.isPending ? 'Saving...' : schedule ? 'Update Schedule' : 'Create Schedule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
