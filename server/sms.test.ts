import { describe, it, expect, beforeEach, vi } from "vitest";
import { sendOtpSms, sendSms } from "./sms";

// Mock fetch globally
global.fetch = vi.fn();

describe("SMS Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMS_API_KEY = "test-api-key";
  });

  describe("sendOtpSms", () => {
    it("should validate Myanmar phone number format", async () => {
      const result = await sendOtpSms("invalid", "123456");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid Myanmar phone number format");
    });

    it("should validate OTP code format (6 digits)", async () => {
      const result = await sendOtpSms("09123456789", "12345"); // Only 5 digits
      expect(result.success).toBe(false);
      expect(result.error).toContain("OTP code must be 6 digits");
    });

    it("should return error when SMS_API_KEY is not configured", async () => {
      delete process.env.SMS_API_KEY;
      const result = await sendOtpSms("09123456789", "123456");
      expect(result.success).toBe(false);
      expect(result.error).toContain("SMS service not configured");
    });

    it("should handle API errors gracefully", async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });

      const result = await sendOtpSms("09123456789", "123456");
      expect(result.success).toBe(false);
      expect(result.error).toContain("status 401");
    });

    it("should send OTP successfully with valid inputs", async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messageId: "msg-12345" }),
      });

      const result = await sendOtpSms("09123456789", "123456");
      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg-12345");

      // Verify fetch was called with correct parameters
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Authorization": "Bearer test-api-key",
          }),
        })
      );
    });

    it("should include OTP code in SMS message", async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messageId: "msg-12345" }),
      });

      await sendOtpSms("09123456789", "123456");

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.message).toContain("123456");
      expect(body.to).toBe("09123456789");
    });
  });

  describe("sendSms", () => {
    it("should require phone number and message", async () => {
      const result = await sendSms("", "test message");
      expect(result.success).toBe(false);
      expect(result.error).toContain("required");
    });

    it("should send SMS successfully", async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "sms-12345" }),
      });

      const result = await sendSms("09123456789", "Test message");
      expect(result.success).toBe(true);
      expect(result.messageId).toBe("sms-12345");
    });
  });
});
