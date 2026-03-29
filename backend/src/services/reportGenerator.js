const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const db = require('../models');

/**
 * Generate Invoice Report (PDF)
 * @param {string} userId - User ID filter (optional)
 * @param {object} options - {startDate, endDate, format: 'pdf'|'excel'}
 * @returns {Stream}
 */
const generateInvoiceReport = async (userId, options = {}) => {
  const { format = 'pdf', startDate, endDate } = options;

  // Fetch invoices
  const where = userId ? { userId } : {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.$gte = new Date(startDate);
    if (endDate) where.createdAt.$lte = new Date(endDate);
  }

  const invoices = await db.Invoice.findAll({
    where,
    order: [['createdAt', 'DESC']]
  });

  if (format === 'excel') {
    return generateInvoiceExcel(invoices);
  }
  return generateInvoicePDF(invoices);
};

const generateInvoicePDF = (invoices) => {
  const doc = new PDFDocument();

  doc.fontSize(20).text('Invoice Report', 100, 50);
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, 100, 80);

  let yPosition = 120;
  doc.fontSize(12).font('Helvetica-Bold').text('Invoice Summary', 100, yPosition);
  yPosition += 30;

  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Invoice #', 100, yPosition);
  doc.text('Client', 200, yPosition);
  doc.text('Amount', 350, yPosition);
  doc.text('Status', 450, yPosition);
  yPosition += 20;

  doc.font('Helvetica');
  invoices.forEach(inv => {
    if (yPosition > 750) {
      doc.addPage();
      yPosition = 50;
    }
    doc.text(inv.invoiceNumber, 100, yPosition);
    doc.text(inv.clientName, 200, yPosition);
    doc.text(`$${inv.totalAmount.toFixed(2)}`, 350, yPosition);
    doc.text(inv.status, 450, yPosition);
    yPosition += 20;
  });

  doc.fontSize(9).text(`Total Invoices: ${invoices.length}`, 100, yPosition + 20);
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  doc.text(`Total Amount: $${totalAmount.toFixed(2)}`, 100, yPosition + 35);

  return doc;
};

const generateInvoiceExcel = async (invoices) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Invoices');

  worksheet.columns = [
    { header: 'Invoice #', key: 'invoiceNumber', width: 15 },
    { header: 'Client', key: 'clientName', width: 25 },
    { header: 'Amount', key: 'totalAmount', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Date', key: 'createdAt', width: 15 }
  ];

  invoices.forEach(inv => {
    worksheet.addRow({
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName,
      totalAmount: inv.totalAmount,
      status: inv.status,
      createdAt: new Date(inv.createdAt).toLocaleDateString()
    });
  });

  // Add summary
  worksheet.addRow({});
  worksheet.addRow({ invoiceNumber: 'TOTAL', totalAmount: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0) });

  // Style header
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

  return workbook;
};

/**
 * Generate P&L Report
 */
const generateProfitLossReport = async (userId, options = {}) => {
  const { format = 'pdf', startDate, endDate } = options;

  // Fetch revenue (invoices)
  const invoiceWhere = userId ? { userId } : {};
  if (startDate || endDate) {
    invoiceWhere.createdAt = {};
    if (startDate) invoiceWhere.createdAt.$gte = new Date(startDate);
    if (endDate) invoiceWhere.createdAt.$lte = new Date(endDate);
  }

  const invoices = await db.Invoice.findAll({ where: invoiceWhere });
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  // Fetch expenses
  const expenseWhere = userId ? { userId } : {};
  if (startDate || endDate) {
    expenseWhere.createdAt = {};
    if (startDate) expenseWhere.createdAt.$gte = new Date(startDate);
    if (endDate) expenseWhere.createdAt.$lte = new Date(endDate);
  }

  const expenses = await db.Expense.findAll({ where: expenseWhere });
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0;

  if (format === 'excel') {
    return generateProfitLossExcel({ totalRevenue, totalExpenses, netProfit, profitMargin, expenses });
  }
  return generateProfitLossPDF({ totalRevenue, totalExpenses, netProfit, profitMargin, expenses });
};

