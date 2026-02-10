# Partner Transaction Workflow Guide

## Problem Overview
Partners A and B handle money informally outside the company bank account:
- Partner A: Takes scrap sale profits and uses them directly for expenses/land purchases
- Partner B: Keeps vessel equipment sale money personally
- Money flows between partners without going through company books

## Solution: Track Three Types of Transactions

### 1. **Owner Distributions** - When partner takes money
*Use when: Partner receives money from company sales but keeps it personally*

**Examples:**
- Partner B sells vessel equipment for 50,000 AED and keeps the money
- Partner A sells scrap for 30,000 AED and takes the profit

**How to Record:**
```sql
INSERT INTO owner_distributions (owner_id, amount, source_type, description)
VALUES ('partner_b_id', 50000, 'equipment_sale', 'Sold generator from Vessel X');
```

### 2. **Informal Contributions** - When partner spends personal money on company
*Use when: Partner pays for company expense with their own money (including previously distributed profits)*

**Examples:**
- Partner A uses scrap sale money to buy land for the company
- Partner A uses his distributed money to pay a company expense
- Partner B uses equipment sale money to pay for vessel repairs

**How to Record:**
```sql
INSERT INTO informal_contributions (owner_id, amount, transaction_type, description, source_of_funds)
VALUES ('partner_a_id', 200000, 'land_purchase', 'Bought land in Dubai', 'scrap_profit');
```

### 3. **Partner Transfers** - When one partner gives money to another
*Use when: Money moves between partners directly*

**Examples:**
- Partner A gives 40,000 AED from scrap profits to Partner B
- Partner B transfers 25,000 AED to Partner A

**How to Record:**
```sql
INSERT INTO partner_transfers (from_owner_id, to_owner_id, amount, reason)
VALUES ('partner_a_id', 'partner_b_id', 40000, 'Share of scrap sale profits');
```

## Common Scenarios & How to Handle

### Scenario 1: Partner A Sells Scrap and Gives Money to Partner B

**Steps:**
1. Record the scrap sale normally in your scrap sales table
2. Record that Partner A took the profit:
   ```sql
   INSERT INTO owner_distributions (owner_id, amount, source_type, source_id)
   VALUES ('partner_a_id', 50000, 'scrap_sale', 'scrap_sale_id');
   ```
3. Record the transfer to Partner B:
   ```sql
   INSERT INTO partner_transfers (from_owner_id, to_owner_id, amount, reason)
   VALUES ('partner_a_id', 'partner_b_id', 30000, 'Share of scrap sale');
   ```

**Result:** 
- Partner A: +50,000 (distribution) - 30,000 (transfer) = +20,000 net
- Partner B: +30,000 (transfer received)

### Scenario 2: Partner A Uses Scrap Money to Pay Company Expense

**Steps:**
1. Record that Partner A took scrap profit (if not already recorded):
   ```sql
   INSERT INTO owner_distributions (owner_id, amount, source_type)
   VALUES ('partner_a_id', 50000, 'scrap_sale', 'Scrap sale profit week 1');
   ```
2. Record the expense normally with paid_by_owner_id:
   ```sql
   INSERT INTO expenses (amount, description, paid_by_owner_id)
   VALUES (15000, 'Truck rental', 'partner_a_id');
   ```
3. Or record as informal contribution:
   ```sql
   INSERT INTO informal_contributions (owner_id, amount, transaction_type, source_of_funds)
   VALUES ('partner_a_id', 15000, 'expense_payment', 'scrap_profit');
   ```

**Result:** Partner A contributed 15,000 to company using his distributed money

### Scenario 3: Partner A Uses Scrap Money to Buy Land

**Steps:**
1. Record land purchase normally
2. Mark it as paid by Partner A (using paid_by_owner_id in land_purchases)
3. Record as informal contribution:
   ```sql
   INSERT INTO informal_contributions (owner_id, amount, transaction_type, transaction_id, source_of_funds)
   VALUES ('partner_a_id', 200000, 'land_purchase', 'land_purchase_id', 'scrap_profit');
   ```

**Result:** Partner A invested 200,000 of his distributed money back into company

### Scenario 4: Partner B Keeps Equipment Sale Money

**Steps:**
1. Record equipment sale normally
2. Record distribution:
   ```sql
   INSERT INTO owner_distributions (owner_id, amount, source_type, source_id)
   VALUES ('partner_b_id', 75000, 'equipment_sale', 'equipment_sale_id');
   ```

**Result:** Partner B withdrew 75,000 from company

## Partner Account Balances

Use the `owner_account_statement` view to see each partner's true position:

```sql
SELECT * FROM owner_account_statement;
```

**Shows:**
- Initial capital
- Formal contributions/withdrawals
- Distributions taken (money kept from sales)
- Informal contributions (personal money spent on company)
- Partner transfers (in/out)
- Direct payments (from payment_splits)
- **Net account balance** (who owes whom)

## Best Practices

1. **Record distributions immediately** when partner takes money
2. **Track source of funds** when reinvesting distributed money
3. **Document partner transfers** with clear reasons
4. **Review account statements monthly** to ensure fairness
5. **Settle imbalances** when one partner gets too far ahead/behind

## Settlement Process

If Partner A is ahead by 100,000 AED:

**Option 1: Cash Transfer**
```sql
INSERT INTO partner_transfers (from_owner_id, to_owner_id, amount, reason)
VALUES ('partner_b_id', 'partner_a_id', 100000, 'Account settlement Q1 2026');
```

**Option 2: Formal Contribution**
```sql
INSERT INTO capital_contributions (owner_id, amount, notes)
VALUES ('partner_b_id', 100000, 'Catch-up contribution to match Partner A');
```

## Tax & Compliance

- **Distributions = Drawings**: Taxable to partners personally
- **Informal Contributions = Capital**: Increases partner's equity
- **Partner Transfers**: Usually tax-neutral (personal transfers)
- Keep detailed records for audits

## Reports to Run

1. **Monthly Account Statement**: Who's ahead/behind
2. **Distribution Report**: All money taken out by each partner
3. **Contribution Report**: All money put in by each partner
4. **Transfer History**: Money flowing between partners
5. **Reconciliation**: Ensure all informal flows are tracked
