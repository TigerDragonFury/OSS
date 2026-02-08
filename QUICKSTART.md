# 🚀 Quick Start Guide - OSS Group System

## Step 1: Set Up the Database

1. **Open Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Login to your account
   - Select your project: `bybdoxmcyrzpavnvddfa`

2. **Run the SQL Schema**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"
   - Open the file `supabase-schema.sql` in this project
   - Copy ALL the contents (Ctrl+A, Ctrl+C)
   - Paste into the Supabase SQL Editor
   - Click "Run" or press Ctrl+Enter
   - Wait for completion (should take 5-10 seconds)
   - You should see "Success. No rows returned"

3. **Verify Tables Created**
   - Click on "Table Editor" in the left sidebar
   - You should see all these tables:
     * companies
     * users
     * employees
     * vessels
     * land_purchases
     * invoices
     * expenses
     * salary_payments
     * And many more...

## Step 2: Start the Application

1. **Open Terminal/PowerShell**
   - Navigate to the project:
     ```powershell
     cd c:\Users\Exceed\Desktop\oss-system
     ```

2. **Start the development server:**
   ```powershell
   npm run dev
   ```

3. **Open your browser:**
   - Go to: http://localhost:3000
   - You should see the OSS Group dashboard

## Step 3: Test the System

### Test Dashboard
1. Visit http://localhost:3000
2. You should be redirected to `/dashboard`
3. Check that you see:
   - Total Income: 0 AED
   - Total Expenses: 0 AED
   - Net Profit: 0 AED
   - Active Employees: 0
   - OSS Marine Services section
   - OSS Scrap Services section
   - Recent Vessels showing "Regina 250"

### Test Marine Services
1. Click "Marine Services" in the top menu OR click "Vessels" in the sidebar
2. You should see the Regina 250 vessel
3. Click on the dollar sign icon to view vessel details
4. Try adding a new vessel:
   - Click "Add Vessel"
   - Fill in the form
   - Click "Create"

### Test Scrap Services
1. Click "Scrap Services" → "Land Purchases"
2. Click "Add Land"
3. Try adding a test land purchase

### Test Finance
1. Click "Finance" → "Invoices"
2. Try creating a test invoice
3. Go to "Finance" → "Expenses"
4. Try adding an expense

### Test HR
1. Click "HR" → "Employees"
2. Try adding a test employee

## Troubleshooting

### Problem: Page shows errors or doesn't load
**Solution**: 
- Make sure you ran the SQL schema in Supabase
- Check that all tables were created
- Verify the `.env.local` file exists with correct credentials

### Problem: "fetch failed" or connection errors
**Solution**:
- Check your internet connection
- Verify Supabase credentials in `.env.local`
- Make sure your Supabase project is active

### Problem: Tables not showing data
**Solution**:
- Go to Supabase Table Editor
- Check if the companies table has 3 rows (OSS Group, OSS Marine Services, OSS Scrap Services)
- Check if vessels table has the Regina 250 entry
- If not, re-run the SQL schema

## Next Steps

1. **Customize the system:**
   - Add your real vessels
   - Add your land purchases
   - Add your employees
   - Start tracking expenses

2. **Explore features:**
   - Vessel detail pages with tabs
   - Financial summaries
   - Real-time profit/loss calculations

3. **Production deployment:**
   - When ready, deploy to Vercel: `vercel`
   - Or push to GitHub and connect to Vercel

## Important Files

- `supabase-schema.sql` - Database structure (RUN THIS FIRST!)
- `.env.local` - Supabase credentials (already configured)
- `README.md` - Full documentation
- `app/dashboard/` - All dashboard pages

## Default Test Data

After running the schema, you'll have:
- **Companies**: OSS Group, OSS Marine Services, OSS Scrap Services
- **Vessel**: Regina 250 (purchase price: 3.2M AED)
- **Equipment Sales**: Pipeline Equipment (5M AED), Generators (180K AED)

## Support

If you encounter any issues:
1. Check the browser console (F12) for errors
2. Check the terminal where `npm run dev` is running
3. Verify all steps in this guide were followed
4. Check that Node.js 18+ is installed: `node --version`

---

**Remember**: Always run `npm run dev` from the project directory before opening the browser!
