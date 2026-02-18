'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthContext'
import { hasModulePermission } from '@/lib/auth/rolePermissions'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, use } from 'react'
import { Plus, Edit2, Trash2, Star, Coffee, UtensilsCrossed, Wine, Music } from 'lucide-react'

export default function GuestPreferencesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [editingGuest, setEditingGuest] = useState<any>(null)
  
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { user } = useAuth()
  
  // Get user role and permissions
  const userRole = user?.role || user?.roles?.[0] || 'storekeeper'
  const canEdit = hasModulePermission(userRole, ['marine', 'vessels'], 'edit')
  const canDelete = hasModulePermission(userRole, ['marine', 'vessels'], 'delete')
  const canCreate = hasModulePermission(userRole, ['marine', 'vessels'], 'create')

  // Vessel Guest Preferences Query (from new schema)
  const { data: guestPreferences } = useQuery({
    queryKey: ['vessel_guest_preferences', resolvedParams.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_guest_preferences')
        .select('*')
        .eq('vessel_id', resolvedParams.id)
        .order('guest_name', { ascending: true })
      if (error) {
        console.error('Guest preferences error:', error)
        return []
      }
      return data
    }
  })

  // Delete Guest Preference
  const deleteGuestPreference = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vessel_guest_preferences')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel_guest_preferences', resolvedParams.id] })
    }
  })

  const totalGuests = guestPreferences?.length || 0
  const vipGuests = guestPreferences?.filter(g => g.vip_status).length || 0
  const withDietaryRestrictions = guestPreferences?.filter(g => g.dietary_restrictions).length || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guest Preferences</h1>
          <p className="text-gray-600">Track guest preferences, dietary needs, and special requirements</p>
        </div>
        <button
          onClick={() => {
            setEditingGuest(null)
            setShowGuestForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Add Guest Profile
        </button>
      </div>

      {!guestPreferences ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800 font-medium mb-2">⚠️ Database Schema Required</p>
          <p className="text-yellow-700">
            The <code className="bg-yellow-100 px-2 py-1 rounded">vessel_guest_preferences</code> table doesn't exist yet. 
            Please run <code className="bg-yellow-100 px-2 py-1 rounded">vessel-operations-schema.sql</code> in Supabase SQL Editor.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <Star className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Guests</p>
                  <p className="text-2xl font-bold text-gray-900">{totalGuests}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <Star className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">VIP Guests</p>
                  <p className="text-2xl font-bold text-gray-900">{vipGuests}</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <UtensilsCrossed className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Dietary Restrictions</p>
                  <p className="text-2xl font-bold text-gray-900">{withDietaryRestrictions}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Guest Profiles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {guestPreferences?.map((guest) => (
              <div key={guest.id} className={`bg-white rounded-lg shadow p-6 ${
                guest.vip_status ? 'border-2 border-purple-300' : ''
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{guest.guest_name}</h3>
                      {guest.vip_status && (
                        <Star className="h-5 w-5 text-purple-600 fill-purple-600" />
                      )}
                    </div>
                    {guest.nationality && (
                      <p className="text-sm text-gray-600">{guest.nationality}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingGuest(guest)
                        setShowGuestForm(true)
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this guest profile?')) {
                          deleteGuestPreference.mutate(guest.id)
                        }
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Cabin Preference */}
                  {guest.cabin_preference && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs font-medium text-gray-600 mb-1">Cabin Preference</p>
                      <p className="text-sm text-gray-900">{guest.cabin_preference}</p>
                    </div>
                  )}

                  {/* Dietary Restrictions */}
                  {guest.dietary_restrictions && (
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <UtensilsCrossed className="h-4 w-4 text-orange-600" />
                        <p className="text-xs font-medium text-orange-800">Dietary Restrictions</p>
                      </div>
                      <p className="text-sm text-gray-900">{guest.dietary_restrictions}</p>
                    </div>
                  )}

                  {/* Food Preferences */}
                  {guest.food_preferences && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Coffee className="h-4 w-4 text-green-600" />
                        <p className="text-xs font-medium text-green-800">Food Preferences</p>
                      </div>
                      <p className="text-sm text-gray-900">{guest.food_preferences}</p>
                    </div>
                  )}

                  {/* Beverage Preferences */}
                  {guest.beverage_preferences && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Wine className="h-4 w-4 text-blue-600" />
                        <p className="text-xs font-medium text-blue-800">Beverage Preferences</p>
                      </div>
                      <p className="text-sm text-gray-900">{guest.beverage_preferences}</p>
                    </div>
                  )}

                  {/* Entertainment Preferences */}
                  {guest.entertainment_preferences && (
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Music className="h-4 w-4 text-purple-600" />
                        <p className="text-xs font-medium text-purple-800">Entertainment</p>
                      </div>
                      <p className="text-sm text-gray-900">{guest.entertainment_preferences}</p>
                    </div>
                  )}

                  {/* Medical/Allergies */}
                  {guest.medical_conditions && (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="h-4 w-4 text-red-600" />
                        <p className="text-xs font-medium text-red-800">Medical Conditions / Allergies</p>
                      </div>
                      <p className="text-sm text-gray-900">{guest.medical_conditions}</p>
                    </div>
                  )}

                  {/* Special Requests */}
                  {guest.special_requests && (
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-xs font-medium text-gray-600 mb-1">Special Requests</p>
                      <p className="text-sm text-gray-900">{guest.special_requests}</p>
                    </div>
                  )}

                  {/* Additional Notes */}
                  {guest.notes && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-1">Notes</p>
                      <p className="text-xs text-gray-700">{guest.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {guestPreferences?.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              No guest profiles yet. Click "Add Guest Profile" to track guest preferences and requirements.
            </div>
          )}

          {/* Information Note */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-800">
              <strong>Note:</strong> Guest preferences help ensure a personalized and comfortable experience for all passengers. 
              Keep this information confidential and update regularly based on guest feedback.
            </p>
          </div>
        </>
      )}

      {/* TODO: Add Guest Preference Form Modal */}
    </div>
  )
}
