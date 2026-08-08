import { Order } from '../types';

const sentNotificationOrderIds = new Set<string>();

export interface WhatsAppNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
}

/**
 * Format clean phone number to international E.164 format without '+' or spaces
 * e.g., "+91 98765 43210" -> "919876543210"
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  // Default to India country code (91) if 10-digit number
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  return cleaned;
}

/**
 * Send custom text message via WhatsApp Business Cloud API (Meta Graph API)
 */
export async function sendWhatsAppMessage(
  recipientPhone: string,
  messageText: string
): Promise<WhatsAppNotificationResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.warn('[WhatsApp] API credentials missing (WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set). Notification logged locally.');
    console.log(`[WhatsApp Simulated Message to ${recipientPhone}]:\n${messageText}`);
    return {
      success: false,
      error: 'WhatsApp API credentials not configured in server environment.',
    };
  }

  const targetPhone = formatPhoneNumber(recipientPhone);
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: targetPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: messageText,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errObj = data?.error || {};
      const errCode = errObj.code;
      const errType = errObj.type;
      const errDetails = errObj.error_data?.details;
      const rawMsg = errObj.message || `WhatsApp API error (${response.status})`;

      let userFriendlyError = rawMsg;

      if (errCode === 131030 || rawMsg.includes('131030') || (errDetails && errDetails.includes('not in allowed list'))) {
        console.warn(`[WhatsApp API Notice]: Recipient phone number ${targetPhone} is not in Meta Developer Console allowlist (#131030).`);
        userFriendlyError = `Meta Test Mode Restriction (#131030): Recipient phone number (${targetPhone}) is not in your Meta WhatsApp Developer Console allowlist. Please navigate to Meta for Developers Console -> WhatsApp -> API Setup, select the 'To' recipient dropdown, and add ${targetPhone} to your verified test numbers list.`;
      } else if (errCode === 190 || errType === 'OAuthException') {
        console.warn(`[WhatsApp API Notice - HTTP ${response.status} (${errType})]: ${rawMsg}`);
        userFriendlyError = `Meta Authentication Error (#190 / OAuthException): WHATSAPP_ACCESS_TOKEN is invalid or expired. Please generate a new access token in the Meta Developer Console. (${rawMsg})`;
      } else if (errCode === 100) {
        console.warn(`[WhatsApp API Notice - HTTP ${response.status} (${errType})]: ${rawMsg}`);
        userFriendlyError = `Meta Invalid Parameter (#100): ${rawMsg}. Check WHATSAPP_PHONE_NUMBER_ID or request payload.`;
      } else {
        console.warn(`[WhatsApp API Notice - HTTP ${response.status} (${errType || 'Error'})]: ${rawMsg}`);
        if (errDetails) {
          userFriendlyError = `${rawMsg} - ${errDetails}`;
        }
      }

      return {
        success: false,
        error: userFriendlyError,
      };
    }

    const messageId = data?.messages?.[0]?.id;
    console.log(`[WhatsApp Success] Notification sent to ${targetPhone}, message ID: ${messageId}`);
    return {
      success: true,
      messageId,
    };
  } catch (err: any) {
    console.warn('[WhatsApp Exception]:', err?.message || err);
    return {
      success: false,
      error: err?.message || 'Network exception while reaching Meta WhatsApp API',
    };
  }
}

/**
 * Send WhatsApp order notification for a confirmed PIKO order
 */
export async function sendWhatsAppOrderNotification(order: Order): Promise<WhatsAppNotificationResult> {
  const adminPhone = process.env.WHATSAPP_ADMIN_PHONE;
  if (!adminPhone) {
    console.warn('[WhatsApp] WHATSAPP_ADMIN_PHONE is not set. Order notification skipped.');
    return {
      success: false,
      error: 'WHATSAPP_ADMIN_PHONE environment variable is missing.',
      skipped: true,
    };
  }

  // Idempotency check: Ensure we never send duplicate notifications for the same order ID or payment ID
  const idempotencyKey = order.razorpay_payment_id ? `${order.id}:${order.razorpay_payment_id}` : order.id;
  if (sentNotificationOrderIds.has(idempotencyKey)) {
    console.log(`[WhatsApp Idempotency] Notification already sent for order ${order.order_number} (${idempotencyKey}). Skipping duplicate message.`);
    return {
      success: true,
      skipped: true,
    };
  }

  const itemsList = order.items && order.items.length > 0
    ? order.items.map((item) => `• ${item.product_name} (x${item.quantity}) - ₹${item.selling_price * item.quantity}`).join('\n')
    : 'No items detailed';

  const messageText = `🛒 *PIKO NEW ORDER*
━━━━━━━━━━━━━━━━━━
*Order Number:* ${order.order_number}
*Customer Name:* ${order.customer_name}
*Customer Phone:* ${order.customer_phone}

📦 *Products Purchased:*
${itemsList}

💰 *Total Amount:* ₹${order.total_amount}
💳 *Payment Method:* ${order.payment_method.toUpperCase()}
✅ *Payment Status:* ${order.payment_status.toUpperCase()}
🚚 *Order Status:* ${order.order_status.toUpperCase()}
━━━━━━━━━━━━━━━━━━
_Notification auto-generated by PIKO Store Server_`;

  const result = await sendWhatsAppMessage(adminPhone, messageText);

  if (result.success) {
    sentNotificationOrderIds.add(idempotencyKey);
  }

  return result;
}

/**
 * Send WhatsApp test message for admin diagnostic verification
 */
export async function sendWhatsAppTestNotification(customPhone?: string): Promise<WhatsAppNotificationResult> {
  const targetPhone = customPhone || process.env.WHATSAPP_ADMIN_PHONE;
  if (!targetPhone) {
    return {
      success: false,
      error: 'No target phone number provided or configured in WHATSAPP_ADMIN_PHONE.',
    };
  }

  const testMsg = `🔔 *PIKO WhatsApp Notification Test*
━━━━━━━━━━━━━━━━━━
This is a test notification from your PIKO Store backend.
WhatsApp integration is operational!

*Server Time:* ${new Date().toLocaleString()}
*Environment:* ${process.env.NODE_ENV || 'development'}
━━━━━━━━━━━━━━━━━━`;

  return await sendWhatsAppMessage(targetPhone, testMsg);
}