const generateProfitLossPDF = (data) => {
  const { totalRevenue, totalExpenses, netProfit, profitMargin, expenses } = data;
  const doc = new PDFDocument();

  doc.fontSize(20).text('Profit & Loss Report', 100, 50);
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, 100, 80);

  let yPosition = 130;

  doc.fontSize(12).font('Helvetica-Bold').text('Summary', 100, yPosition);
  yPosition += 25;

  doc.font('Helvetica').fontSize(11);
  doc.text(`Total Revenue:`, 100, yPosition);
  doc.text(`$${totalRevenue.toFixed(2)}`, 350, yPosition);
  yPosition += 20;

  doc.text(`Total Expenses:`, 100, yPosition);
  doc.text(`$${totalExpenses.toFixed(2)}`, 350, yPosition);
  yPosition += 20;

  doc.font('Helvetica-Bold');
  doc.text(`Net Profit:`, 100, yPosition);
  doc.text(`$${netProfit.toFixed(2)}`, 350, yPosition);
  yPosition += 20;

  doc.font('Helvetica');
  doc.text(`Profit Margin:`, 100, yPosition);
  doc.text(`${profitMargin}%`, 350, yPosition);
  yPosition += 30;

  doc.fontSize(12).font('Helvetica-Bold').text('Expense Breakdown', 100, yPosition);
  yPosition += 25;

  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Category', 100, yPosition);
  doc.text('Amount', 350, yPosition);
  yPosition += 15;

  // Group by category
  const byCategory = {};
  expenses.forEach(exp => {
    byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
  });

  doc.font('Helvetica');
  Object.entries(byCategory).forEach(([category, amount]) => {
    doc.text(category, 100, yPosition);
    doc.text(`$${amount.toFixed(2)}`, 350, yPosition);
    yPosition += 15;
  });

  return doc;
};

const generateProfitLossExcel = async (data) => {
  const { totalRevenue, totalExpenses, netProfit, profitMargin, expenses } = data;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('P&L');

  worksheet.columns = [
    { header: 'Item', key: 'item', width: 25 },
    { header: 'Amount', key: 'amount', width: 15 }
  ];

  worksheet.addRow({ item: 'Total Revenue', amount: totalRevenue });
  worksheet.addRow({ item: 'Total Expenses', amount: totalExpenses });
  worksheet.addRow({});
  worksheet.addRow({ item: 'Net Profit', amount: netProfit });
  worksheet.addRow({ item: 'Profit Margin (%)', amount: profitMargin });

  return workbook;
};

/**
 * Generate Payroll Report
 */
const generatePayrollReport = async (userId, options = {}) => {
  const { format = 'pdf', startDate, endDate } = options;

  const where = userId ? { userId } : {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.$gte = new Date(startDate);
    if (endDate) where.createdAt.$lte = new Date(endDate);
  }

  const payrolls = await db.Payroll.findAll({ where });

  if (format === 'excel') {
    return generatePayrollExcel(payrolls);
  }
  return generatePayrollPDF(payrolls);
};

const generatePayrollPDF = (payrolls) => {
  const doc = new PDFDocument();

  doc.fontSize(20).text('Payroll Report', 100, 50);
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, 100, 80);

  let yPosition = 130;
  doc.fontSize(12).font('Helvetica-Bold').text('Payroll Summary', 100, yPosition);
  yPosition += 30;

  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Employee ID', 100, yPosition);
  doc.text('Gross Salary', 200, yPosition);
  doc.text('Net Pay', 300, yPosition);
  doc.text('Status', 400, yPosition);
  yPosition += 20;

  doc.font('Helvetica');
  payrolls.forEach(payroll => {
    if (yPosition > 750) {
      doc.addPage();
      yPosition = 50;
    }
    doc.text(payroll.employeeId, 100, yPosition);
    doc.text(`$${payroll.grossSalary.toFixed(2)}`, 200, yPosition);
    doc.text(`$${payroll.netPay.toFixed(2)}`, 300, yPosition);
    doc.text(payroll.status, 400, yPosition);
    yPosition += 20;
  });

  const totalGross = payrolls.reduce((sum, p) => sum + p.grossSalary, 0);
  const totalNet = payrolls.reduce((sum, p) => sum + p.netPay, 0);

  doc.fontSize(9);
  doc.text(`Total Employees: ${payrolls.length}`, 100, yPosition + 20);
  doc.text(`Total Gross: $${totalGross.toFixed(2)}`, 100, yPosition + 35);
  doc.text(`Total Net: $${totalNet.toFixed(2)}`, 100, yPosition + 50);

  return doc;
};

const generatePayrollExcel = async (payrolls) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Payroll');

  worksheet.columns = [
    { header: 'Employee ID', key: 'employeeId', width: 15 },
    { header: 'Basic Salary', key: 'basicSalary', width: 12 },
    { header: 'Gross Salary', key: 'grossSalary', width: 12 },
    { header: 'Net Pay', key: 'netPay', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Date', key: 'createdAt', width: 15 }
  ];

  payrolls.forEach(payroll => {
    worksheet.addRow({
      employeeId: payroll.employeeId,
      basicSalary: payroll.basicSalary,
      grossSalary: payroll.grossSalary,
      netPay: payroll.netPay,
      status: payroll.status,
      createdAt: new Date(payroll.createdAt).toLocaleDateString()
    });
  });

  return workbook;
};

module.exports = {
  generateInvoiceReport,
  generateProfitLossReport,
  generatePayrollReport
};
