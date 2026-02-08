# OSS Group - Complete HR & CRM System

A comprehensive Human Resources and Customer Relationship Management system built for **OSS Marine Services** and **OSS Scrap Services**.

## 🚀 Features

### 🏢 Multi-Company Management
- **OSS Group** (Parent Company)
- **OSS Marine Services** - Marine vessel operations
- **OSS Scrap Services** - Scrap metal and land operations

### ⚓ Marine Services Module
- **Vessel Management**
  - Track vessel purchases, status, and details
  - Equipment sales tracking
  - Scrap metal sales from vessels
  - Movement cost tracking
  - Drydock records and fees
  - Overhaul project management
  - Task tracking for repairs and maintenance
  - Real-time profit/loss calculation per vessel

### 🏗️ Scrap Services Module
- **Land Purchase Management**
  - Track land acquisitions
  - Estimate and monitor tonnage
  - Equipment inventory from lands
  - Equipment sales (as-is or scrapped)
  - Scrap metal sales tracking
  - Remaining inventory monitoring
  - Profit/loss per land project

### 💼 HR Management
- **Employee Management**
  - Employee profiles and records
  - Multiple salary types (monthly, daily, hourly)
  - Department and position tracking
  - Employee status management
- **Salary Management**
  - Salary payment tracking
  - Period-based payments
  - Bonuses and deductions
- **External Labor**
  - Daily rate contractors
  - Project-based labor tracking
  - Cost monitoring

### 💰 Financial Management
- **Invoices**
  - Income invoices
  - Expense invoices
  - Multiple status tracking (draft, sent, paid, overdue)
  - Tax calculations
- **Expenses**
  - Project-linked expenses
  - Category-based tracking
  - Vendor management
  - Approval workflow
- **Comprehensive Reports**
  - Company-wise profit/loss
  - Vessel financial summaries
  - Land project summaries
  - Real-time dashboards

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **State Management**: TanStack Query (React Query)
- **Icons**: Lucide React
- **Deployment**: Vercel-ready

## 📦 Installation

### Prerequisites
- Node.js 18+ installed
- Supabase account (already configured)

### Setup Steps

1. **Navigate to the project directory:**
   ```bash
   cd c:\Users\Exceed\Desktop\oss-system
   ```

2. **Install dependencies (already done):**
   ```bash
   npm install
   ```

3. **Set up the database:**
   - Log in to your Supabase dashboard: https://supabase.com/dashboard
   - Navigate to your project: https://bybdoxmcyrzpavnvddfa.supabase.co
   - Go to the SQL Editor
   - Copy the contents of `supabase-schema.sql`
   - Paste and execute the SQL script

4. **Environment variables are already configured in `.env.local`**

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📋 Database Schema

The system includes comprehensive tables for:

### Core Tables
- `companies` - Multi-company hierarchy
- `users` - User authentication and roles
- `employees` - Employee records
- `salary_payments` - Salary tracking
- `external_labor` - Contract workers

### Marine Services Tables
- `vessels` - Vessel registry
- `vessel_movements` - Movement costs
- `vessel_equipment_sales` - Equipment sales
- `vessel_scrap_sales` - Scrap metal sales
- `drydock_records` - Drydock operations
- `vessel_overhaul_projects` - Overhaul management
- `overhaul_tasks` - Task breakdown

### Scrap Services Tables
- `land_purchases` - Land acquisitions
- `land_equipment` - Equipment inventory
- `land_scrap_sales` - Scrap sales

### Financial Tables
- `invoices` - Income/expense invoices
- `invoice_items` - Invoice line items
- `expenses` - Expense tracking
- `inventory` - General inventory
- `inventory_transactions` - Stock movements

### Views (Auto-calculated)
- `profit_loss_summary` - Company-wise financials
- `vessel_financial_summary` - Per-vessel P&L
- `land_financial_summary` - Per-land P&L

## 🎯 Use Cases

### Example: Regina 250 Vessel (Pre-loaded)
The database includes the Regina 250 vessel as an example:
- **Purchase Price**: 3,200,000 AED
- **Pipeline Equipment Sale**: 5,000,000 AED
- **Generators Sale**: 180,000 AED
- **Status**: Scrapping
- **Net Result**: Automatically calculated in real-time

### Workflow Examples

#### Adding a New Vessel
1. Navigate to Marine Services → Vessels
2. Click "Add Vessel"
3. Enter vessel details (name, purchase price, etc.)
4. Track equipment sales and scrap sales
5. Monitor drydock costs and expenses
6. View real-time profit/loss

#### Managing Land Operations
1. Navigate to Scrap Services → Land Purchases
2. Add new land purchase with estimated tonnage
3. Add equipment found on the land
4. Mark equipment as "sold as-is" or "scrapped"
5. Record scrap metal sales
6. Track expenses (trucks, labor, etc.)
7. View remaining tonnage and profitability

#### Recording Expenses
1. Navigate to Finance → Expenses
2. Add expense with project linkage
3. Link to specific vessel or land
4. Track approval and payment status
5. View in project-specific financial summaries

## 🔐 Security

- Row Level Security (RLS) enabled on all tables
- Authentication required for all operations
- Role-based access control (admin, manager, accountant, operator, viewer)

## 📊 Key Features by Module

### Dashboard
- Real-time KPIs
- Company-wise breakdown
- Recent activity feed
- Quick access to all modules

### Marine Module
- Vessel lifecycle management
- Equipment tracking and sales
- Scrap metal sales recording
- Movement cost tracking
- Drydock management
- Overhaul project tracking with tasks
- Per-vessel financial analysis

### Scrap Module
- Land purchase records
- Equipment inventory management
- Equipment sales (as-is or scrapped)
- Scrap metal sales by tonnage
- Tonnage estimation and tracking
- Per-land financial analysis

### Finance Module
- Dual invoice types (income/expense)
- Comprehensive expense tracking
- Project-linked costs
- Automated financial summaries
- Real-time profit/loss calculations

### HR Module
- Complete employee records
- Flexible salary structures
- External labor management
- Department organization

## 🚀 Deployment

The application is ready to deploy to Vercel:

```bash
npm run build
```

Then deploy using:
```bash
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

## 📝 Initial Data

The database comes pre-loaded with:
- OSS Group (parent company)
- OSS Marine Services (subsidiary)
- OSS Scrap Services (subsidiary)
- Regina 250 vessel with sample sales data

## 🔄 Future Enhancements

Potential additions:
- Document upload and management
- Advanced reporting with charts
- Email notifications
- Mobile app (React Native)
- Advanced analytics and forecasting
- Barcode/QR code inventory tracking
- Automated invoice generation
- Payment gateway integration

## 💡 Tips

1. **Start with companies**: Ensure all three companies are in the database
2. **Link expenses properly**: Always link expenses to vessels/lands for accurate P&L
3. **Update tonnage**: Keep remaining tonnage updated as you sell scrap
4. **Track external labor**: Record all contract workers for complete cost analysis
5. **Regular financial review**: Use the dashboard and financial summaries regularly

## 📞 Support

For questions or issues with the OSS Group system, refer to:
- Supabase Dashboard: https://bybdoxmcyrzpavnvddfa.supabase.co
- Database schema: `supabase-schema.sql`
- Next.js docs: https://nextjs.org/docs

## 🎉 Getting Started

1. Run the SQL schema in Supabase
2. Start the development server: `npm run dev`
3. Navigate to the dashboard
4. Add your first vessel or land purchase
5. Start tracking your operations!

---

Built with ❤️ for OSS Group - Making marine and scrap operations management efficient and transparent.
