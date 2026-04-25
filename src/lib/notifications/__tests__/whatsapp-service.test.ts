import { sendWhatsApp } from '../whatsapp-service';

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({
    data: {
      messages: [{ id: 'wamid.test-message-id' }],
    },
  }),
}));

describe('WhatsApp Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendWhatsApp', () => {
    it('should send WhatsApp message in development mode', async () => {
      const result = await sendWhatsApp({
        to: '+27821234567',
        message: 'Test message',
      });

      // In development mode (no Meta API configured), should return mock ID
      expect(result).toHaveProperty('messageId');
    });

    it('should handle missing phone number', async () => {
      await expect(
        sendWhatsApp({
          to: '',
          message: 'Test',
        })
      ).rejects.toThrow();
    });

    it('should handle missing message', async () => {
      await expect(
        sendWhatsApp({
          to: '+27821234567',
          message: '',
        })
      ).rejects.toThrow();
    });

    it('should send template message', async () => {
      const result = await sendWhatsApp({
        to: '+27821234567',
        message: 'Test',
        template: {
          name: 'test_template',
          language: { code: 'en' },
          components: [],
        },
      });

      expect(result).toHaveProperty('messageId');
    });
  });
});
