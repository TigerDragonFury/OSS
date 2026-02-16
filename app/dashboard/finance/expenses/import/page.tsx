'use client'

import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Upload, CheckCircle, XCircle, AlertCircle, FileSpreadsheet, ArrowLeft, ArrowRight, Columns, Tags, Eye } from 'lucide-react'
import * as XLSX from 'xlsx'

type Step = 'upload' | 'columns' | 'categories' | 'preview'

const EXPENSE_FIELDS = [
  { key: 'skip', label: '-- Skip --', required: false },
  { key: 'date', label: 'Date *', required: true },
  { key: 'amount', label: 'Amount *', required: true },
  { key: 'expense_type', label: 'Expense Type', required: false },
  { key: 'category', label: 'Category', required: false },
  { key: 'description', label: 'Description', required: false },
  { key: 'vendor_name', label: 'Vendor Name', required: false },
  { key: 'payment_method', label: 'Payment Method', required: false },
  { key: 'status', label: 'Status', required: false },
]

export default function ImportExpensesPage() {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [rawData, setRawData] = useState<any[]>([])
  const [excelColumns, setExcelColumns] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [categoryMapping, setCategoryMapping] = useState<Record<string, string>>({})
  const [expenseTypeMapping, setExpenseTypeMapping] = useState<Record<string, string>>({})
  const [defaultStatus, setDefaultStatus] = useState('paid')
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState('transfer')
  const [selectedBankAccount, setSelectedBankAccount] = useState('')
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null)

  const queryClient = useQueryClient()
  const supabase = createClient()

  useEffect(() => {
    fetchBankAccounts()
  }, [])

  const fetchBankAccounts = async () => {
    try {
      const { data } = await supabase
        .from('bank_account_reconciliation')
        .select('account_id, account_name, calculated_balance')
        .eq('status', 'active')
        .order('account_name')
      setBankAccounts(data || [])
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      parseExcel(selectedFile)
    }
  }

  const parseExcel = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1')

        // Detect header row by scanning first 20 rows for the one with the most text cells
        const detectHeaderRow = () => {
          let bestRow = 0
          let bestCount = 0
          for (let r = range.s.r; r <= Math.min(range.s.r + 19, range.e.r); r++) {
            let textCount = 0
            for (let c = range.s.c; c <= range.e.c; c++) {
              const cell = worksheet[XLSX.utils.encode_cell({ r, c })]
              if (cell && cell.v !== undefined && cell.v !== null) {
                const val = String(cell.v).trim()
                if (val && isNaN(Number(val))) textCount++
              }
            }
            if (textCount > bestCount) {
              bestCount = textCount
              bestRow = r
            }
          }
          return bestRow
        }

        const headerRow = detectHeaderRow()
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '', range: headerRow })

        if (jsonData.length === 0) {
          alert('No data found in the Excel file.')
          return
        }

        const columns = Object.keys(jsonData[0] as any)
        setExcelColumns(columns)
        setRawData(jsonData)

        // Auto-guess column mapping
        const autoMap: Record<string, string> = {}
        for (const col of columns) {
          const lower = col.toLowerCase()
          if (/date/.test(lower)) autoMap[col] = 'date'
          else if (/amount|total|sum|price|cost/.test(lower)) autoMap[col] = 'amount'
          else if (/type|expense.?type/.test(lower)) autoMap[col] = 'expense_type'
          else if (/categ/.test(lower)) autoMap[col] = 'category'
          else if (/desc/.test(lower)) autoMap[col] = 'description'
          else if (/vendor|supplier|payee/.test(lower)) autoMap[col] = 'vendor_name'
          else if (/payment|method/.test(lower)) autoMap[col] = 'payment_method'
          else if (/status/.test(lower)) autoMap[col] = 'status'
          else autoMap[col] = 'skip'
        }
        setColumnMapping(autoMap)
        setStep('columns')
      } catch (error) {
        alert('Error parsing Excel file. Please check the file format.')
        console.error(error)
      }
    }
    reader.readAsBinaryString(file)
  }

  const getUniqueValues = (fieldKey: string): string[] => {
    const excelCol = Object.entries(columnMapping).find(([, v]) => v === fieldKey)?.[0]
    if (!excelCol) return []
    const values = new Set<string>()
    for (const row of rawData) {
      const val = String((row as any)[excelCol] || '').trim()
      if (val) values.add(val)
    }
    return Array.from(values).sort()
  }

  const handleColumnMappingChange = (excelCol: string, targetField: string) => {
    setColumnMapping(prev => {
      const updated = { ...prev }
      // If another column already maps to this target (and it's not 'skip'), clear it
      if (targetField !== 'skip') {
        for (const key of Object.keys(updated)) {
          if (key !== excelCol && updated[key] === targetField) {
            updated[key] = 'skip'
          }
        }
      }
      updated[excelCol] = targetField
      return updated
    })
  }

  const proceedToCategories = () => {
    // Build initial category mapping (pre-populate with same value)
    const cats = getUniqueValues('category')
    const catMap: Record<string, string> = {}
    for (const c of cats) catMap[c] = c

    const types = getUniqueValues('expense_type')
    const typeMap: Record<string, string> = {}
    for (const t of types) typeMap[t] = t

    setCategoryMapping(catMap)
    setExpenseTypeMapping(typeMap)
    setStep('categories')
  }

  const canProceedFromColumns = () => {
    const mappedFields = Object.values(columnMapping)
    return mappedFields.includes('date') && mappedFields.includes('amount')
  }

  const getTransformedData = () => {
    const reverseMap: Record<string, string> = {}
    for (const [excelCol, field] of Object.entries(columnMapping)) {
      if (field !== 'skip') reverseMap[field] = excelCol
    }

    return rawData.map((row: any) => {
      const getValue = (field: string) => {
        const col = reverseMap[field]
        if (!col) return ''
        return String(row[col] || '').trim()
      }

      let dateVal = getValue('date')
      // Try to parse date - handle common formats
      if (dateVal) {
        const parsed = new Date(dateVal)
        if (!isNaN(parsed.getTime())) {
          dateVal = parsed.toISOString().split('T')[0]
        }
      }

      let amount = parseFloat(getValue('amount').replace(/[^0-9.-]/g, '')) || 0

      let category = getValue('category')
      if (category && categoryMapping[category]) {
        category = categoryMapping[category]
      }

      let expenseType = getValue('expense_type')
      if (expenseType && expenseTypeMapping[expenseType]) {
        expenseType = expenseTypeMapping[expenseType]
      }

      const paymentMethod = getValue('payment_method') || defaultPaymentMethod
      const status = getValue('status') || defaultStatus

      return {
        date: dateVal,
        amount,
        expense_type: expenseType || null,
        category: category || null,
        description: getValue('description') || null,
        vendor_name: getValue('vendor_name') || null,
        payment_method: paymentMethod,
        status,
        bank_account_id: selectedBankAccount || null,
      }
    })
  }

  const handleImport = async () => {
    const transformed = getTransformedData()
    const validRows = transformed.filter(r => r.date && r.amount > 0)

    if (validRows.length === 0) {
      alert('No valid rows to import. Each row needs a date and amount > 0.')
      return
    }

    setUploading(true)
    setUploadResults(null)

    let successCount = 0
    let failedCount = 0
    const errors: string[] = []

    // Insert in batches of 50
    const batchSize = 50
    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize)
      const { error } = await supabase.from('expenses').insert(batch)
      if (error) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
        failedCount += batch.length
      } else {
        successCount += batch.length
      }
    }

    setUploadResults({ success: successCount, failed: failedCount, errors })
    setUploading(false)

    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    }
  }

  const resetAll = () => {
    setStep('upload')
    setFile(null)
    setRawData([])
    setExcelColumns([])
    setColumnMapping({})
    setCategoryMapping({})
    setExpenseTypeMapping({})
    setUploadResults(null)
  }

  const steps: { key: Step; label: string; icon: any }[] = [
    { key: 'upload', label: 'Upload File', icon: FileSpreadsheet },
    { key: 'columns', label: 'Map Columns', icon: Columns },
    { key: 'categories', label: 'Map Categories', icon: Tags },
    { key: 'preview', label: 'Preview & Import', icon: Eye },
  ]

  const currentStepIndex = steps.findIndex(s => s.key === step)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Import Expenses</h1>
        <p className="text-gray-600 mt-1">Upload an Excel file and map columns to import expenses</p>
      </div>

      {/* Step Indicator */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          {steps.map((s, idx) => {
            const Icon = s.icon
            const isActive = s.key === step
            const isDone = idx < currentStepIndex
            return (
              <div key={s.key} className="flex items-center flex-1">
                <div className={`flex items-center ${isActive ? 'text-blue-600' : isDone ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isActive ? 'bg-blue-100 text-blue-700' : isDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isDone ? <CheckCircle className="h-5 w-5" /> : idx + 1}
                  </div>
                  <span className={`ml-2 text-sm font-medium hidden sm:inline ${isActive ? 'text-blue-700' : isDone ? 'text-green-700' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 ${idx < currentStepIndex ? 'bg-green-300' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Excel File</label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileSpreadsheet className="w-12 h-12 mb-4 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">Excel file (.xlsx, .xls)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Upload your Excel file with expense data</li>
                <li>Map your Excel columns to the system expense fields</li>
                <li>Map category names from your file to your preferred categories</li>
                <li>Preview the data and import</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 'columns' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-1">Map Columns</h2>
            <p className="text-sm text-gray-600">
              Match each Excel column to the corresponding expense field. Fields marked with * are required.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              <strong>{rawData.length}</strong> rows detected from <strong>{file?.name}</strong>
            </p>
          </div>

          <div className="space-y-3">
            {excelColumns.map((col) => (
              <div key={col} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 truncate block">{col}</span>
                  <span className="text-xs text-gray-500">
                    Sample: {String((rawData[0] as any)?.[col] || '').substring(0, 50)}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <select
                  value={columnMapping[col] || 'skip'}
                  onChange={(e) => handleColumnMappingChange(col, e.target.value)}
                  className={`w-48 px-3 py-2 border rounded-lg text-sm ${
                    columnMapping[col] && columnMapping[col] !== 'skip'
                      ? 'border-blue-300 bg-blue-50 text-blue-900'
                      : 'border-gray-300 text-gray-700'
                  }`}
                >
                  {EXPENSE_FIELDS.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {!canProceedFromColumns() && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-800">
                  You must map at least <strong>Date</strong> and <strong>Amount</strong> to proceed.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              onClick={resetAll}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            <button
              onClick={proceedToCategories}
              disabled={!canProceedFromColumns()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Category Mapping */}
      {step === 'categories' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-1">Map Categories & Types</h2>
            <p className="text-sm text-gray-600">
              Rename categories or expense types from your file to match your system. Leave as-is if they're already correct.
            </p>
          </div>

          {Object.keys(categoryMapping).length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">Categories</h3>
              <div className="space-y-2">
                {Object.entries(categoryMapping).map(([original, mapped]) => (
                  <div key={original} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900">{original}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({rawData.filter(r => String((r as any)[Object.entries(columnMapping).find(([, v]) => v === 'category')?.[0] || ''] || '').trim() === original).length} rows)
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={mapped}
                      onChange={(e) => setCategoryMapping(prev => ({ ...prev, [original]: e.target.value }))}
                      className="w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(expenseTypeMapping).length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">Expense Types</h3>
              <div className="space-y-2">
                {Object.entries(expenseTypeMapping).map(([original, mapped]) => (
                  <div key={original} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900">{original}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({rawData.filter(r => String((r as any)[Object.entries(columnMapping).find(([, v]) => v === 'expense_type')?.[0] || ''] || '').trim() === original).length} rows)
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={mapped}
                      onChange={(e) => setExpenseTypeMapping(prev => ({ ...prev, [original]: e.target.value }))}
                      className="w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(categoryMapping).length === 0 && Object.keys(expenseTypeMapping).length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-gray-600">No category or expense type columns were mapped. You can skip this step.</p>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep('columns')}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            <button
              onClick={() => setStep('preview')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Preview & Import */}
      {step === 'preview' && !uploadResults && (
        <div className="space-y-6">
          {/* Default values */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Import Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Status</label>
                <select
                  value={defaultStatus}
                  onChange={(e) => setDefaultStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Applied when no status column is mapped</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Payment Method</label>
                <select
                  value={defaultPaymentMethod}
                  onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Applied when no payment method column is mapped</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
                <select
                  value={selectedBankAccount}
                  onChange={(e) => setSelectedBankAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">No bank account</option>
                  {bankAccounts.map((acc) => (
                    <option key={acc.account_id} value={acc.account_id}>
                      {acc.account_name} (AED {acc.calculated_balance?.toLocaleString() || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Preview table */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Preview</h2>
              {(() => {
                const transformed = getTransformedData()
                const valid = transformed.filter(r => r.date && r.amount > 0)
                const invalid = transformed.length - valid.length
                return (
                  <p className="text-sm text-gray-600">
                    <strong>{valid.length}</strong> valid rows ready to import
                    {invalid > 0 && (
                      <span className="text-yellow-600 ml-2">({invalid} rows missing date or amount will be skipped)</span>
                    )}
                  </p>
                )
              })()}
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getTransformedData().slice(0, 50).map((row, idx) => {
                    const hasIssue = !row.date || row.amount <= 0
                    return (
                      <tr key={idx} className={hasIssue ? 'bg-red-50' : ''}>
                        <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{row.date || <span className="text-red-500">Missing</span>}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{row.amount > 0 ? row.amount.toLocaleString() : <span className="text-red-500">Invalid</span>}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{row.expense_type || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{row.category || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">{row.description || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{row.vendor_name || '-'}</td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            row.status === 'paid' ? 'bg-green-100 text-green-800' :
                            row.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            row.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {getTransformedData().length > 50 && (
              <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500 text-center">
                Showing first 50 of {getTransformedData().length} rows
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep('categories')}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={uploading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import All
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {uploadResults && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold">Import Results</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-green-700">Successfully Imported</p>
                <p className="text-2xl font-bold text-green-900">{uploadResults.success}</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
              <XCircle className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <p className="text-sm text-red-700">Failed</p>
                <p className="text-2xl font-bold text-red-900">{uploadResults.failed}</p>
              </div>
            </div>
          </div>

          {uploadResults.errors.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 mb-2">Errors:</h3>
                  <div className="text-sm text-yellow-800 space-y-1 max-h-48 overflow-y-auto">
                    {uploadResults.errors.map((error, index) => (
                      <div key={index}>&#8226; {error}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={resetAll}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  )
}
