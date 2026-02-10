'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, ArrowRightLeft, TrendingDown, TrendingUp, Trash2 } from 'lucide-react'

type TransactionTab = 'distributions' | 'transfers' | 'contributions'

export default function PartnerTransactionsPage() {
  const [activeTab, setActiveTab] = useState<TransactionTab>('distributions')
  const [showDistributionForm, setShowDistributionForm] = useState(false)
  const [showTransferForm, setShowTransferForm] = useState(false)
  const [showContributionForm, setShowContributionForm] = useState(false)
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: distributions, isLoading: loadingDistributions } = useQuery({
    queryKey: ['owner_distributions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owner_distributions')
        .select('*, owners(name)')
        .order('distribution_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: transfers, isLoading: loadingTransfers } = useQuery({
    queryKey: ['partner_transfers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_transfers')
        .select(`
          *,
          from_owner:owners!partner_transfers_from_owner_id_fkey(name),
          to_owner:owners!partner_transfers_to_owner_id_fkey(name)
        `)
        .order('transfer_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: contributions, isLoading: loadingContributions } = useQuery({
    queryKey: ['informal_contributions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('informal_contributions')
        .select('*, owners(name)')
        .order('contribution_date', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: owners } = useQuery({
    queryKey: ['owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owners')
        .select('*')
        .eq('status', 'active')
        .order('name')
      if (error) throw error
      return data
    }
  })

  const deleteDistributionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('owner_distributions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner_distributions'] })
      queryClient.invalidateQueries({ queryKey: ['owner_account_statement'] })
    }
  })

  const deleteTransferMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('partner_transfers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner_transfers'] })
      queryClient.invalidateQueries({ queryKey: ['owner_account_statement'] })
    }
  })

  const deleteContributionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('informal_contributions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['informal_contributions'] })
      queryClient.invalidateQueries({ queryKey: ['owner_account_statement'] })
    }
  })

  const totalDistributions = distributions?.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0) || 0
  const totalTransfers = transfers?.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) || 0
  const totalContributions = contributions?.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Partner Transactions</h1>
          <p className="text-gray-600 mt-1">Track informal money flows between partners</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Distributions Taken</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{totalDistributions.toLocaleString()} AED</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Partner Transfers</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{totalTransfers.toLocaleString()} AED</p>
            </div>
            <ArrowRightLeft className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Informal Contributions</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{totalContributions.toLocaleString()} AED</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('distributions')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'distributions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Distributions ({distributions?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('transfers')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'transfers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Transfers ({transfers?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('contributions')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'contributions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Contributions ({contributions?.length || 0})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'distributions' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">When partner takes money from company sales (scrap, equipment, etc.)</p>
                <button
                  onClick={() => setShowDistributionForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Record Distribution
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {distributions?.map((dist: any) => (
                      <tr key={dist.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dist.distribution_date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {dist.owners?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                          -{parseFloat(dist.amount).toLocaleString()} AED
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>
                            <span className="capitalize font-medium">{dist.source_type?.replace('_', ' ')}</span>
                            {dist.source_id && (
                              <div className="text-xs text-gray-500 mt-0.5">ID: {dist.source_id.substring(0, 8)}...</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{dist.description || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => {
                              if (confirm('Delete this distribution?')) {
                                deleteDistributionMutation.mutate(dist.id)
                              }
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {distributions?.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No distributions recorded yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'transfers' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">Direct money transfers between partners</p>
                <button
                  onClick={() => setShowTransferForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Record Transfer
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transfers?.map((transfer: any) => (
                      <tr key={transfer.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transfer.transfer_date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                          {transfer.from_owner?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {transfer.to_owner?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                          {parseFloat(transfer.amount).toLocaleString()} AED
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{transfer.reason || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            transfer.status === 'completed' ? 'bg-green-100 text-green-800' :
                            transfer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {transfer.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => {
                              if (confirm('Delete this transfer?')) {
                                deleteTransferMutation.mutate(transfer.id)
                              }
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transfers?.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No transfers recorded yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'contributions' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">When partner spends personal money on company expenses</p>
                <button
                  onClick={() => setShowContributionForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Record Contribution
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source of Funds</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {contributions?.map((contrib: any) => (
                      <tr key={contrib.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contrib.contribution_date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {contrib.owners?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                          +{parseFloat(contrib.amount).toLocaleString()} AED
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {contrib.transaction_type?.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {contrib.source_of_funds?.replace('_', ' ') || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{contrib.description || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => {
                              if (confirm('Delete this contribution?')) {
                                deleteContributionMutation.mutate(contrib.id)
                              }
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {contributions?.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No contributions recorded yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showDistributionForm && (
        <DistributionForm onClose={() => setShowDistributionForm(false)} owners={owners || []} />
      )}
      {showTransferForm && (
        <TransferForm onClose={() => setShowTransferForm(false)} owners={owners || []} />
      )}
      {showContributionForm && (
        <ContributionForm onClose={() => setShowContributionForm(false)} owners={owners || []} />
      )}
    </div>
  )
}

function DistributionForm({ onClose, owners }: { onClose: () => void, owners: any[] }) {
  const [formData, setFormData] = useState({
    owner_id: '',
    distribution_date: new Date().toISOString().split('T')[0],
    amount: '',
    source_type: 'scrap_sale',
    description: ''
  })

  const queryClient = useQueryClient()
  const supabase = createClient()

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('owner_distributions').insert([{
        ...data,
        amount: parseFloat(data.amount),
        owner_id: data.owner_id || null
      }])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner_distributions'] })
      queryClient.invalidateQueries({ queryKey: ['owner_account_statement'] })
      onClose()
    }
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-xl w-full p-6">
        <h2 className="text-2xl font-bold mb-6">Record Distribution</h2>
        
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData) }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Partner *</label>
            <select
              required
              value={formData.owner_id}
              onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Partner</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>{owner.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.distribution_date}
                onChange={(e) => setFormData({ ...formData, distribution_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (AED) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source Type *</label>
            <select
              value={formData.source_type}
              onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="scrap_sale">Scrap Sale</option>
              <option value="equipment_sale">Equipment Sale</option>
              <option value="rental_income">Rental Income</option>
              <option value="vessel_sale">Vessel Sale</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="E.g., kept proceeds from scrap metal sale week 1"
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
              {mutation.isPending ? 'Saving...' : 'Record Distribution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TransferForm({ onClose, owners }: { onClose: () => void, owners: any[] }) {
  const [formData, setFormData] = useState({
    from_owner_id: '',
    to_owner_id: '',
    transfer_date: new Date().toISOString().split('T')[0],
    amount: '',
    reason: '',
    status: 'completed'
  })

  const queryClient = useQueryClient()
  const supabase = createClient()

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('partner_transfers').insert([{
        ...data,
        amount: parseFloat(data.amount),
        from_owner_id: data.from_owner_id || null,
        to_owner_id: data.to_owner_id || null
      }])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner_transfers'] })
      queryClient.invalidateQueries({ queryKey: ['owner_account_statement'] })
      onClose()
    }
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-xl w-full p-6">
        <h2 className="text-2xl font-bold mb-6">Record Partner Transfer</h2>
        
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Partner *</label>
              <select
                required
                value={formData.from_owner_id}
                onChange={(e) => setFormData({ ...formData, from_owner_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Partner</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>{owner.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Partner *</label>
              <select
                required
                value={formData.to_owner_id}
                onChange={(e) => setFormData({ ...formData, to_owner_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Partner</option>
                {owners.map((owner) => (
                  <option 
                    key={owner.id} 
                    value={owner.id}
                    disabled={owner.id === formData.from_owner_id}
                  >
                    {owner.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.transfer_date}
                onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (AED) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="E.g., share of scrap sale profits"
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
              {mutation.isPending ? 'Saving...' : 'Record Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ContributionForm({ onClose, owners }: { onClose: () => void, owners: any[] }) {
  const [formData, setFormData] = useState({
    owner_id: '',
    contribution_date: new Date().toISOString().split('T')[0],
    amount: '',
    transaction_type: 'expense_payment',
    source_of_funds: 'scrap_profit',
    description: ''
  })

  const queryClient = useQueryClient()
  const supabase = createClient()

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('informal_contributions').insert([{
        ...data,
        amount: parseFloat(data.amount),
        owner_id: data.owner_id || null
      }])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['informal_contributions'] })
      queryClient.invalidateQueries({ queryKey: ['owner_account_statement'] })
      onClose()
    }
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-xl w-full p-6">
        <h2 className="text-2xl font-bold mb-6">Record Informal Contribution</h2>
        
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData) }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Partner *</label>
            <select
              required
              value={formData.owner_id}
              onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Partner</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>{owner.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.contribution_date}
                onChange={(e) => setFormData({ ...formData, contribution_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (AED) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type *</label>
            <select
              value={formData.transaction_type}
              onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="expense_payment">Expense Payment</option>
              <option value="land_purchase">Land Purchase</option>
              <option value="vessel_purchase">Vessel Purchase</option>
              <option value="inventory_purchase">Inventory Purchase</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source of Funds *</label>
            <select
              value={formData.source_of_funds}
              onChange={(e) => setFormData({ ...formData, source_of_funds: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="scrap_profit">Scrap Profit</option>
              <option value="equipment_sale">Equipment Sale</option>
              <option value="personal_savings">Personal Savings</option>
              <option value="distributed_profit">Distributed Profit</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="E.g., used scrap profit to pay for truck rental"
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
              {mutation.isPending ? 'Saving...' : 'Record Contribution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
