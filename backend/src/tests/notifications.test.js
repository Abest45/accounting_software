jest.mock('bull');
jest.mock('nodemailer');

const Queue = require('bull');
const nodemailer = require('nodemailer');
const Logger = require('../../src/utils/logger');

// Simple in-memory fake queue to avoid Redis dependency in tests
class FakeQueue {
  constructor(name) {
    this.name = name;
    this.processor = null;
    this.handlers = {};
  }

  async add(data, opts = {}) {
    const job = { data, opts, attemptsMade: 0 };
    const maxAttempts = opts.attempts || 1;
    const backoffDelay = (opts.backoff && opts.backoff.delay) ? opts.backoff.delay : 0;
    // Scale delays down for test speed (so tests don't take seconds)
    const scaledDelay = Math.max(5, Math.floor(backoffDelay / 200));

    const attempt = async () => {
      job.attemptsMade++;
      try {
        if (!this.processor) throw new Error('No processor registered');
        await this.processor({ data: job.data });
        if (this.handlers['completed']) this.handlers['completed'](job);
      } catch (err) {
        if (job.attemptsMade < maxAttempts) {
          setTimeout(attempt, scaledDelay);
        } else {
          if (this.handlers['failed']) this.handlers['failed'](job, err);
        }
      }
    };

    // Start first attempt asynchronously
    setImmediate(attempt);
    return job;
  }

  process(fn) { this.processor = fn; }
  on(event, cb) { this.handlers[event] = cb; }
}

Queue.mockImplementation((name, opts) => new FakeQueue(name));

describe('Notifications queue - processing and retry behavior', () => {
  let notifications;
  let sendMailMock;

  beforeAll(() => {
    // Mock nodemailer transport
    sendMailMock = jest.fn();
    nodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock });

    // Spy on logger
    jest.spyOn(Logger, 'error').mockImplementation(() => {});
    jest.spyOn(Logger, 'info').mockImplementation(() => {});

    // Require module under test AFTER mocks
    notifications = require('../../src/services/notifications');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('queues an email and processes successfully', async (done) => {
    // Make sendMail succeed
    sendMailMock.mockImplementation(() => Promise.resolve({ messageId: 'msg-1' }));

    // Start processing
    notifications.processEmailQueue();

    // Trigger a notification
    await notifications.notifyInvoiceCreated('test@example.com', 'INV-1', 'Client', 100.0);

    // Wait a bit for the fake queue to process
    setTimeout(() => {
      expect(sendMailMock).toHaveBeenCalled();
      expect(Logger.info).toHaveBeenCalled();
      done();
    }, 50);
  });

  it('logs failed job when sendMail throws', async (done) => {
    // Make sendMail throw
    sendMailMock.mockImplementationOnce(() => Promise.reject(new Error('SMTP down')));

    notifications.processEmailQueue();

    await notifications.notifyPayrollProcessed('test2@example.com', 5, 5000, '2026-01');

    setTimeout(() => {
      expect(sendMailMock).toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalled();
      done();
    }, 50);
  });

  it('retries failed jobs and succeeds after configured attempts', async (done) => {
    // Fail twice then succeed
    sendMailMock
      .mockImplementationOnce(() => Promise.reject(new Error('SMTP down 1')))
      .mockImplementationOnce(() => Promise.reject(new Error('SMTP down 2')))
      .mockImplementationOnce(() => Promise.resolve({ messageId: 'msg-retry' }));

    notifications.processEmailQueue();

    await notifications.notifyInvoiceCreated('retry@example.com', 'INV-R', 'Client', 50.0);

    // Wait long enough for scaled retries to complete
    setTimeout(() => {
      expect(sendMailMock).toHaveBeenCalledTimes(3);
      expect(Logger.info).toHaveBeenCalled();
      done();
    }, 200);
  });
});
