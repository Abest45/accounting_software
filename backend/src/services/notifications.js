const nodemailer = require('nodemailer');
const Queue = require('bull');
const Logger = require('../utils/logger');

// Initialize Redis queue for async email processing
const emailQueue = new Queue('email-notifications', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

// Configure email transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

/**
 * Email templates
 */
const templates = {
  invoiceOverdue: (invoiceNumber, amount, daysOverdue) => ({
    subject: `Invoice ${invoiceNumber} is Overdue`,
    html: `
      <h2>Invoice Overdue Notice</h2>
      <p>Invoice <strong>#${invoiceNumber}</strong> for <strong>$${amount.toFixed(2)}</strong> is now <strong>${daysOverdue} days overdue</strong>.</p>
      <p>Please take action to collect payment.</p>
      <p>Best regards,<br>FinAnalytics</p>
    `
  }),

  invoiceCreated: (invoiceNumber, clientName, amount) => ({
    subject: `New Invoice Created: ${invoiceNumber}`,
    html: `
      <h2>Invoice Created</h2>
      <p>A new invoice has been created:</p>
      <ul>
        <li><strong>Invoice #:</strong> ${invoiceNumber}</li>
        <li><strong>Client:</strong> ${clientName}</li>
        <li><strong>Amount:</strong> $${amount.toFixed(2)}</li>
      </ul>
      <p>Best regards,<br>FinAnalytics</p>
    `
  }),

  lowInventory: (productName, currentStock, reorderLevel) => ({
    subject: `Low Inventory Alert: ${productName}`,
    html: `
      <h2>Low Inventory Alert</h2>
      <p>Product <strong>${productName}</strong> is running low on stock.</p>
      <ul>
        <li><strong>Current Stock:</strong> ${currentStock}</li>
        <li><strong>Reorder Level:</strong> ${reorderLevel}</li>
      </ul>
      <p>Please consider placing a new purchase order.</p>
      <p>Best regards,<br>FinAnalytics</p>
    `
  }),

  payrollProcessed: (payrollCount, totalAmount, period) => ({
    subject: `Payroll Processed: ${period}`,
    html: `
      <h2>Payroll Processed</h2>
      <p>Payroll for <strong>${period}</strong> has been successfully processed.</p>
      <ul>
        <li><strong>Employees:</strong> ${payrollCount}</li>
        <li><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</li>
      </ul>
      <p>Best regards,<br>FinAnalytics</p>
    `
  }),

  budgetExceeded: (category, limit, spent, percentage) => ({
    subject: `Budget Exceeded: ${category}`,
    html: `
      <h2>Budget Exceeded Alert</h2>
      <p>Spending for <strong>${category}</strong> has exceeded the budget limit.</p>
      <ul>
        <li><strong>Budget Limit:</strong> $${limit.toFixed(2)}</li>
        <li><strong>Amount Spent:</strong> $${spent.toFixed(2)}</li>
        <li><strong>Percentage Over:</strong> ${percentage.toFixed(2)}%</li>
      </ul>
      <p>Please review your spending.</p>
      <p>Best regards,<br>FinAnalytics</p>
    `
  }),

  expenseApprovalRequested: (expenseId, amount, submittedBy) => ({
    subject: `Expense Approval Required: $${amount.toFixed(2)}`,
    html: `
      <h2>Expense Approval Required</h2>
      <p>An expense has been submitted for approval:</p>
      <ul>
        <li><strong>Amount:</strong> $${amount.toFixed(2)}</li>
        <li><strong>Submitted By:</strong> ${submittedBy}</li>
        <li><strong>Expense ID:</strong> ${expenseId}</li>
      </ul>
      <p>Please review and approve/reject this expense.</p>
      <p>Best regards,<br>FinAnalytics</p>
    `
  })
};

/**
 * Send email (queued via Bull)
 */
const sendEmail = async (to, template, templateData = {}) => {
  try {
    const emailContent = templates[template](...templateData);
    
    await emailQueue.add(
      {
        to,
        ...emailContent
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true
      }
    );

    Logger.info(`Email queued for ${to}: ${template}`);
  } catch (error) {
    Logger.error(`Failed to queue email for ${to}:`, error);
  }
};

/**
 * Process queued emails (run this in a worker process)
 */
const processEmailQueue = () => {
  emailQueue.process(async (job) => {
    const { to, subject, html } = job.data;

    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@finanalytics.com',
        to,
        subject,
        html
      });

      Logger.info(`Email sent to ${to}:`, info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      Logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  });

  // Listen for queue events
  emailQueue.on('failed', (job, err) => {
    Logger.error(`Email job failed for ${job.data.to}:`, err);
  });

  emailQueue.on('completed', (job) => {
    Logger.info(`Email job completed for ${job.data.to}`);
  });
};

/**
 * Notification event triggers
 */
const notifyInvoiceOverdue = async (userEmail, invoiceNumber, amount, daysOverdue) => {
  await sendEmail(userEmail, 'invoiceOverdue', [invoiceNumber, amount, daysOverdue]);
};

const notifyInvoiceCreated = async (userEmail, invoiceNumber, clientName, amount) => {
  await sendEmail(userEmail, 'invoiceCreated', [invoiceNumber, clientName, amount]);
};

const notifyLowInventory = async (userEmail, productName, currentStock, reorderLevel) => {
  await sendEmail(userEmail, 'lowInventory', [productName, currentStock, reorderLevel]);
};

const notifyPayrollProcessed = async (userEmail, payrollCount, totalAmount, period) => {
  await sendEmail(userEmail, 'payrollProcessed', [payrollCount, totalAmount, period]);
};

const notifyBudgetExceeded = async (userEmail, category, limit, spent, percentage) => {
  await sendEmail(userEmail, 'budgetExceeded', [category, limit, spent, percentage]);
};

const notifyExpenseApprovalRequested = async (approverEmail, expenseId, amount, submittedBy) => {
  await sendEmail(approverEmail, 'expenseApprovalRequested', [expenseId, amount, submittedBy]);
};

module.exports = {
  sendEmail,
  processEmailQueue,
  notifyInvoiceOverdue,
  notifyInvoiceCreated,
  notifyLowInventory,
  notifyPayrollProcessed,
  notifyBudgetExceeded,
  notifyExpenseApprovalRequested
};
