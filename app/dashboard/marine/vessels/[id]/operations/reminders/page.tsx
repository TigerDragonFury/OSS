'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthContext'
import { hasModulePermission } from '@/lib/auth/rolePermissions'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, use } from 'react'
import { Plus, Edit2, Trash2, Bell, Calendar, CheckCircle, AlertCircle } from 'lucide-react'

const REMINDER_TYPES = [
  'Certification Renewal',
  'Survey Due',
  'Inspection',
  'Drydock',
  'Maintenance',
  'Insurance Renewal',
  'Crew License Expiry',
  'Contract Expiry',
  'Other'
]

export default function RemindersPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [showReminderForm, setShowReminderForm] = useState(false)
  const [editingReminder, setEditingReminder] = useState<any>(null)
  
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { user } = useAuth()
  
  // Get user role and permissions
  const userRole = user?.role || user?.roles?.[0] || 'storekeeper'
  const canEdit = hasModulePermission(userRole, ['marine', 'vessels'], 'edit')
  const canDelete = hasModulePermission(userRole, ['marine', 'vessels'], 'delete')
  const canCreate = hasModulePermission(userRole, ['marine', 'vessels'], 'create')

  // Vessel Reminders Query (from new schema)
  const { data: reminders } = useQuery({
    queryKey: ['vessel_reminders', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_reminders')
        .select('*')
        .eq('vessel_id', resolvedParams.id)
        .order('due_date', { ascending: true })
      if (error) {
        console.error('Vessel reminders error:', error)
        return []
      }
      return data
    }
  })

  // Delete Reminder
  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vessel_reminders')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_reminders', resolvedParams.id] })
    }
  })

  // Complete Reminder
  const completeReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vessel_reminders')
        .update({ 
          status: 'completed',
          completion_date: new Date().toISOString()
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_reminders', resolvedParams.id] })
    }
  })

  const activeReminders = reminders?.filter(r => r.status === 'active').length || 0
  const overdueReminders = reminders?.filter(r => 
    r.status === 'active' && new Date(r.due_date) < new Date()
  ).length || 0
  const upcomingReminders = reminders?.filter(r => {
    if (r.status !== 'active') return false
    const dueDate = new Date(r.due_date)
    const now = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    return dueDate >= now && dueDate <= thirtyDaysFromNow
  }).length || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
          <p className="text-gray-600">Track important deadlines, renewals, and upcoming tasks</p>
        </div>
        {canCreate && (
          <button
            onClick={() => {
              setEditingReminder(null)
              setShowReminderForm(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Add Reminder
          </button>
        )}
      </div>

      {!reminders ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800 font-medium mb-2">⚠️ Database Schema Required</p>
          <p className="text-yellow-700">
            The <code className="bg-yellow-100 px-2 py-1 rounded">vessel_reminders</code> table doesn't exist yet. 
            Please run <code className="bg-yellow-100 px-2 py-1 rounded">vessel-operations-schema.sql</code> in Supabase SQL Editor.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <Bell className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Active Reminders</p>
                  <p className="text-2xl font-bold text-gray-900">{activeReminders}</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Upcoming (30 days)</p>
                  <p className="text-2xl font-bold text-orange-600">{upcomingReminders}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{overdueReminders}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Overdue Warning */}
          {overdueReminders > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800 font-medium">
                  You have {overdueReminders} overdue reminder{overdueReminders !== 1 ? 's' : ''} requiring immediate attention!
                </p>
              </div>
            </div>
          )}

          {/* Reminders Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Reminders</h2>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reminder</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Until Due</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reminders?.map((reminder) => {
                      const dueDate = new Date(reminder.due_date)
                      const today = new Date()
                      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                      const isOverdue = daysUntilDue < 0 && reminder.status === 'active'
                      const isUpcoming = daysUntilDue >= 0 && daysUntilDue <= 30 && reminder.status === 'active'
                      
                      return (
                        <tr key={reminder.id} className={`hover:bg-gray-50 ${
                          isOverdue ? 'bg-red-50' : isUpcoming ? 'bg-orange-50' : ''
                        }`}>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{reminder.title}</p>
                              <p className="text-sm text-gray-500">{reminder.description || 'No description'}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                              {reminder.reminder_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                              {dueDate.toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {reminder.status === 'completed' ? (
                              <span className="text-gray-500">-</span>
                            ) : isOverdue ? (
                              <span className="text-red-600 font-semibold">
                                {Math.abs(daysUntilDue)} days overdue
                              </span>
                            ) : (
                              <span className={daysUntilDue <= 7 ? 'text-orange-600 font-semibold' : 'text-gray-900'}>
                                {daysUntilDue} days
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              reminder.priority === 'high' ? 'bg-red-100 text-red-800' :
                              reminder.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {reminder.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              reminder.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {reminder.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {reminder.status === 'active' && (
                                <button
                                  onClick={() => {
                                    if (confirm('Mark this reminder as completed?')) {
                                      completeReminder.mutate(reminder.id)
                                    }
                                  }}
                                  className="text-green-600 hover:text-green-800"
                                  title="Complete"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              )}
                              {canEdit && (
                                <button
                                  onClick={() => {
                                    setEditingReminder(reminder)
                                    setShowReminderForm(true)
                                  }}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => {
                                    if (confirm('Delete this reminder?')) {
                                      deleteReminder.mutate(reminder.id)
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {reminders?.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No reminders set. Click "Add Reminder" to track important deadlines.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reminder Types Reference */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Reminder Types</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {REMINDER_TYPES.map((type) => (
                <div key={type} className="text-sm text-gray-700">• {type}</div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* TODO: Add Reminder Form Modal */}
    </div>
  )
}
