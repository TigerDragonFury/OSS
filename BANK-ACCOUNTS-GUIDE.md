# Bank Accounts & Transaction Management Guide

> **NEW FEATURE:** Complete bank account reconciliation and quick transaction entry system for accurate financial tracking.

---

## Overview

This system allows you to:
1. **Manage Multiple Bank Accounts** - Track checking, savings, business accounts, or cash reserves
2. **Quick Entry Transactions** - Record sales and expenses in seconds
3. **Auto-Reconcile Balance** - Compare system-calculated balance with actual bank balance
4. **Track Payment Methods** - Record how money moved (cash, transfer, cheque)

---

## Part 1: Bank Account Management

### Access the Bank Accounts Page
**Navigate to:** Dashboard → Finance → Bank Accounts

### What You See

Each bank account card shows:

| Item | What It Means |
|------|---------------|
| **Opening Balance** | Balance when you created the account |
| **Total Income** | All deposits/sales to this account |
| **Total Expenses** | All payments from this account |
| **Calculated Balance** | Opening + Income - Expenses |
| **Manual Balance** | Current balance in real bank (you enter this) |
| **Variance** | Difference showing if numbers match |

---

### Example: Main Operating Account

```
Opening Balance:      100,000 AED
+ Total Income:       450,000 AED (sales, rentals, etc.)
- Total Expenses:     320,000 AED (payments, contractors, etc.)
= Calculated Balance: 230,000 AED
```

When you check your actual bank balance in the bank app: **230,000 AED** ✓ **MATCHES!**
- Status shows: **Reconciled** (green checkmark)

---

### Creating a New Bank Account

