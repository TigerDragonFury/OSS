# Inventory Management & Equipment Replacement Guide

## Overview
This system provides comprehensive tools for managing marine inventory, tracking usage, and handling equipment replacements.

## Features Implemented

### 1. Warehouse Page Enhancements
**Location:** `/dashboard/marine/warehouses/[id]/page.tsx`

**New Features:**
- ✅ Pagination for marine inventory (10 items per page)
- ✅ Search filter for equipment names and descriptions
- ✅ Category filter dropdown
- ✅ Status filter (In Stock, Low Stock, Out of Stock)
- ✅ Equipment names truncated with "..." for long names (hover to see full name)
- ✅ Filtered count display
- ✅ Empty states for no results

**Usage:**
```typescript
// Filters automatically reset pagination to page 1
// Long names truncated at 30 characters for equipment, 40 for description
```

---

### 2. Inventory Usage Tracking

**New Database Tables:**
- `inventory_usage` - Records when parts are used
- Automatic inventory quantity deduction via triggers
- Links to maintenance_schedules or overhaul_projects

**Component:** `components/UseInventoryModal.tsx`

**How to Use:**

```typescript
import UseInventoryModal from '@/components/UseInventoryModal'

// In your component:
const [showUseInventory, setShowUseInventory] = useState(false)

<UseInventoryModal
  isOpen={showUseInventory}
  onClose={() => setShowUseInventory(false)}
  vesselId={vesselId}
  maintenanceScheduleId={maintenanceId} // optional
  overhaulProjectId={overhaulId} // optional
  onSuccess={() => {
    // Refresh your data
    queryClient.invalidateQueries(['maintenance'])
  }}
/>
```

**Features:**
- Search available inventory
- Select multiple items
- Set quantity to use for each item
- Add notes for each usage
- Automatic cost calculation
- Automatic inventory deduction
- Links usage to maintenance or overhaul work

**Example Workflow:**
1. During maintenance on Valentine 3
2. Click "Use Inventory" button
3. Search for "engine oil" or "spark plug"
4. Select items and set quantities
5. Add notes like "Replaced during engine service"
6. Click "Record Usage"
7. Inventory automatically decreases
8. Usage linked to maintenance record

---

### 3. Equipment Replacement Workflow

**New Database Tables:**
- `vessel_equipment` - Track equipment installed on vessels
- `equipment_replacements` - Record of all replacements
- Automatic inventory deduction when sourced from inventory

**Component:** `components/ReplaceEquipmentModal.tsx`

**How to Use:**

```typescript
import ReplaceEquipmentModal from '@/components/ReplaceEquipmentModal'

// In your component:
const [showReplace, setShowReplace] = useState(false)

<ReplaceEquipmentModal
  isOpen={showReplace}
  onClose={() => setShowReplace(false)}
  vesselId={vesselId}
  vesselName="Valentine 3"
  maintenanceScheduleId={maintenanceId} // optional
  overhaulProjectId={overhaulId} // optional
  onSuccess={() => {
    // Refresh your data
  }}
/>
```

**Features:**
- Record failed equipment details
- Specify failure reason and date
- Choose replacement source:
  - **From Inventory** - Use spare parts from warehouse
  - **New Purchase** - Bought new equipment
  - **Repaired** - Old equipment was fixed
- Set disposition of old equipment:
  - Send to warehouse (creates land_equipment record)
  - Scrapped
  - Sent for repair
  - Sold
  - Disposed
- Track replacement and labor costs
- Automatic inventory deduction

**Example Workflow:**
1. Main engine breaks down on Valentine 3
2. Click "Replace Equipment" button
3. Fill in:
   - Equipment Name: "Main Engine"
   - Failure Reason: "Crankshaft seized due to lack of oil"
   - Old Equipment: "Send to Warehouse" → Select "Main Warehouse"
4. Replacement:
   - Source: "From Inventory"
   - Select: "MAN B&W Engine 2500HP" from inventory
   - Replacement Cost: Auto-filled from inventory
   - Labor Cost: 50,000 BDT
5. Click "Record Replacement"
6. Results:
   - Old engine moved to warehouse as land_equipment (condition: poor)
   - New engine deducted from inventory
   - Replacement record created with total cost
   - Linked to overhaul/maintenance project

---

## Database Schema

### Run These SQL Files:

1. **supabase-schema.sql** (if not already run)
   - Creates basic tables

2. **inventory-usage-schema.sql** (NEW - must run)
   - Creates `inventory_usage` table
   - Creates `vessel_equipment` table
   - Creates `equipment_replacements` table
   - Adds automatic triggers for inventory deduction
   - Creates reporting views

3. **inventory-ledger.sql** (NEW - must run)
  - Creates `inventory_ledger` table
  - Logs usage, replacements, and movements
  - Adds `inventory_ledger_view` with running balance

### Important Views Created:

- `inventory_usage_by_vessel` - Summary of parts used per vessel
- `equipment_replacement_history` - Complete replacement history
- `low_stock_inventory` - Alert for items needing reorder
- `inventory_ledger_view` - Item-level ledger with running balance

---

## Integration Examples

### For Vessel Detail Page:

