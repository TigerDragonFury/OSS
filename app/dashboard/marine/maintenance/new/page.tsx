'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Calendar, Wrench } from 'lucide-react'
import Link from 'next/link'

export default function NewMaintenancePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    vessel_id: '',
    maintenance_type: 'routine',
    description: '',
    scheduled_date: '',
    estimated_cost: '',
    priority: 'medium',
    notes: ''
  })

  // Fetch vessels
  const { data: vessels = [] } = useQuery({
    queryKey: ['vessels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessels')
        .select('id, name, vessel_type')
        .eq('status', 'active')
        .order('name')
      
      if (error) throw error
      return data || []
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('maintenance_schedules')
        .insert([{
          vessel_id: formData.vessel_id,
          maintenance_type: formData.maintenance_type,
          description: formData.description,
          scheduled_date: formData.scheduled_date,
          estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
          priority: formData.priority,
          status: 'scheduled',
          notes: formData.notes
        }])

      if (error) throw error

      alert('Maintenance scheduled successfully!')
      router.push('/dashboard/marine/maintenance')
    } catch (error: any) {
      console.error('Error scheduling maintenance:', error)
      alert('Error scheduling maintenance: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/marine/maintenance"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schedule Maintenance</h1>
          <p className="text-gray-600 mt-1">Create a new maintenance schedule for a vessel</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Vessel Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vessel <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.vessel_id}
            onChange={(e) => setFormData({ ...formData, vessel_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a vessel</option>
            {vessels.map((vessel) => (
              <option key={vessel.id} value={vessel.id}>
                {vessel.name} - {vessel.vessel_type}
              </option>
            ))}
          </select>
        </div>

        {/* Maintenance Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maintenance Type <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.maintenance_type}
            onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="routine">Routine</option>
            <option value="repair">Repair</option>
            <option value="inspection">Inspection</option>
            <option value="emergency">Emergency</option>
            <option value="upgrade">Upgrade</option>
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe the maintenance work to be performed..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Scheduled Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scheduled Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Estimated Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Cost
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.estimated_cost}
              onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Any additional information, special requirements, or contractor details..."
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Link
            href="/dashboard/marine/maintenance"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Wrench className="h-4 w-4" />
            {loading ? 'Scheduling...' : 'Schedule Maintenance'}
          </button>
        </div>
      </form>
    </div>
  )
}