1. **Click "New Account"** button (top right)
2. **Fill in:**
   - Account Name (e.g., "Main Operating Account")
   - Bank Name (e.g., "Emirates NBD")
   - Account Number (your account #)
   - Account Type (Business, Checking, Savings)
   - Opening Balance (amount when you opened it)
   - Opening Date (when opened)

3. **Click "Create Account"**

---

### Recording Current Balance (Reconciliation)

Every day, week, or whenever you want to verify:

1. **Log into your bank** and check actual balance
2. **Go to Bank Accounts page**
3. **Click "Record Current Balance"** button on the account
4. **Enter the amount** you see in bank
5. **System automatically calculates:**
   - If variance = 0 → **Status: Reconciled** ✓
   - If variance > 0 → **Status: Variance** ⚠️ (something doesn't match)

---

### What If Variance Doesn't Match?

**Example:** You recorded 230,000 AED in system but bank shows 225,000 AED
- **Variance:** -5,000 AED
- **Possible causes:**
  - Pending transaction not recorded
  - Bank fee not entered as expense
  - Cheque payment that cleared late
  - Data entry mistake in a transaction

**How to fix:**
1. Review recent transactions
2. Check for missing expenses (bank fees, interest, etc.)
3. Verify large transactions
4. Add missing expense if found
5. Re-record balance

---

## Part 2: Quick Transaction Entry

### Access Quick Entry Page
**Navigate to:** Dashboard → Finance → Quick Entry

This page has THREE tabs for fast data entry:

---

### Tab 1: Scrap Sales

**Use when:** You sold scrap metal/materials

**Steps:**
1. Select the **Land** you scraped
2. Enter **Sale Date**
3. Enter **Material Type** (Steel, Copper, Aluminum, etc.)
4. Enter **Quantity** (in tons)
5. Enter **Price per Ton**
6. **Total auto-calculates** (Quantity × Price)
7. Enter **Buyer Name**
8. Select **Buyer Company** (optional)
9. Select **Payment Method:** 
   - Bank Transfer
   - Cash
   - Cheque
10. Click **Record Sale**

**What happens automatically:**
- Scrap sale recorded in database
- Income record created (shows on Reports page)
- Running balance updated
- Links back to the land for traceability

---

### Tab 2: Equipment Sales

**Use when:** You sold equipment from warehouse

**Steps:**
1. Select **Warehouse** (where equipment was stored)
2. Select **Sale Date**
3. Select **Equipment** (from list of items in warehouse)
4. Enter **Item Name** (if not in list)
5. Enter **Sale Price** (AED)
6. Enter **Customer Name**
7. Select **Customer Company** (optional)
8. Select **Payment Method**
9. Click **Record Sale**

**What happens automatically:**
- Equipment sale recorded
- Income record created
- Traces back to original land purchase for full audit trail

---

### Tab 3: Expenses

**Use when:** You paid a contractor, bought materials, paid utilities, etc.

**Steps:**
1. Enter **Expense Type** (Labor, Materials, Fuel, Equipment, etc.)
2. Select **Category** (Labor, Materials, Fuel, Utilities, Other)
3. Enter **Amount** (AED)
4. Enter **Date** (when paid)
5. Enter **Vendor Name** (contractor, supplier, etc.)
6. Select **Payment Method:**
   - Bank Transfer
   - Cash
   - Cheque (record cheque # in description)
7. Enter **Description** (optional but helpful)
   - Example: "Cheque #4521 for docking operations"
   - Example: "Cash withdrawal for daily operations"
8. Click **Record Expense**

**What happens automatically:**
- Expense recorded in system
- Marked as "paid" automatically
- Shows on Reports page immediately
- Deducted from calculated balance

---

## Part 3: Complete Workflow Example

### Scenario: You Scrapped a Land and Made Multiple Sales

**Day 1: Scrap Sale**
1. Go to **Quick Entry → Scrap Sales**
2. Select "Land A - Dubai"
3. Date: 2026-02-16
4. Material: Steel
5. Quantity: 100 tons
6. Price: 450 AED/ton
7. **Total: 45,000 AED** ✓
8. Buyer: Al Khaleej Steel
9. Payment: Bank Transfer
10. **Record** → Income created for 45,000 AED

**Day 2: Contractor Payment**
1. Go to **Quick Entry → Expenses**
2. Expense Type: Labor
3. Category: Labor
4. Amount: 35,000 AED
5. Date: 2026-02-17
6. Vendor: Fast Demolition LLC
7. Payment: Bank Transfer
8. Description: "Payment for demolition & site clearance"
9. **Record** → Expense created for 35,000 AED

**Day 3: Equipment Sale**
1. Go to **Quick Entry → Equipment Sales**
2. Warehouse: Dubai Warehouse
3. Equipment: Pipeline (from warehouse)
4. Sale Price: 8,000 AED
5. Customer: Industrial Parts Co
6. Payment: Cheque
7. **Record** → Income created for 8,000 AED

**Day 4: Bank Reconciliation**
1. Go to **Bank Accounts**
2. Check your bank: Shows new balance
3. Click "Record Current Balance"
4. Enter: 53,000 AED (45,000 + 8,000 - 35,000 + other activity)
5. System calculates → **Matches!** ✓

---

## Part 4: Payment Methods

Your system tracks how money moved:

### Bank Transfer
- Fastest method
- Low/no fees
- Used for business-to-business
- **Record in:** Quick Entry, payment method = "Transfer"

### Cash
- Immediate
- Manual tracking required
- Warning: Easy to lose track
- **Record in:** Quick Entry, payment method = "Cash"
- **Tip:** Record same day to avoid forgotten transactions

### Cheque
- Creates a trail (cheque number)
- Takes time to clear
- **Record in:** Quick Entry, payment method = "Cheque"
- **In description:** Write cheque number and details
- Example: "Cheque #4521 to ABC Contractors"

---

## Part 5: Reports & Reconciliation

### Viewing Transactions with Filters

**Dashboard → Finance → Reports** shows:
- **All-Time Cash In:** Total income across all accounts
- **All-Time Cash Out:** Total expenses
- **Net Profit:** Income minus expenses
- **Cashflow Analysis:** Filter by date, transaction type
- **Export:** Download as Excel or Text

### Quick Reference
- **Quick Entry → Scrap Sales:** Fast scrap recording
- **Quick Entry → Equipment:** Fast equipment sales  
- **Quick Entry → Expenses:** Fast payment recording
- **Bank Accounts:** Reconciliation & balance tracking
- **Reports:** See all income/expenses, download data

---

## Best Practices

### ✅ DO
- ✓ Record transactions **same day** while you remember
- ✓ Use **Quick Entry** for fast data entry
- ✓ **Reconcile bank balance** weekly
- ✓ Include **payment method** always
- ✓ Add **descriptions** for context (cheque #, contractor name)
- ✓ Check **variance** - if it doesn't match, investigate

### ❌ DON'T
- ✗ Don't delay recording - you'll forget transactions  
- ✗ Don't leave payment method blank
- ✗ Don't assume variance = error (check bank first)
- ✗ Don't ignore differences > 5,000 AED

---

## FAQ

**Q: Can I have multiple bank accounts?**
A: Yes! Create as many as you need (personal, business, savings, cash reserve)

**Q: What if I make a mistake?**
A: Edit the original transaction in Expenses/Reports. The balance automatically recalculates.

**Q: How do I track pending cheques?**
A: Record them as expenses when issued. When they clear, balances match automatically.

**Q: What if bank and system don't match, and it's company's fault?**
A: Document it! Note variance amount. Reach out to bank to verify (could be delayed transaction clearing)

**Q: Can I export financial data?**
A: Yes! **Reports page → Export to Excel/Text** to get all transactions

**Q: How often should I reconcile?**
A: Ideally weekly. At minimum, monthly before financial statements.

---

## Support

Having issues? Check:
1. Is the account marked as "active"?
2. Have you recorded a transaction with this account?
3. Is the variance reasonable (< 10,000 AED)?
4. Is the transaction date correct?

If still stuck, review the transaction history in Reports page to trace the issue.

---

**Your system is now ready for full financial tracking!** 🎉
