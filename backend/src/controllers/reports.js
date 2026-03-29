const reportGenerator = require('../services/reportGenerator');
const { asyncHandler } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');

/**
 * Generate and download invoice report
 */
const getInvoiceReport = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { format = 'pdf', startDate, endDate } = req.query;

  Logger.info(`Generating ${format} invoice report for user ${userId}`);

  const report = await reportGenerator.generateInvoiceReport(userId, { format, startDate, endDate });

  if (format === 'excel') {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="invoices-${new Date().toISOString().split('T')[0]}.xlsx"`);
    await report.xlsx.write(res);
  } else {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoices-${new Date().toISOString().split('T')[0]}.pdf"`);
    report.pipe(res);
  }
});

/**
 * Generate and download P&L report
 */
const getProfitLossReport = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { format = 'pdf', startDate, endDate } = req.query;

  Logger.info(`Generating ${format} P&L report for user ${userId}`);

  const report = await reportGenerator.generateProfitLossReport(userId, { format, startDate, endDate });

  if (format === 'excel') {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="p-and-l-${new Date().toISOString().split('T')[0]}.xlsx"`);
    await report.xlsx.write(res);
  } else {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="p-and-l-${new Date().toISOString().split('T')[0]}.pdf"`);
    report.pipe(res);
  }
});

/**
 * Generate and download payroll report
 */
const getPayrollReport = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { format = 'pdf', startDate, endDate } = req.query;

  Logger.info(`Generating ${format} payroll report for user ${userId}`);

  const report = await reportGenerator.generatePayrollReport(userId, { format, startDate, endDate });

  if (format === 'excel') {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="payroll-${new Date().toISOString().split('T')[0]}.xlsx"`);
    await report.xlsx.write(res);
  } else {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payroll-${new Date().toISOString().split('T')[0]}.pdf"`);
    report.pipe(res);
  }
});

module.exports = {
  getInvoiceReport,
  getProfitLossReport,
  getPayrollReport
};
