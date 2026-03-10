require("dotenv").config();
const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

function normalizePhone(phone) {
  if (!phone) return "";

  const digits = String(phone).replace(/\D/g, "");

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (String(phone).startsWith("+")) return String(phone);

  return "";
}

function buildOwnerSmsBody(leadData) {
  const {
    fullName,
    businessName,
    businessType,
    helpType,
    leadScore,
    intentLevel,
    phone,
    hotLead
  } = leadData;

  const alertLabel = hotLead ? "🔥 HOT LEAD" : "📩 NEW LEAD";

  return `
${alertLabel}

Name: ${fullName || "Unknown"}
Business: ${businessName || "Unknown"}
Type: ${businessType || "Unknown"}
Need: ${helpType || "Unknown"}

Score: ${leadScore ?? "N/A"}
Intent: ${intentLevel || "Unknown"}

Phone: ${phone || "Not provided"}
  `.trim();
}

function buildVisitorSmsBody(leadData) {
  const { fullName } = leadData;

  return `
Hi ${fullName || "there"} — thanks for contacting Get Solutions AI.

We received your inquiry and will follow up shortly about how we can help automate communication, capture more leads, and grow your business.
  `.trim();
}

async function sendLeadSmsAlert(leadData) {
  if (
    !process.env.TWILIO_PHONE_NUMBER ||
    !process.env.ALERT_PHONE_NUMBER
  ) {
    return null;
  }

  const smsBody = buildOwnerSmsBody(leadData);

  return client.messages.create({
    body: smsBody,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: process.env.ALERT_PHONE_NUMBER
  });
}

async function sendLeadAutoReplySms(leadData) {
  const normalizedPhone = normalizePhone(leadData.phone);

  if (!normalizedPhone || !process.env.TWILIO_PHONE_NUMBER) {
    return null;
  }

  const smsBody = buildVisitorSmsBody(leadData);

  return client.messages.create({
    body: smsBody,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: normalizedPhone
  });
}

module.exports = {
  sendLeadSmsAlert,
  sendLeadAutoReplySms
};