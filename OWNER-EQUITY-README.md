# Owner Equity Tracking System

## Overview
This system tracks which owner paid for what expenses to ensure fair contribution tracking between the 2 owners.

## Setup

### 1. Run Database Migration
```bash
npm run migrate
```

This will create:
- `owners` table
- `capital_contributions` table
- `capital_withdrawals` table
- Add `paid_by_owner_id` columns to vessels, expenses, salaries, movements, lands
- Create `owner_equity_summary` VIEW

### 2. Add Your Owners
1. Go to: http://localhost:3000/dashboard/finance/owner-equity/manage
2. Click "Add Owner" button
3. Enter:
   - Owner name
   - Email (optional)
   - Ownership percentage (e.g., 50% each)
   - Initial capital (if they already invested money)
4. Save both owners

## How to Use

### Track Who Paid for Vessels
When you add/edit a vessel, you'll see a dropdown "Paid By Owner" - select which owner paid the purchase price.

### Track Who Paid for Expenses
When recording expenses, select which owner paid for that expense from the "Paid By Owner" dropdown.

### Record Direct Capital Contributions
If an owner puts cash directly into the business:
1. Go to: /dashboard/finance/owner-equity/manage
2. Click "Add Contribution" on the owner's card
3. Enter amount, date, and description
4. Save

### Record Profit Distributions
When taking money out of the business:
1. Go to: /dashboard/finance/owner-equity/manage
2. Click "Add Withdrawal" on the owner's card
3. Enter amount and distribution type
4. Save

### View Equity Balance
Go to: http://localhost:3000/dashboard/finance/owner-equity

This page shows:
- Total invested by each owner
- Breakdown by category (vessels, expenses, salaries, etc.)
- Current equity position for each owner
- Balance alert if contributions are unequal
- Complete transaction history

## What Gets Tracked

The system tracks contributions from:
1. **Vessel Purchases** - Who paid to buy each vessel
2. **Operating Expenses** - Day-to-day business expenses
3. **Salaries** - Employee payroll payments
4. **Movement Costs** - Vessel transportation costs
5. **Land Purchases** - Property acquisitions
6. **Capital Contributions** - Direct cash injections
7. **Withdrawals** - Profit distributions taken out

## Equity Calculation

```
Owner's Current Equity = 
  Initial Capital
  + Additional Contributions
  + Vessel Purchases Paid
  + Expenses Paid
  + Salaries Paid
  + Movement Costs Paid
  + Land Purchases Paid
  - Withdrawals
```

## Balancing Owners

If Owner 1 has contributed $100,000 and Owner 2 has contributed $80,000:
- The system will show a $20,000 difference
- Owner 2 should either:
  - Pay for future expenses until balanced
  - Make a direct capital contribution of $20,000
  - Take less profit in future distributions

## Next Steps

After running migrations, you need to:
1. Add the two owners in the system
2. Update existing vessels to indicate who paid for them
3. Update existing expenses to indicate who paid
4. Going forward, always select the owner when recording new transactions

## Future Enhancements

You may want to add:
- Revenue attribution (who gets credit for which income)
- Automatic profit distribution calculations
- Owner capital account statements (PDF export)
- Email notifications when equity becomes unbalanced
