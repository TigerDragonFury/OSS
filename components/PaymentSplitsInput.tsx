// Reusable Payment Splits Component
// Allows splitting payments between multiple owners
'use client'

import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'

interface Owner {
  id: string
  name: string
}

interface PaymentSplit {
  owner_id: string
  owner_name?: string
  amount_paid: number
}

interface PaymentSplitsInputProps {
  owners: Owner[]
  totalAmount: number
  existingSplits?: PaymentSplit[]
  onChange: (splits: PaymentSplit[]) => void
  disabled?: boolean
}

export default function PaymentSplitsInput({ 
  owners, 
  totalAmount, 
  existingSplits = [],
  onChange,
  disabled = false
}: PaymentSplitsInputProps) {
  const [splits, setSplits] = useState<PaymentSplit[]>(existingSplits)
  
  useEffect(() => {
    if (existingSplits.length > 0) {
      setSplits(existingSplits)
    }
  }, [existingSplits])
  
  const addSplit = () => {
    const newSplit = { owner_id: '', amount_paid: 0 }
    const updated = [...splits, newSplit]
    setSplits(updated)
    onChange(updated)
  }
  
  const removeSplit = (index: number) => {
    const updated = splits.filter((_, i) => i !== index)
    setSplits(updated)
    onChange(updated)
  }
  
  const updateSplit = (index: number, field: 'owner_id' | 'amount_paid', value: string | number) => {
    const updated = [...splits]
    if (field === 'owner_id') {
      updated[index].owner_id = value as string
      const owner = owners.find(o => o.id === value)
      if (owner) {
        updated[index].owner_name = owner.name
      }
    } else {
      updated[index].amount_paid = parseFloat(value as string) || 0
    }
    setSplits(updated)
    onChange(updated)
  }
  
  const totalPaid = splits.reduce((sum, split) => sum + (split.amount_paid || 0), 0)
  const remaining = totalAmount - totalPaid
  const isBalanced = Math.abs(remaining) < 0.01
  
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-700">
          Payment Splits {!disabled && '(Optional)'}
        </label>
        {!disabled && (
          <button
            type="button"
            onClick={addSplit}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Split Payment
          </button>
        )}
      </div>
      
      <p className="text-xs text-gray-500">
        Split the payment between owners. Leave empty if only one owner paid the full amount.
      </p>
      
      {splits.length > 0 && (
        <div className="space-y-2">
          {splits.map((split, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex-1">
                <select
                  value={split.owner_id}
                  onChange={(e) => updateSplit(index, 'owner_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                  disabled={disabled}
                >
                  <option value="">Select owner</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>{owner.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-32">
                <input
                  type="number"
                  step="0.01"
                  value={split.amount_paid || ''}
                  onChange={(e) => updateSplit(index, 'amount_paid', e.target.value)}
                  placeholder="Amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                  disabled={disabled}
                />
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeSplit(index)}
                  className="p-2 text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          
          {/* Payment Summary */}
          <div className={`mt-3 p-3 rounded-lg border ${
            isBalanced ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">Total Amount:</span>
              <span>${totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">Total Paid:</span>
              <span>${totalPaid.toLocaleString()}</span>
            </div>
            <div className={`flex justify-between text-sm font-semibold pt-2 border-t ${
              isBalanced ? 'text-green-700' : 'text-yellow-700'
            }`}>
              <span>Remaining:</span>
              <span>${remaining.toLocaleString()}</span>
            </div>
            {!isBalanced && (
              <p className="text-xs text-yellow-700 mt-2">
                {remaining > 0 
                  ? `⚠️ ${remaining.toLocaleString()} still needs to be assigned to an owner`
                  : `⚠️ Total paid exceeds amount by ${Math.abs(remaining).toLocaleString()}`}
              </p>
            )}
          </div>
        </div>
      )}
      
      {splits.length === 0 && !disabled && (
        <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg">
          No split payments added. If multiple owners contributed, click "Add Split Payment" above.
        </div>
      )}
    </div>
  )
}
