'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, use } from 'react'
import { Plus, Edit2, Trash2, BookOpen, Anchor, Navigation, Wrench, Droplets, Users as UsersIcon, Cloud, AlertTriangle, FileText } from 'lucide-react'

const LOG_TYPES = [
  { value: 'departure', label: 'Departure', icon: Navigation },
  { value: 'arrival', label: 'Arrival', icon: Anchor },
  { value: 'navigation', label: 'Navigation', icon: Navigation },
  { value: 'maintenance', label: 'Maintenance', icon: Wrench },
  { value: 'fuel', label: 'Fuel/Bunker', icon: Droplets },
  { value: 'crew_change', label: 'Crew Change', icon: UsersIcon },
  { value: 'weather', label: 'Weather', icon: Cloud },
  { value: 'incident', label: 'Incident', icon: AlertTriangle },
  { value: 'general', label: 'General', icon: FileText }
]

export default function VesselLogsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [showLogForm, setShowLogForm] = useState(false)
  const [editingLog, setEditingLog] = useState<any>(null)
  const [filterType, setFilterType] = useState<string>('all')
  
  const queryClient = useQueryClient()
  const supabase = createClient()

  // Vessel Log Entries Query (from new schema)
  const { data: logEntries } = useQuery({
    queryKey: ['vessel_log_entries', resolvedParams.id, filterType],
    queryFn: async () => {
      let query = supabase
        .from('vessel_log_entries')
        .select('*, employees(full_name)')
        .eq('vessel_id', resolvedParams.id)
      
      if (filterType !== 'all') {
        query = query.eq('log_type', filterType)
      }
      
      const { data, error } = await query.order('log_date', { ascending: false })
      
      if (error) {
        console.error('Vessel logs error:', error)
        return []
      }
      return data
    }
  })

  // Delete Log Entry
  const deleteLogEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vessel_log_entries')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_log_entries', resolvedParams.id] })
    }
  })

  const totalLogs = logEntries?.length || 0
  const todayLogs = logEntries?.filter(log => {
    const logDate = new Date(log.log_date).toDateString()
    const today = new Date().toDateString()
    return logDate === today
  }).length || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vessel Logs</h1>
          <p className="text-gray-600">Comprehensive vessel log book for all operations and events</p>
        </div>
        <button
          onClick={() => {
            setEditingLog(null)
            setShowLogForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          New Log Entry
        </button>
      </div>

      {!logEntries ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800 font-medium mb-2">⚠️ Database Schema Required</p>
          <p className="text-yellow-700">
            The <code className="bg-yellow-100 px-2 py-1 rounded">vessel_log_entries</code> table doesn't exist yet. 
            Please run <code className="bg-yellow-100 px-2 py-1 rounded">vessel-operations-schema.sql</code> in Supabase SQL Editor.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Log Entries</p>
                  <p className="text-2xl font-bold text-gray-900">{totalLogs}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Today's Entries</p>
                  <p className="text-2xl font-bold text-gray-900">{todayLogs}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <Navigation className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Log Types</p>
                  <p className="text-2xl font-bold text-gray-900">{LOG_TYPES.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filter by Log Type */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Filter:</span>
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  filterType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Logs
              </button>
              {LOG_TYPES.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.value}
                    onClick={() => setFilterType(type.value)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium ${
                      filterType === type.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {type.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Log Entries Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {filterType === 'all' ? 'All Log Entries' : `${LOG_TYPES.find(t => t.value === filterType)?.label} Logs`}
              </h2>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Logged By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logEntries?.map((log) => {
                      const logType = LOG_TYPES.find(t => t.value === log.log_type)
                      const Icon = logType?.icon || FileText
                      
                      return (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div>
                              <p className="font-medium">{new Date(log.log_date).toLocaleDateString()}</p>
                              <p className="text-xs text-gray-500">
                                {log.log_time ? new Date(`2000-01-01T${log.log_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No time'}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-gray-500" />
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                {logType?.label || log.log_type}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{log.title}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                            <p className="line-clamp-2">{log.description || 'No description'}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {log.location || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {log.employees 
                              ? log.employees.full_name
                              : log.logged_by_name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingLog(log)
                                  setShowLogForm(true)
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Delete this log entry?')) {
                                    deleteLogEntry.mutate(log.id)
                                  }
                                }}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {logEntries?.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No log entries yet. Click "New Log Entry" to start logging vessel operations.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Log Types Reference */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Log Type Reference</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {LOG_TYPES.map((type) => {
                const Icon = type.icon
                return (
                  <div key={type.value} className="flex items-center gap-2 text-sm">
                    <Icon className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-700">{type.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* TODO: Add Log Entry Form Modal */}
    </div>
  )
}
