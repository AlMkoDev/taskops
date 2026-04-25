import { sendEmail } from '../email-service';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  })),
}));

describe('Email Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should send email successfully in development mode', async () => {
      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test text',
      });

      // In development mode (no SMTP configured), should return without error
      expect(result).toBeUndefined();
    });

    it('should handle missing recipient', async () => {
      await expect(
        sendEmail({
          to: '',
          subject: 'Test',
          html: '<p>Test</p>',
        })
      ).rejects.toThrow();
    });

    it('should handle missing subject', async () => {
      await expect(
        sendEmail({
          to: 'test@example.com',
          subject: '',
          html: '<p>Test</p>',
        })
      ).rejects.toThrow();
    });

    it('should handle missing html content', async () => {
      await expect(
        sendEmail({
          to: 'test@example.com',
          subject: 'Test',
          html: '',
        })
      ).rejects.toThrow();
    });
  });
});
