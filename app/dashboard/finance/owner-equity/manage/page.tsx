// Manage Owners and Record Contributions/Withdrawals
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, DollarSign, TrendingDown } from 'lucide-react'

export default function ManageOwnersPage() {
  const supabase = createClient()
  const [owners, setOwners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'owner' | 'contribution' | 'withdrawal'>('owner')
  const [editingOwner, setEditingOwner] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    ownership_percentage: '50.00',
    initial_capital: '0',
    owner_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    type: 'cash',
    description: ''
  })
  
  useEffect(() => {
    fetchOwners()
  }, [])
  
  async function fetchOwners() {
    setLoading(true)
    const { data } = await supabase
      .from('owners')
      .select('*')
      .order('name')
    setOwners(data || [])
    setLoading(false)
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (modalType === 'owner') {
      // Save owner
      if (editingOwner) {
        await supabase
          .from('owners')
          .update({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            ownership_percentage: parseFloat(formData.ownership_percentage),
            initial_capital: parseFloat(formData.initial_capital)
          })
          .eq('id', editingOwner.id)
      } else {
        await supabase
          .from('owners')
          .insert({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            ownership_percentage: parseFloat(formData.ownership_percentage),
            initial_capital: parseFloat(formData.initial_capital),
            status: 'active'
          })
      }
    } else if (modalType === 'contribution') {
      // Record contribution
      await supabase
        .from('capital_contributions')
        .insert({
          owner_id: formData.owner_id,
          amount: parseFloat(formData.amount),
          contribution_date: formData.date,
          contribution_type: formData.type,
          description: formData.description
        })
    } else if (modalType === 'withdrawal') {
      // Record withdrawal
      await supabase
        .from('capital_withdrawals')
        .insert({
          owner_id: formData.owner_id,
          amount: parseFloat(formData.amount),
          withdrawal_date: formData.date,
          withdrawal_type: formData.type,
          description: formData.description
        })
    }
    
    setShowModal(false)
    resetForm()
    fetchOwners()
  }
  
  function resetForm() {
    setFormData({
      name: '',
      email: '',
      phone: '',
      ownership_percentage: '50.00',
      initial_capital: '0',
      owner_id: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      type: 'cash',
      description: ''
    })
    setEditingOwner(null)
  }
  
  function openModal(type: 'owner' | 'contribution' | 'withdrawal', owner?: any) {
    setModalType(type)
    if (type === 'owner' && owner) {
      setEditingOwner(owner)
      setFormData({
        ...formData,
        name: owner.name,
        email: owner.email || '',
        phone: owner.phone || '',
        ownership_percentage: owner.ownership_percentage?.toString() || '50.00',
        initial_capital: owner.initial_capital?.toString() || '0'
      })
    } else if (type !== 'owner' && owner) {
      setFormData({ ...formData, owner_id: owner.id })
    }
    setShowModal(true)
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Owners</h1>
          <p className="text-gray-600 mt-1">Add owners and record capital transactions</p>
        </div>
        <button
          onClick={() => openModal('owner')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Owner
        </button>
      </div>
      
      {/* Owners List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {owners.map((owner) => (
          <div key={owner.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{owner.name}</h3>
                <p className="text-sm text-gray-600">{owner.ownership_percentage}% ownership</p>
                <p className="text-sm text-gray-500 mt-1">{owner.email}</p>
              </div>
              <button
                onClick={() => openModal('owner', owner)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Initial Capital</span>
                <span className="font-medium">${owner.initial_capital?.toLocaleString() || '0'}</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => openModal('contribution', owner)}
                className="flex-1 bg-green-50 text-green-700 px-3 py-2 rounded-lg hover:bg-green-100 flex items-center justify-center gap-2 text-sm"
              >
                <DollarSign className="h-4 w-4" />
                Add Contribution
              </button>
              <button
                onClick={() => openModal('withdrawal', owner)}
                className="flex-1 bg-red-50 text-red-700 px-3 py-2 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2 text-sm"
              >
                <TrendingDown className="h-4 w-4" />
                Add Withdrawal
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">How to Track Owner Payments</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>When creating a vessel purchase, select which owner paid for it</li>
          <li>When recording expenses, assign them to the owner who paid</li>
          <li>Use "Add Contribution" for direct cash injections into the business</li>
          <li>Use "Add Withdrawal" for profit distributions to owners</li>
          <li>View the Owner Equity page to see the balance between owners</li>
        </ol>
      </div>
      
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {modalType === 'owner' 
                ? (editingOwner ? 'Edit Owner' : 'Add New Owner')
                : modalType === 'contribution' 
                  ? 'Record Capital Contribution' 
                  : 'Record Capital Withdrawal'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {modalType === 'owner' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ownership Percentage *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.ownership_percentage}
                      onChange={(e) => setFormData({...formData, ownership_percentage: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Initial Capital
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.initial_capital}
                      onChange={(e) => setFormData({...formData, initial_capital: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Owner *
                    </label>
                    <select
                      value={formData.owner_id}
                      onChange={(e) => setFormData({...formData, owner_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="">Select owner</option>
                      {owners.map((owner) => (
                        <option key={owner.id} value={owner.id}>{owner.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      {modalType === 'contribution' ? (
                        <>
                          <option value="cash">Cash</option>
                          <option value="equipment">Equipment</option>
                          <option value="other">Other</option>
                        </>
                      ) : (
                        <>
                          <option value="profit_distribution">Profit Distribution</option>
                          <option value="loan_repayment">Loan Repayment</option>
                          <option value="other">Other</option>
                        </>
                      )}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                    />
                  </div>
                </>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {modalType === 'owner' ? 'Save Owner' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
