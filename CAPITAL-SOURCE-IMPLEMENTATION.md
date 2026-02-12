# Capital Source Tracking - Implementation Steps

## 🎯 Overview
Update the system to distinguish between personal money (new capital) vs company profits (recycled funds) for fair partner comparison.

---

## 📋 Step-by-Step Execution

### **Step 1: Execute SQL Migration in Supabase**
Open Supabase SQL Editor and run:
```sql
-- File: add-capital-source-tracking.sql
-- This recreates owner_account_statement view with new fields:
-- - new_capital_contributed
-- - recycled_funds_used  
-- - net_new_capital
```

**Expected Result:** View updated successfully, no errors

---

### **Step 2: Update Existing Data**
Run the update script to classify existing transactions:
```sql
-- File: update-capital-sources.sql
-- This tags:
-- - Valentine 1 ($701K) as 'equipment_sale' (recycled)
-- - Ali's payments as 'personal_savings' (political decision)
-- - All NULL sources defaulted to 'personal_savings'
```

**Expected Changes:**
- 1 record updated for Valentine 1 → recycled funds
- Multiple records updated from NULL → personal_savings

---

### **Step 3: Verify the Data**
Run the verification query (included in update-capital-sources.sql Step 5):

**Expected Output:**
```
Owner           | Traditional Equity | New Capital | Recycled | Net New Capital | Difference
----------------|-------------------|-------------|----------|-----------------|------------
Ali Al Dalou    | $X,XXX,XXX       | $X,XXX,XXX  | $0       | $X,XXX,XXX     | $0
Majed Al Najjar | $X,XXX,XXX       | $X,XXX,XXX  | $701,000 | $X,XXX,XXX     | $701,000
```

Majed should show $701K in "Recycled Funds" column.

---

### **Step 4: Refresh Owner Equity Page**
1. Navigate to: `/dashboard/finance/owner-equity`
2. Hard refresh: `Ctrl + Shift + R`
3. Verify display shows:
   - ✅ Blue info box explaining equity vs net new capital
   - ✅ "Net New Capital" green box for Majed (if different from equity)
   - ✅ Informal Contributions breakdown shows:
     - "• New Capital (personal)" 
     - "✓ Recycled Funds (company)" for Majed's $701K

---

## 🔍 What This Solves

### Before (Problem):
```
Partner A: Uses personal savings → equity increases
Partner B: Withdraws profit, reinvests → equity increases same amount
Result: Both look equal, but Partner A put in NEW money, Partner B recycled company money
```

### After (Solution):
```
Traditional Equity: $5M each (legal/tax purposes)
  
Net New Capital:
  Partner A: $5M (all personal money)
  Partner B: $3M (only $3M personal, $2M recycled)
  
Fair Comparison: Partner A contributed $2M MORE in true new capital
```

---

## 📊 Your Specific Case

### Majed:
- **Traditional Equity**: Includes all vessel purchases
- **Net New Capital**: Excludes Valentine 1 ($701K from equipment sale)
- **Display**: Shows he used $701K recycled company funds

### Ali:
- **Traditional Equity**: Includes all expenses/contributions
- **Net New Capital**: Same (all tagged as personal for peace)
- **Display**: All contributions count as new capital

### Political Decision:
Ali's $1.25M payment tagged as `personal_savings` even though it might be Regina scrap proceeds. This avoids the fight about the pipelay equipment sale imbalance.

---

## ⚠️ Important Notes

1. **Don't delete anything** - we're only updating `source_of_funds` classification
2. **Run in order** - Migration first, then updates, then verify
3. **Take screenshot** of before/after equity page for records
4. **Partners will see** "Net New Capital" as the fair comparison metric

---

## 🐛 Troubleshooting

### "View already exists" error
```sql
DROP VIEW IF EXISTS owner_account_statement CASCADE;
-- Then run the CREATE VIEW again
```

### "Column doesn't exist" error
The view wasn't recreated. Run add-capital-source-tracking.sql again.

### Net New Capital not showing
- Check database: `SELECT new_capital_contributed, recycled_funds_used FROM owner_account_statement`
- If NULL, the view recreation failed

### UI not updating
- Hard refresh: `Ctrl + Shift + R`
- Check browser console for errors
- Verify Supabase connection is working

---

## ✅ Success Criteria

- [ ] SQL migration executed without errors
- [ ] Valentine 1 tagged as `equipment_sale`
- [ ] Verification query shows correct breakdown
- [ ] UI displays Net New Capital (green box)
- [ ] Informal Contributions shows capital source split
- [ ] Partners can see fair comparison metric
