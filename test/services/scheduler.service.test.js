const schedulerService = require('../../src/services/scheduler.service');

const fs = require('fs');
const path = require('path');

jest.mock('fs');
jest.mock('../../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true })
}));

describe('schedulerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('[]');
    fs.writeFileSync.mockImplementation(() => {});
    fs.mkdirSync.mockImplementation(() => {});
  });

  test('should be defined', () => {
    expect(schedulerService).toBeDefined();
  });

  test('scheduleEmail should add job and return job object', () => {
    const job = schedulerService.scheduleEmail({
      name: 'Test',
      to: 'test@example.com',
      subject: 'Subj',
      text: 'Body',
      sendAt: '2025,9,6,10,0,0'
    });
    expect(job).toHaveProperty('id');
    expect(job).toHaveProperty('to', 'test@example.com');
    expect(job).toHaveProperty('status', 'scheduled');
  });

  test('getJobs should return array', () => {
    const jobs = schedulerService.getJobs();
    expect(Array.isArray(jobs)).toBe(true);
  });

  test('start should return stop function', () => {
    jest.useFakeTimers();
    const handle = schedulerService.start({ intervalMs: 1000 });
    expect(typeof handle.stop).toBe('function');
    handle.stop();
    jest.useRealTimers();
  });
});

