# Role-Based Access Control - Implementation Guide

## ✅ What Has Been Implemented

### 1. **Enhanced Permission System** (`lib/auth/rolePermissions.ts`)

**New Helper Functions:**
```typescript
// Check if purchase prices should be hidden
shouldHidePrices(role: string): boolean

// Get masked value for sensitive data
getMaskedValue(value: any, role: string): string
```

**Updated Permission Restrictions:**

| Role | Can Edit | Can Delete | See Prices | Financial Totals |
|------|----------|------------|------------|------------------|
| **Admin** | ✅ Everything | ✅ Everything | ✅ Yes | ✅ All |
| **Accountant** | ✅ Expenses, Inventory | ❌ No | ❌ No | ❌ Net Profit Hidden |
| **HR** | ✅ Employees, Salaries | ❌ Salary Records | ❌ No | ❌ All Hidden |
| **Storekeeper** | ✅ Inventory, Equipment | ✅ Inventory Only | ❌ No | ❌ All Hidden |

---

## 2. **Pages Already Updated**

### ✅ Vessels Page (`app/dashboard/marine/vessels/page.tsx`)
- ✅ Purchase price hidden for non-admin
- ✅ Total costs & net profit hidden for non-admin
- ✅ Edit button only shows for users with edit permission
- ✅ Delete button only shows for users with delete permission  
- ✅ Add button only shows for users with create permission

### ✅ Lands Page (`app/dashboard/scrap/lands/page.tsx`)
- ✅ Purchase price hidden for non-admin
- ✅ Edit/Delete buttons controlled by permissions
- ✅ Add button only for authorized users

### ✅ Reports Page (`app/dashboard/finance/reports/page.tsx`)
- ✅ All-time net profit hidden for non-admin
- ✅ All-time cash totals hidden for non-admin

### ✅ Dashboard Layout (`app/dashboard/layout.tsx`)
- ✅ Navigation filtered based on role
- ✅ Entire sections hidden if user can't access

---

## 3. **How It Works - Code Examples**

### Hide Purchase Prices Pattern:
```typescript
import { shouldHidePrices } from '@/lib/auth/rolePermissions'
import { useAuth } from '@/lib/auth/AuthContext'

const { user } = useAuth()
const userRole = user?.role || user?.roles?.[0] || 'storekeeper'
const hidePrices = shouldHidePrices(userRole)

// In JSX:
{!hidePrices && (
  <div>
    <p className="text-sm text-gray-600">Purchase Price</p>
    <p className="font-medium">{item.purchase_price?.toLocaleString()} AED</p>
  </div>
)}
```

### Control Edit/Delete Buttons Pattern:
```typescript
import { hasModulePermission } from '@/lib/auth/rolePermissions'

const canEdit = hasModulePermission(userRole, ['marine', 'vessels'], 'edit')
const canDelete = hasModulePermission(userRole, ['marine', 'vessels'], 'delete')
const canCreate = hasModulePermission(userRole, ['marine', 'vessels'], 'create')

// In JSX:
{canEdit && (
  <button onClick={() => setEditingItem(item)}>
    <Edit className="h-5 w-5" />
  </button>
)}

{canDelete && (
  <button onClick={() => handleDelete(item)}>
    <Trash2 className="h-5 w-5" />
  </button>
)}

{canCreate && (
  <button onClick={() => setIsAdding(true)}>
    <Plus className="h-5 w-5" /> Add New
  </button>
)}
```

---

## 4. **Pages That Still Need Updates**

### 🔧 Equipment Pages
**Location:** `app/dashboard/scrap/equipment/page.tsx`
**Changes Needed:**
- Hide cost/purchase price for non-admin
- Control edit/delete buttons
- Accountant cannot edit equipment purchases
- Storekeeper can manage but not delete

### 🔧 Warehouse Pages  
**Location:** `app/dashboard/marine/warehouses/page.tsx`
**Changes Needed:**
- Hide warehouse setup costs for non-admin
- Storekeeper view-only on warehouse structure
- Accountant can view but not edit

### 🔧 Expense Pages
**Location:** `app/dashboard/finance/expenses/page.tsx`
**Changes Needed:**
- Accountant can edit but not delete expenses
- Storekeeper cannot access
- HR cannot access

### 🔧 Bank Accounts Page
**Location:** `app/dashboard/finance/bank-accounts/page.tsx`
**Changes Needed:**
- Hide opening balances for non-admin/non-accountant
- Accountant cannot edit bank accounts (view only)
- HR and Storekeeper no access

### 🔧 Employee/Salary Pages
**Location:** `app/dashboard/hr/employees/page.tsx`, `app/dashboard/hr/salaries/page.tsx`
**Changes Needed:**
- HR can edit employees and salaries
- HR **cannot delete** salary records (accountability)
- Others no access except admin

---

## 5. **Quick Implementation Steps for Any Page**

### Step 1: Add Imports
```typescript
import { useAuth } from '@/lib/auth/AuthContext'
import { shouldHidePrices, hasModulePermission } from '@/lib/auth/rolePermissions'
```

