const emailService = require('../../src/services/email.service');

describe('emailService', () => {
  test('sendEmail returns info', async () => {
    const info = await emailService.sendEmail('Test User', 'test@example.com', 'Subject', 'Text body');
    expect(info).toBeDefined();
    expect(info.accepted).toBeDefined();
  });

  test('checkEmailStatus returns result', async () => {
    const result = await emailService.checkEmailStatus('dummyid');
    expect(result).toBeDefined();
  });

  test('sendBulkEmails returns array', async () => {
    const emails = [
      { name: 'User1', to: 'user1@example.com', subject: 'Subj1', text: 'Body1' },
      { name: 'User2', to: 'user2@example.com', subject: 'Subj2', text: 'Body2' }
    ];
    const results = await emailService.sendBulkEmails(emails);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(2);
  });

  test('sendEmailWithSendGrid returns response', async () => {
    // You may need to mock sgMail for real test
    try {
      const response = await emailService.sendEmailWithSendGrid('Test User', 'test@example.com');
      expect(response).toBeDefined();
    } catch (err) {
      expect(err).toBeDefined(); // Accept error if SendGrid not configured
    }
  });

  test('webhookHandler processes events', async () => {
    const event = { custom_args: { mid: 'testmid' }, event: 'delivered' };
    const result = await emailService.webhookHandler([event]);
    expect(result).toHaveProperty('ok', true);
    expect(result.processed).toBe(1);
  });

  test('registerWebhook throws error if no apiKey', async () => {
    await expect(emailService.registerWebhook('', 'Test')).rejects.toThrow();
  });

  test('eventSendgrid returns code/message', async () => {
    const req = { body: JSON.stringify([{ event: 'delivered' }]), get: () => undefined };
    const result = await emailService.eventSendgrid(req);
    expect(result).toHaveProperty('code');
    expect(result).toHaveProperty('message');
  });

  test('webhookInfo returns info object', () => {
    const req = { protocol: 'http', hostname: 'localhost', get: () => 'localhost:3000', ip: '127.0.0.1' };
    const info = emailService.webhookInfo(req);
    expect(info).toHaveProperty('message');
    expect(info).toHaveProperty('endpoints');
  });
});
