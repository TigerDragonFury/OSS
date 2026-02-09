'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, use } from 'react'
import { Plus, Edit2, Trash2, AlertTriangle, User, Activity, Heart, Shield } from 'lucide-react'

const INCIDENT_TYPES = [
  { value: 'injury', label: 'Personal Injury', icon: User, color: 'red' },
  { value: 'illness', label: 'Illness/Medical', icon: Heart, color: 'orange' },
  { value: 'accident', label: 'Accident/Collision', icon: AlertTriangle, color: 'red' },
  { value: 'near_miss', label: 'Near Miss', icon: Activity, color: 'yellow' },
  { value: 'environmental', label: 'Environmental', icon: Shield, color: 'green' },
  { value: 'security', label: 'Security Breach', icon: Shield, color: 'purple' },
  { value: 'other', label: 'Other', icon: AlertTriangle, color: 'gray' }
]

const SEVERITY_LEVELS = [
  { value: 'minor', label: 'Minor', color: 'yellow' },
  { value: 'moderate', label: 'Moderate', color: 'orange' },
  { value: 'serious', label: 'Serious', color: 'red' },
  { value: 'critical', label: 'Critical', color: 'red' }
]

export default function IncidentReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [showIncidentForm, setShowIncidentForm] = useState(false)
  const [editingIncident, setEditingIncident] = useState<any>(null)
  const [filterType, setFilterType] = useState<string>('all')
  
  const queryClient = useQueryClient()
  const supabase = createClient()

  // Vessel Incident Logs Query (from new schema)
  const { data: incidentLogs } = useQuery({
    queryKey: ['vessel_incident_logs', resolvedParams.id, filterType],
    queryFn: async () => {
      let query = supabase
        .from('vessel_incident_logs')
        .select('*, employees(full_name)')
        .eq('vessel_id', resolvedParams.id)
      
      if (filterType !== 'all') {
        query = query.eq('incident_type', filterType)
      }
      
      const { data, error } = await query.order('incident_date', { ascending: false })
      
      if (error) {
        console.error('Incident logs error:', error)
        return []
      }
      return data
    }
  })

  // Delete Incident Log
  const deleteIncidentLog = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vessel_incident_logs')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_incident_logs', resolvedParams.id] })
    }
  })

  const totalIncidents = incidentLogs?.length || 0
  const criticalIncidents = incidentLogs?.filter(i => i.severity === 'critical' || i.severity === 'serious').length || 0
  const reportedToAuthorities = incidentLogs?.filter(i => i.reported_to_authorities).length || 0
  const medicalTreatment = incidentLogs?.filter(i => i.medical_treatment_required).length || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incident Reports</h1>
          <p className="text-gray-600">Track and report vessel incidents, accidents, and safety events</p>
        </div>
        <button
          onClick={() => {
            setEditingIncident(null)
            setShowIncidentForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <Plus className="h-5 w-5" />
          Report Incident
        </button>
      </div>

      {!incidentLogs ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800 font-medium mb-2">⚠️ Database Schema Required</p>
          <p className="text-yellow-700">
            The <code className="bg-yellow-100 px-2 py-1 rounded">vessel_incident_logs</code> table doesn't exist yet. 
            Please run <code className="bg-yellow-100 px-2 py-1 rounded">vessel-operations-schema.sql</code> in Supabase SQL Editor.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Incidents</p>
                  <p className="text-2xl font-bold text-gray-900">{totalIncidents}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">Critical/Serious</p>
                  <p className="text-2xl font-bold text-red-600">{criticalIncidents}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Reported to Authorities</p>
                  <p className="text-2xl font-bold text-gray-900">{reportedToAuthorities}</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <Heart className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Medical Treatment</p>
                  <p className="text-2xl font-bold text-gray-900">{medicalTreatment}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Critical Incidents Warning */}
          {criticalIncidents > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="text-red-800 font-medium">
                  {criticalIncidents} critical/serious incident{criticalIncidents !== 1 ? 's' : ''} require immediate attention and follow-up!
                </p>
              </div>
            </div>
          )}

          {/* Filter by Incident Type */}
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
                All Incidents
              </button>
              {INCIDENT_TYPES.map((type) => {
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

          {/* Incident Reports Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Incident Reports</h2>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">People Involved</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {incidentLogs?.map((incident) => {
                      const incidentType = INCIDENT_TYPES.find(t => t.value === incident.incident_type)
                      const Icon = incidentType?.icon || AlertTriangle
                      const isCritical = incident.severity === 'critical' || incident.severity === 'serious'
                      
                      return (
                        <tr key={incident.id} className={`hover:bg-gray-50 ${isCritical ? 'bg-red-50' : ''}`}>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div>
                              <p className="font-medium">{new Date(incident.incident_date).toLocaleDateString()}</p>
                              <p className="text-xs text-gray-500">
                                {incident.incident_time ? new Date(`2000-01-01T${incident.incident_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No time'}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-gray-500" />
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                {incidentType?.label || incident.incident_type}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              incident.severity === 'critical' ? 'bg-red-200 text-red-900' :
                              incident.severity === 'serious' ? 'bg-red-100 text-red-800' :
                              incident.severity === 'moderate' ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {incident.severity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                            <p className="line-clamp-2">{incident.description}</p>
                            <div className="flex gap-2 mt-1">
                              {incident.medical_treatment_required && (
                                <span className="text-xs text-orange-600">🏥 Medical</span>
                              )}
                              {incident.reported_to_authorities && (
                                <span className="text-xs text-purple-600">🚨 Reported</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {incident.people_involved || 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              incident.investigation_status === 'closed' ? 'bg-gray-100 text-gray-800' :
                              incident.investigation_status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {incident.investigation_status?.replace('_', ' ') || 'pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingIncident(incident)
                                  setShowIncidentForm(true)
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Delete this incident report? This action cannot be undone.')) {
                                    deleteIncidentLog.mutate(incident.id)
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
                {incidentLogs?.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No incidents reported. This is good news!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Compliance Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Compliance Note:</strong> All incidents, especially those involving injuries, medical treatment, or environmental damage, 
              must be properly documented and reported to relevant authorities as required by maritime regulations.
            </p>
          </div>
        </>
      )}

      {/* TODO: Add Incident Report Form Modal */}
    </div>
  )
}
