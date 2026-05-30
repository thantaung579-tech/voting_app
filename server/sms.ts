/**
 * SMS Service for sending OTP codes to voters
 * Uses the provided SMS API to deliver one-time passwords
 */

interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send OTP code via SMS to a Myanmar phone number
 * @param phoneNumber Myanmar phone number in format 09xxxxxxxxx
 * @param otpCode 6-digit OTP code
 * @returns Promise with success status and message ID or error
 */
export async function sendOtpSms(phoneNumber: string, otpCode: string): Promise<SMSResponse> {
  try {
    // Validate inputs
    if (!phoneNumber || !otpCode) {
      return {
        success: false,
        error: "Phone number and OTP code are required",
      };
    }

    if (!/^09\d{9}$/.test(phoneNumber)) {
      return {
        success: false,
        error: "Invalid Myanmar phone number format",
      };
    }

    if (!/^\d{6}$/.test(otpCode)) {
      return {
        success: false,
        error: "OTP code must be 6 digits",
      };
    }

    // Get SMS API key from environment
    const apiKey = process.env.SMS_API_KEY;
    if (!apiKey) {
      console.error("[SMS] SMS_API_KEY not configured");
      return {
        success: false,
        error: "SMS service not configured",
      };
    }

    // Prepare SMS message
    const message = `Your Yadanabon CS Selections verification code is: ${otpCode}. Valid for 10 minutes. Do not share this code.`;

    // Call SMS API
    // Using a generic SMS API endpoint - adjust based on your provider
    const smsApiUrl = "https://api.sms-provider.com/send";

    const response = await fetch(smsApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: message,
        from: "YadanabonVote",
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[SMS] API error: ${response.status} - ${errorData}`);
      return {
        success: false,
        error: `SMS API returned status ${response.status}`,
      };
    }

    const data = await response.json() as { messageId?: string; id?: string };
    const messageId = data.messageId || data.id;

    console.log(`[SMS] OTP sent successfully to ${phoneNumber}, Message ID: ${messageId}`);

    return {
      success: true,
      messageId: messageId as string,
    };
  } catch (error) {
    console.error("[SMS] Error sending OTP:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Send verification SMS to a phone number
 * @param phoneNumber Myanmar phone number
 * @param message Custom message to send
 * @returns Promise with success status
 */
export async function sendSms(phoneNumber: string, message: string): Promise<SMSResponse> {
  try {
    if (!phoneNumber || !message) {
      return {
        success: false,
        error: "Phone number and message are required",
      };
    }

    const apiKey = process.env.SMS_API_KEY;
    if (!apiKey) {
      console.error("[SMS] SMS_API_KEY not configured");
      return {
        success: false,
        error: "SMS service not configured",
      };
    }

    const smsApiUrl = "https://api.sms-provider.com/send";

    const response = await fetch(smsApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: message,
        from: "YadanabonVote",
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[SMS] API error: ${response.status} - ${errorData}`);
      return {
        success: false,
        error: `SMS API returned status ${response.status}`,
      };
    }

    const data = await response.json() as { messageId?: string; id?: string };
    const messageId = data.messageId || data.id;

    console.log(`[SMS] Message sent successfully to ${phoneNumber}, Message ID: ${messageId}`);

    return {
      success: true,
      messageId: messageId as string,
    };
  } catch (error) {
    console.error("[SMS] Error sending SMS:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