### Step 2: Get User Role & Permissions
```typescript
const { user } = useAuth()
const userRole = user?.role || user?.roles?.[0] || 'storekeeper'
const hidePrices = shouldHidePrices(userRole)
const canEdit = hasModulePermission(userRole, ['module', 'submodule'], 'edit')
const canDelete = hasModulePermission(userRole, ['module', 'submodule'], 'delete')
const canCreate = hasModulePermission(userRole, ['module', 'submodule'], 'create')
```

### Step 3: Wrap Sensitive Data
```typescript
{!hidePrices && (
  <div>
    <p>Purchase Price</p>
    <p>{item.purchase_price?.toLocaleString()} AED</p>
  </div>
)}
```

### Step 4: Wrap Action Buttons
```typescript
{canEdit && <button onClick={handleEdit}>Edit</button>}
{canDelete && <button onClick={handleDelete}>Delete</button>}
{canCreate && <button onClick={handleAdd}>Add</button>}
```

---

## 6. **Testing Checklist**

### Test as ADMIN
- [ ] Can see all purchase prices
- [ ] Can see all financial totals
- [ ] Can edit any record
- [ ] Can delete any record
- [ ] Can access all navigation sections

### Test as ACCOUNTANT
- [ ] Cannot see purchase prices (vessels, lands, equipment)
- [ ] Cannot see all-time net profit in reports
- [ ] Can edit expenses but not delete
- [ ] Cannot edit bank accounts
- [ ] Cannot access HR section

### Test as HR
- [ ] Cannot access finance section
- [ ] Can edit employees
- [ ] Can create salaries but not delete them
- [ ] Cannot see any financial totals
- [ ] Only sees HR navigation

### Test as STOREKEEPER
- [ ] Cannot see purchase prices
- [ ] Can manage inventory (full control)
- [ ] Can track equipment but not delete
- [ ] Can use Quick Entry for sales
- [ ] Very limited navigation (warehouse focus)

---

## 7. **Permission Configuration Reference**

Located in: `lib/auth/rolePermissions.ts`

To modify what a role can do:
1. Find the role in `ROLE_PERMISSIONS` object
2. Update the module access:
   ```typescript
   moduleName: {
     canView: true/false,
     canCreate: true/false,
     canEdit: true/false,
     canDelete: true/false,
     hideTotals: true/false
   }
   ```

---

## 8. **Security Notes**

### Current Implementation: UI-Level Only
- ✅ Quick to implement
- ✅ Good UX (users don't see what they can't access)
- ⚠️ Can be bypassed by tech-savvy users with browser tools

### Recommended Next Steps:
1. **Add Server-Side Validation** - Validate permissions in API routes
2. **Implement Database RLS** - Row-Level Security in Supabase
3. **Audit Logging** - Track who edits/deletes what

### Example Server-Side Check (Future):
```typescript
// In API route or server action
import { getUserRole } from '@/lib/auth/server'
import { hasModulePermission } from '@/lib/auth/rolePermissions'

export async function deleteVessel(vesselId: string) {
  const role = await getUserRole()
  
  if (!hasModulePermission(role, ['marine', 'vessels'], 'delete')) {
    throw new Error('Unauthorized: You cannot delete vessels')
  }
  
  // Proceed with deletion
}
```

---

## 9. **Common Patterns Library**

### Pattern 1: Conditional Data Fields
```typescript
const dataFields = [
  { label: 'Name', value: item.name },
  { label: 'Location', value: item.location },
  !hidePrices && { label: 'Price', value: item.price?.toLocaleString() + ' AED' },
  { label: 'Status', value: item.status }
].filter(Boolean) // Remove null/undefined entries
```

### Pattern 2: Masked Values
```typescript
import { getMaskedValue } from '@/lib/auth/rolePermissions'

<p>{getMaskedValue(vessel.purchase_price, userRole)} AED</p>
// Admin sees: "150000 AED"
// Others see: "*** AED"
```

### Pattern 3: Role-Based Table Columns
```typescript
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'location', label: 'Location' },
  ...(hidePrices ? [] : [{ key: 'price', label: 'Purchase Price' }]),
  { key: 'status', label: 'Status' }
]
```

---

## 10. **Next Steps Recommendation**

**Priority 1 - High Impact:**
1. ✅ **DONE:** Vessels page - hide purchase prices
2. ✅ **DONE:** Lands page - hide purchase prices  
3. ✅ **DONE:** Reports page - hide net profit
4. ✅ **DONE:** Navigation filtering
5. 🔧 **TODO:** Equipment page - hide costs
6. 🔧 **TODO:** Bank accounts - restrict editing

**Priority 2 - Security:**
7. 🔧 **TODO:** Expenses page - accountant can't delete
8. 🔧 **TODO:** HR pages - can't delete salaries
9. 🔧 **TODO:** Add server-side permission validation

**Priority 3 - Enhancement:**
10. 🔧 **TODO:** Add audit logging for edits/deletes
11. 🔧 **TODO:** Implement database RLS policies
12. 🔧 **TODO:** Add permission change notifications

---

## Summary

**✅ Implemented:**
- Role-based navigation filtering
- Purchase price hiding for vessels and lands
- Edit/delete button controls
- Financial total restrictions in reports
- Comprehensive permission system

**⏳ Remaining:**
- Apply same patterns to 5-6 more pages
- Add server-side validation
- Implement audit logging

**Time Estimate:** 2-3 hours to complete all remaining pages following the patterns above.