```typescript
'use client'

import { useState } from 'react'
import UseInventoryModal from '@/components/UseInventoryModal'
import ReplaceEquipmentModal from '@/components/ReplaceEquipmentModal'
import { Package, AlertTriangle } from 'lucide-react'

export default function VesselDetailPage({ params }) {
  const [showUseInventory, setShowUseInventory] = useState(false)
  const [showReplace, setShowReplace] = useState(false)

  return (
    <div>
      {/* Your vessel details */}
      
      <div className="flex gap-3">
        <button
          onClick={() => setShowUseInventory(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          <Package className="h-5 w-5" />
          Use Inventory
        </button>
        
        <button
          onClick={() => setShowReplace(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg"
        >
          <AlertTriangle className="h-5 w-5" />
          Replace Equipment
        </button>
      </div>

      <UseInventoryModal
        isOpen={showUseInventory}
        onClose={() => setShowUseInventory(false)}
        vesselId={params.id}
      />

      <ReplaceEquipmentModal
        isOpen={showReplace}
        onClose={() => setShowReplace(false)}
        vesselId={params.id}
        vesselName={vessel?.name}
      />
    </div>
  )
}
```

### For Maintenance Page:

```typescript
// Add to maintenance detail or form
<UseInventoryModal
  isOpen={showUseInventory}
  onClose={() => setShowUseInventory(false)}
  vesselId={maintenanceRecord.vessel_id}
  maintenanceScheduleId={maintenanceRecord.id}
  onSuccess={() => {
    queryClient.invalidateQueries(['maintenance'])
  }}
/>
```

### For Overhaul Page:

```typescript
// Add to overhaul project detail
<UseInventoryModal
  isOpen={showUseInventory}
  onClose={() => setShowUseInventory(false)}
  vesselId={project.vessel_id}
  overhaulProjectId={project.id}
  onSuccess={() => {
    queryClient.invalidateQueries(['overhaul_projects'])
  }}
/>
```

---

## API Queries

### Fetch Inventory Usage History:

```typescript
const { data: usageHistory } = useQuery({
  queryKey: ['inventory_usage', vesselId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('inventory_usage')
      .select(`
        *,
        marine_inventory(equipment_name, category),
        vessels(name),
        employees(name)
      `)
      .eq('vessel_id', vesselId)
      .order('usage_date', { ascending: false })
    if (error) throw error
    return data
  }
})
```

### Fetch Equipment Replacement History:

```typescript
const { data: replacements } = useQuery({
  queryKey: ['equipment_replacements', vesselId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('equipment_replacements')
      .select(`
        *,
        vessels(name),
        warehouses(name, location),
        employees(name)
      `)
      .eq('vessel_id', vesselId)
      .order('replacement_date', { ascending: false })
    if (error) throw error
    return data
  }
})
```

### Fetch Low Stock Items:

```typescript
const { data: lowStock } = useQuery({
  queryKey: ['low_stock_inventory'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('low_stock_inventory') // This is a view
      .select('*')
    if (error) throw error
    return data
  }
})
```

---

## Business Workflows

### Scenario 1: Engine Oil Change
1. Navigate to vessel "Valentine 3"
2. Click "Use Inventory"
3. Search "engine oil"
4. Select "Marine Engine Oil 15W40"
5. Set quantity: 20 liters
6. Notes: "Regular oil change - 500 hours"
7. Submit → Inventory auto-decreases by 20

### Scenario 2: Generator Breakdown
1. Navigate to vessel maintenance page
2. Click "Replace Equipment"
3. Old Equipment:
   - Name: "Emergency Generator #2"
   - Failure: "Bearing seized, unable to start"
   - Disposition: "Send to Main Warehouse"
4. New Equipment:
   - Source: "From Inventory"
   - Select: "Cummins Generator 100KW"
   - Labor: 30,000 BDT
5. Submit → Old generator in warehouse, new one installed, inventory decreases

### Scenario 3: Pump Replacement During Overhaul
1. Open overhaul project for Valentine 3
2. Click "Replace Equipment"
3. Old: "Bilge Pump #1" → "Scrapped"
4. New: From Inventory → "Centrifugal Pump 500GPM"
5. Linked to overhaul project
6. Costs added to project budget

---

## Next Steps

1. **Run SQL Migration:**
   ```
   Run inventory-usage-schema.sql in Supabase SQL Editor
  Run inventory-ledger.sql in Supabase SQL Editor
   ```

2. **Update RLS Policies:**
   ```sql
   ALTER TABLE inventory_usage DISABLE ROW LEVEL SECURITY;
   ALTER TABLE vessel_equipment DISABLE ROW LEVEL SECURITY;
   ALTER TABLE equipment_replacements DISABLE ROW LEVEL SECURITY;
  ALTER TABLE inventory_ledger DISABLE ROW LEVEL SECURITY;
   ```

3. **Add Buttons to Pages:**
   - Vessel detail pages
   - Maintenance pages
   - Overhaul pages

4. **Test Workflow:**
   - Create test inventory items
   - Try using inventory
   - Try replacing equipment
   - Check warehouse for old equipment

---

## Benefits

✅ **Accurate Inventory Tracking** - Know exactly what's used and when
✅ **Cost Tracking** - Track parts and labor costs per vessel
✅ **Equipment History** - Complete record of replacements
✅ **Warehouse Integration** - Failed equipment automatically sent to warehouse
✅ **Maintenance Link** - Connect parts usage to maintenance work
✅ **Low Stock Alerts** - Auto-detect when to reorder
✅ **Reporting** - Pre-built views for analysis

---

## Support

For issues or questions:
1. Check database triggers are created
2. Verify RLS policies are disabled
3. Ensure inventory items have quantity > 0
4. Check console for errors
