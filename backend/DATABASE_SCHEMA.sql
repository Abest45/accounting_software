-- FinAnalytics Postgres schema (generated from Sequelize models)
-- Run: psql -U <user> -d <db> -f DATABASE_SCHEMA.sql

-- Enable UUID generation (choose pgcrypto if preferred)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  firstName VARCHAR(255),
  lastName VARCHAR(255),
  role VARCHAR(20) NOT NULL DEFAULT 'viewer',
  department VARCHAR(255),
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  lastLogin TIMESTAMP WITH TIME ZONE,
  loginAttempts INTEGER NOT NULL DEFAULT 0,
  lockUntil TIMESTAMP WITH TIME ZONE,
  resetToken VARCHAR(255),
  resetTokenExpires TIMESTAMP WITH TIME ZONE,
  refreshTokenHash VARCHAR(255),
  refreshTokenExpires TIMESTAMP WITH TIME ZONE,
  isLocked BOOLEAN NOT NULL DEFAULT FALSE,
  phone VARCHAR(20),
  twoFactorEnabled BOOLEAN NOT NULL DEFAULT FALSE,
  twoFactorSecret VARCHAR(255),
  backupCodes JSONB NOT NULL DEFAULT '[]',
  emailVerified BOOLEAN NOT NULL DEFAULT FALSE,
  emailVerificationToken VARCHAR(255),
  metadata JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoiceNumber VARCHAR(255) NOT NULL UNIQUE,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clientName VARCHAR(255) NOT NULL,
  clientEmail VARCHAR(255),
  clientPhone VARCHAR(50),
  invoiceDate TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  dueDate TIMESTAMP WITH TIME ZONE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(15,2) NOT NULL,
  taxRate NUMERIC(5,2) NOT NULL DEFAULT 10,
  taxAmount NUMERIC(15,2) NOT NULL,
  discount NUMERIC(15,2) NOT NULL DEFAULT 0,
  totalAmount NUMERIC(15,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  notes TEXT,
  paidDate TIMESTAMP WITH TIME ZONE,
  paymentMethod VARCHAR(50),
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices("userId");
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Receipts
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receiptNumber VARCHAR(255) NOT NULL UNIQUE,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiptDate TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  receivedFrom VARCHAR(255) NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  category VARCHAR(20) NOT NULL,
  paymentMethod VARCHAR(20) NOT NULL,
  description TEXT,
  referenceNumber VARCHAR(255),
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_user ON receipts("userId");

-- Inventory
CREATE TABLE IF NOT EXISTS inventories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  productCode VARCHAR(255) NOT NULL UNIQUE,
  productName VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  openingStock INTEGER NOT NULL DEFAULT 0,
  currentStock INTEGER NOT NULL DEFAULT 0,
  reorderLevel INTEGER NOT NULL DEFAULT 10,
  unitCost NUMERIC(10,2) NOT NULL,
  sellingPrice NUMERIC(10,2) NOT NULL,
  supplier VARCHAR(255),
  location VARCHAR(255),
  lastRestockDate TIMESTAMP WITH TIME ZONE,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventories_productcode ON inventories(productCode);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchaseNumber VARCHAR(255) NOT NULL UNIQUE,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplierName VARCHAR(255) NOT NULL,
  supplierContact VARCHAR(255),
  purchaseDate TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expectedDeliveryDate TIMESTAMP WITH TIME ZONE,
  actualDeliveryDate TIMESTAMP WITH TIME ZONE,
  category VARCHAR(50) NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(15,2) NOT NULL,
  shippingCost NUMERIC(10,2) NOT NULL DEFAULT 0,
  taxAmount NUMERIC(10,2) NOT NULL DEFAULT 0,
  totalAmount NUMERIC(15,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases("userId");

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  expenseDate TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  vendor VARCHAR(255),
  paymentMethod VARCHAR(20) NOT NULL,
  receiptNumber VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses("userId");

-- Payroll
CREATE TABLE IF NOT EXISTS payrolls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employeeId VARCHAR(255) NOT NULL UNIQUE,
  employeeName VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  department VARCHAR(255),
  position VARCHAR(255),
  payPeriod VARCHAR(20) NOT NULL,
  basicSalary NUMERIC(15,2) NOT NULL,
  overtimeHours NUMERIC(10,2) NOT NULL DEFAULT 0,
  overtimeRate NUMERIC(10,2) NOT NULL DEFAULT 0,
  bonus NUMERIC(15,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(15,2) NOT NULL DEFAULT 0,
  taxRate NUMERIC(5,2) NOT NULL DEFAULT 20,
  grossSalary NUMERIC(15,2) NOT NULL,
  taxAmount NUMERIC(15,2) NOT NULL,
  netPay NUMERIC(15,2) NOT NULL,
  paymentDate TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(255) NOT NULL,
  entity VARCHAR(255) NOT NULL,
  "entityId" UUID,
  "oldValues" JSONB,
  "newValues" JSONB,
  ipAddress VARCHAR(100),
  userAgent TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  errorMessage TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditlogs_user ON audit_logs("userId");
CREATE INDEX IF NOT EXISTS idx_auditlogs_timestamp ON audit_logs(timestamp);
