'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Upload, CheckCircle, XCircle, AlertCircle, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [selectedVessel, setSelectedVessel] = useState('')
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const [detectedColumns, setDetectedColumns] = useState<{ columns: string[]; headerRow: number } | null>(null)
  
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: vessels } = useQuery({
    queryKey: ['vessels_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessels')
        .select('id, name')
        .order('name')
      if (error) throw error
      return data
    }
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, location')
        .eq('status', 'active')
        .order('name')
      if (error) throw error
      return data
    }
  })

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

        // Get the sheet range to understand the data structure
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1')
        console.log('=== SHEET STRUCTURE ===')
        console.log('Sheet range:', worksheet['!ref'])
        console.log('Rows:', range.e.r - range.s.r + 1, 'Columns:', range.e.c - range.s.c + 1)

        // Key columns to look for (normalized to lowercase)
        const keyColumnPatterns = [
          { pattern: /equipment|equip/i, name: 'equipment' },
          { pattern: /item\s*code|itemcode|code/i, name: 'item_code' },
          { pattern: /description|desc/i, name: 'description' },
          { pattern: /quantity|qty|updated\s*qty/i, name: 'quantity' },
          { pattern: /unit|uom|u\/m/i, name: 'unit' },
          { pattern: /location|loc/i, name: 'location' },
          { pattern: /sl\.?\s*no\.?|serial|s\.?\s*no/i, name: 'sl_no' },
          { pattern: /ref\.?\s*no\.?|reference/i, name: 'ref_no' },
          { pattern: /remark|notes/i, name: 'remarks' }
        ]

        // Scan raw cells to find the header row
        const detectHeaderRow = () => {
          let bestRowIndex = 0
          let bestMatchCount = 0
          let bestColumns: string[] = []

          // Scan first 20 rows to find headers
          for (let rowIdx = range.s.r; rowIdx <= Math.min(range.s.r + 19, range.e.r); rowIdx++) {
            const rowValues: string[] = []

            // Get all cell values in this row
            for (let colIdx = range.s.c; colIdx <= range.e.c; colIdx++) {
              const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx })
              const cell = worksheet[cellAddress]
              if (cell && cell.v !== undefined && cell.v !== null) {
                const cellValue = String(cell.v).trim()
                if (cellValue) {
                  rowValues.push(cellValue)
                }
              }
            }

            if (rowValues.length === 0) continue

            // Count how many key column patterns match this row's values
            let matchCount = 0
            const matchedPatterns: string[] = []

            for (const value of rowValues) {
              for (const keyCol of keyColumnPatterns) {
                if (keyCol.pattern.test(value) && !matchedPatterns.includes(keyCol.name)) {
                  matchCount++
                  matchedPatterns.push(keyCol.name)
                }
              }
            }

            console.log(`Row ${rowIdx + 1}: Found ${matchCount} key columns - [${rowValues.slice(0, 5).join(', ')}${rowValues.length > 5 ? '...' : ''}]`)

            // Keep track of the best matching row
            if (matchCount > bestMatchCount) {
              bestMatchCount = matchCount
              bestRowIndex = rowIdx
              bestColumns = rowValues
            }

            // If we found at least 3 key columns, this is likely the header row
            if (matchCount >= 3) {
              console.log(`✓ Header row detected at row ${rowIdx + 1} with ${matchCount} matching columns`)
              console.log('Columns found:', rowValues)
              return rowIdx
            }
          }

          // If we found at least 2 matches, use that row
          if (bestMatchCount >= 2) {
            console.log(`⚠ Using best match at row ${bestRowIndex + 1} with ${bestMatchCount} columns`)
            console.log('Columns found:', bestColumns)
            return bestRowIndex
          }

          // Fallback: look for a row with multiple non-empty cells that looks like headers
          for (let rowIdx = range.s.r; rowIdx <= Math.min(range.s.r + 19, range.e.r); rowIdx++) {
            const rowValues: string[] = []
            for (let colIdx = range.s.c; colIdx <= range.e.c; colIdx++) {
              const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx })
              const cell = worksheet[cellAddress]
              if (cell && cell.v !== undefined && cell.v !== null) {
                rowValues.push(String(cell.v).trim())
              }
            }
            // If row has 5+ non-empty cells and they're mostly text, it's likely headers
            if (rowValues.length >= 5 && rowValues.every(v => isNaN(Number(v)) || v.length > 10)) {
              console.log(`⚠ Fallback: Using row ${rowIdx + 1} as header (has ${rowValues.length} text cells)`)
              return rowIdx
            }
          }

          console.log('⚠ Could not detect header row, using row 1')
          return 0
        }

        const headerRowIndex = detectHeaderRow()
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false,
          defval: '',
          range: headerRowIndex  // Use the actual row index
        })

        if (jsonData.length === 0) {
          alert('Excel file is empty or has no data after headers. Header detected at row ' + (headerRowIndex + 1))
          return
        }

        // Debug: Log the detected structure
        const firstRow = jsonData[0] as any
        const columnNames = Object.keys(firstRow)
        console.log('=== EXCEL FILE DEBUG INFO ===')
        console.log('Header row detected at Excel row:', headerRowIndex + 1)
        console.log('Total data rows:', jsonData.length)
        console.log('Column names found:', columnNames)
        console.log('First data row:', firstRow)
        console.log('===========================')

        // Store detected columns for UI display
        setDetectedColumns({ columns: columnNames, headerRow: headerRowIndex + 1 })
        console.log(`Detected ${columnNames.length} columns at row ${headerRowIndex + 1}:`, columnNames)

        // Show columns to user
        if (columnNames.length === 0) {
          alert('Could not find any columns in the Excel file. Please check the file format.\n\nTry ensuring your header row contains column names like: EQUIPMENT, ITEM CODE, DESCRIPTION, QTY, UNIT, LOCATION')
          return
        }

        // Transform Excel data to match our schema
        const transformedData = jsonData.map((row: any, index: number) => {
          // Helper function to find column value with flexible matching
          const getColumnValue = (possibleNames: string[]) => {
            for (const name of possibleNames) {
              // Try exact match
              if (row.hasOwnProperty(name)) {
                const value = row[name]
                if (value !== undefined && value !== null && value !== '') {
                  return String(value).trim()
                }
              }
              // Try case-insensitive match
              for (const key of Object.keys(row)) {
                if (key.toLowerCase() === name.toLowerCase()) {
                  const value = row[key]
                  if (value !== undefined && value !== null && value !== '') {
                    return String(value).trim()
                  }
                }
              }
            }
            return ''
          }

          // Handle SL No - generate if empty
          let slNo = getColumnValue(['SL No.', 'SL NO', 'SL No', 'sl_no', 'Sl No', 'SL. No.', 'SL.NO', 'Serial No', 'S.No', 'S No'])
          if (!slNo) {
            slNo = `AUTO-${String(index + 1).padStart(4, '0')}`
          }

          // Get equipment and description
          let equipment = getColumnValue(['EQUIPMENT', 'Equipment', 'equipment', 'EQUIPMENT NAME', 'Equipment Name', 'Item Name'])
          let description = getColumnValue(['DESCRIPTION', 'Description', 'description', 'DESC', 'Desc'])
          const itemCode = getColumnValue(['ITEM CODE', 'Item Code', 'item_code', 'ITEMCODE', 'ItemCode', 'CODE', 'Code'])
          const refNo = getColumnValue(['REF. No.', 'REF NO', 'REF.NO', 'ref_no', 'Ref No', 'Reference No', 'Ref. No.', 'REF No.'])

          // If equipment is empty but description exists, copy description to equipment
          if (!equipment && description) {
            equipment = description
          }
          // If description is empty but equipment exists, copy equipment to description
          if (!description && equipment) {
            description = equipment
          }
          // If both are still empty, try using item_code, ref_no, or sl_no as fallback
          if (!equipment && !description) {
            equipment = itemCode || refNo || slNo || 'Unknown Item'
            description = equipment
          }

          const unit = getColumnValue(['UNIT', 'Unit', 'unit', 'UOM', 'U/M']) || 'pcs'
          const qtyStr = getColumnValue(['Updated QTY', 'QUANTITY', 'Quantity', 'quantity', 'QTY', 'Qty', 'qty', 'UPDATED QTY'])
          const quantity = parseFloat(qtyStr || '0')
          const location = getColumnValue(['LOCATION', 'Location', 'location', 'LOC'])
          const location1 = getColumnValue(['LOCATION - 1', 'LOCATION-1', 'location_1', 'Location 1', 'LOC 1'])
          const location2 = getColumnValue(['LOCATION - 2', 'LOCATION-2', 'location_2', 'Location 2', 'LOC 2'])
          const remarks = getColumnValue(['REMARKS', 'Remarks', 'remarks', 'REMARK', 'Notes'])

          return {
            sl_no: slNo,
            equipment_name: equipment,
            item_code: itemCode,
            description: description,
            unit: unit,
            quantity: quantity,
            location: location,
            location_1: location1,
            location_2: location2,
            ref_no: refNo,
            remarks: remarks
          }
        })

        setPreviewData(transformedData)
      } catch (error) {
        alert('Error parsing Excel file. Please ensure it matches the expected format.')
        console.error(error)
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleUpload = async () => {
    if (previewData.length === 0) {
      alert('No data to upload')
      return
    }

    setUploading(true)
    setUploadResults(null)

    let successCount = 0
    let failedCount = 0
    const errors: string[] = []

    // Get existing SL numbers and item codes to avoid duplicates
    const { data: existingItems } = await supabase
      .from('marine_inventory')
      .select('sl_no, item_code')

    const existingSlNos = new Set(existingItems?.map(item => item.sl_no) || [])
    const existingItemCodes = new Set(
      existingItems?.map(item => item.item_code).filter(code => code) || []
    )

    for (const item of previewData) {
      try {
        // Check if equipment_name is still empty after transformation
        if (!item.equipment_name) {
          errors.push(`Row with SL No ${item.sl_no}: Equipment name is required`)
          failedCount++
          continue
        }

        // Ensure unique SL No
        let finalSlNo = item.sl_no
        let counter = 1
        while (existingSlNos.has(finalSlNo)) {
          finalSlNo = `${item.sl_no}-${counter}`
          counter++
        }
        existingSlNos.add(finalSlNo)

        // Ensure unique item_code or set to null if empty
        let finalItemCode = item.item_code || null
        if (finalItemCode) {
          let codeCounter = 1
          const originalCode = finalItemCode
          while (existingItemCodes.has(finalItemCode)) {
            finalItemCode = `${originalCode}-${codeCounter}`
            codeCounter++
          }
          existingItemCodes.add(finalItemCode)
        }

        const dataToInsert = {
          sl_no: finalSlNo || null,
          equipment_name: item.equipment_name,
          item_code: finalItemCode,
          description: item.description || null,
          category: 'spare_parts', // Default category
          warehouse_id: selectedWarehouse || null,
          vessel_id: selectedVessel || null,
          quantity: item.quantity || 0,
          unit: item.unit || 'pcs',
          reorder_level: null,
          unit_price: null,
          status: 'in_stock',
          location: item.location || null,
          location_1: item.location_1 || null,
          location_2: item.location_2 || null,
          ref_no: item.ref_no || null,
          remarks: item.remarks || null
        }

        const { error } = await supabase
          .from('marine_inventory')
          .insert([dataToInsert])

        if (error) {
          errors.push(`Row ${item.sl_no}: ${error.message}`)
          failedCount++
        } else {
          successCount++
        }
      } catch (error: any) {
        errors.push(`Row ${item.sl_no}: ${error.message || 'Unknown error'}`)
        failedCount++
      }
    }

    setUploadResults({ success: successCount, failed: failedCount, errors })
    setUploading(false)

    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: ['marine_inventory'] })
    }
  }

  const resetUpload = () => {
    setFile(null)
    setPreviewData([])
    setSelectedVessel('')
    setSelectedWarehouse('')
    setUploadResults(null)
    setDetectedColumns(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bulk Upload Inventory</h1>
        <p className="text-gray-600 mt-1">Upload Excel file to import multiple items at once</p>
      </div>

      {/* Upload Section */}
      {!previewData.length && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-4">
            <div>
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
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Expected Excel Format:</h3>
              <p className="text-sm text-blue-800">
                Columns: <strong>SL No. | EQUIPMENT | ITEM CODE | DESCRIPTION | UNIT | Updated QTY | 
                LOCATION | LOCATION - 1 | LOCATION - 2 | REF. No. | REMARKS</strong>
              </p>
              <p className="text-xs text-blue-700 mt-2">
                ℹ️ Empty fields will be auto-filled: SL No (auto-generated), Equipment ↔ Description (copied)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preview & Configuration */}
      {previewData.length > 0 && !uploadResults && (
        <div className="space-y-6">
          {/* Detected Columns Info */}
          {detectedColumns && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">
                Detected Headers at Row {detectedColumns.headerRow}
              </h3>
              <div className="flex flex-wrap gap-2">
                {detectedColumns.columns.map((col, idx) => (
                  <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    {col}
                  </span>
                ))}
              </div>
              <p className="text-xs text-green-700 mt-2">
                If these columns don't look right, check that your Excel file has clear header names.
              </p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Configure Upload</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Vessel (Optional)
                </label>
                <select
                  value={selectedVessel}
                  onChange={(e) => setSelectedVessel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Not assigned to any vessel</option>
                  {vessels?.map((vessel) => (
                    <option key={vessel.id} value={vessel.id}>{vessel.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link to Warehouse (Optional)
                </label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Not linked to warehouse</option>
                  {warehouses?.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name} - {wh.location}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Preview Data</h2>
                <p className="text-sm text-gray-600">{previewData.length} items ready to upload</p>
              </div>
              <div className="space-x-2">
                <button
                  onClick={resetUpload}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload All
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SL No</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Equipment</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location 1</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location 2</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ref No</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {previewData.map((item, index) => (
                    <tr key={index} className={!item.equipment_name ? 'bg-red-50' : ''}>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.sl_no}</td>
                      <td className="px-4 py-2 text-sm">
                        {item.equipment_name || <span className="text-red-600">Missing!</span>}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{item.item_code || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">{item.description || '-'}</td>
                      <td className="px-4 py-2 text-sm font-medium">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{item.unit}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{item.location || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{item.location_1 || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{item.location_2 || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{item.ref_no || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">{item.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {uploadResults && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Upload Results</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-green-700">Successfully Uploaded</p>
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
                      <div key={index}>• {error}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={resetUpload}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Upload Another File
          </button>
        </div>
      )}
    </div>
  )
}
