require("dotenv").config();
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  family: 4,
});

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function nl2br(value = "") {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function getIntentColor(intentLevel = "") {
  const level = String(intentLevel).toLowerCase();

  if (level === "high") return "#ef4444";
  if (level === "medium") return "#f59e0b";
  return "#3b82f6";
}

function getScoreColor(score = 0) {
  const numeric = Number(score) || 0;

  if (numeric >= 8) return "#ef4444";
  if (numeric >= 4) return "#f59e0b";
  return "#3b82f6";
}

function buildOwnerEmailHtml(leadData) {
  const {
    fullName,
    businessName,
    businessType,
    email,
    phone,
    helpType,
    message,
    wantsDemo,
    leadScore,
    intentLevel,
    aiSummary,
    recommendedNextStep,
    hotLead
  } = leadData;

  const scoreColor = getScoreColor(leadScore);
  const intentColor = getIntentColor(intentLevel);

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>New Qualified Lead</title>
    </head>
    <body style="margin:0;padding:0;background:#0b1730;font-family:Arial,Helvetica,sans-serif;color:#eef6ff;">
      <div style="max-width:760px;margin:0 auto;padding:24px;">
        <div style="background:linear-gradient(135deg,#07111f,#0b1730,#10192a);border:1px solid rgba(255,255,255,0.12);border-radius:20px;overflow:hidden;">

          <div style="padding:24px 24px 18px;border-bottom:1px solid rgba(255,255,255,0.08);">
            <div style="display:inline-block;padding:8px 12px;border-radius:999px;background:rgba(99,213,255,0.14);color:#63d5ff;font-size:12px;font-weight:700;letter-spacing:.08em;">
              GET SOLUTIONS AI
            </div>

            <h1 style="margin:16px 0 8px;font-size:28px;line-height:1.2;color:#ffffff;">
              ${hotLead ? "🔥 New Hot Lead" : "📩 New Qualified Lead"}
            </h1>

            <p style="margin:0;color:#9fb0c5;font-size:15px;line-height:1.6;">
              A new lead has been captured and analyzed by your AI system.
            </p>
          </div>

          <div style="padding:24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
              <tr>
                <td style="padding:0 8px 12px 0;">
                  <div style="background:#111c31;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px;text-align:center;">
                    <div style="font-size:12px;color:#9fb0c5;letter-spacing:.06em;text-transform:uppercase;">Lead Score</div>
                    <div style="margin-top:8px;font-size:28px;font-weight:700;color:${scoreColor};">
                      ${escapeHtml(leadScore ?? "")}
                    </div>
                  </div>
                </td>
                <td style="padding:0 0 12px 8px;">
                  <div style="background:#111c31;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px;text-align:center;">
                    <div style="font-size:12px;color:#9fb0c5;letter-spacing:.06em;text-transform:uppercase;">Intent Level</div>
                    <div style="margin-top:8px;font-size:28px;font-weight:700;color:${intentColor};">
                      ${escapeHtml(intentLevel || "")}
                    </div>
                  </div>
                </td>
              </tr>
            </table>

            <div style="background:#111c31;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:18px;margin-bottom:16px;">
              <h2 style="margin:0 0 14px;font-size:18px;color:#ffffff;">Lead Details</h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#eef6ff;">
                <tr>
                  <td style="padding:8px 0;color:#9fb0c5;width:160px;">Full Name</td>
                  <td style="padding:8px 0;">${escapeHtml(fullName || "")}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9fb0c5;">Business Name</td>
                  <td style="padding:8px 0;">${escapeHtml(businessName || "")}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9fb0c5;">Business Type</td>
                  <td style="padding:8px 0;">${escapeHtml(businessType || "")}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9fb0c5;">Email</td>
                  <td style="padding:8px 0;">${escapeHtml(email || "")}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9fb0c5;">Phone</td>
                  <td style="padding:8px 0;">${escapeHtml(phone || "")}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9fb0c5;">Needs Help With</td>
                  <td style="padding:8px 0;">${escapeHtml(helpType || "")}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9fb0c5;">Wants Demo</td>
                  <td style="padding:8px 0;">${escapeHtml(wantsDemo || "No")}</td>
                </tr>
              </table>
            </div>

            <div style="background:#111c31;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:18px;margin-bottom:16px;">
              <h2 style="margin:0 0 10px;font-size:18px;color:#ffffff;">AI Summary</h2>
              <p style="margin:0;color:#dbe8f7;font-size:14px;line-height:1.7;">
                ${nl2br(aiSummary || "No summary available.")}
              </p>
            </div>

            <div style="background:#111c31;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:18px;margin-bottom:16px;">
              <h2 style="margin:0 0 10px;font-size:18px;color:#ffffff;">Recommended Next Step</h2>
              <p style="margin:0;color:#dbe8f7;font-size:14px;line-height:1.7;">
                ${nl2br(recommendedNextStep || "Review lead and follow up manually.")}
              </p>
            </div>

            <div style="background:#111c31;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:18px;margin-bottom:16px;">
              <h2 style="margin:0 0 10px;font-size:18px;color:#ffffff;">Original Message</h2>
              <p style="margin:0;color:#dbe8f7;font-size:14px;line-height:1.7;">
                ${nl2br(message || "No message provided.")}
              </p>
            </div>

            <div style="padding-top:8px;color:#7f93ad;font-size:12px;text-align:center;">
              Sent by your Get Solutions AI lead system
            </div>
          </div>
        </div>
      </div>
    </body>
  </html>
  `;
}

function buildVisitorEmailHtml(leadData) {
  const { fullName, businessType, helpType } = leadData;

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>We received your inquiry</title>
    </head>
    <body style="margin:0;padding:0;background:#eef3f8;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="max-width:700px;margin:0 auto;padding:24px;">
        <div style="background:#ffffff;border:1px solid #dbe5ef;border-radius:24px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,0.08);">

          <div style="padding:28px 28px 22px;background:linear-gradient(135deg,#ffffff,#f8fbff);border-bottom:1px solid #e7eef6;">
            <div style="display:inline-block;padding:10px 16px;border-radius:999px;background:#e8f5ff;color:#38bdf8;font-size:12px;font-weight:700;letter-spacing:.08em;">
              GET SOLUTIONS AI
            </div>

            <h1 style="margin:18px 0 10px;font-size:32px;line-height:1.2;color:#0f172a;">
              We received your inquiry
            </h1>

            <p style="margin:0;color:#475569;font-size:18px;line-height:1.7;">
              We received your inquiry and will follow up shortly.
            </p>
          </div>

          <div style="padding:30px 28px;">
            <p style="margin:0 0 18px;color:#0f172a;font-size:17px;line-height:1.8;">
              Hi ${escapeHtml(fullName || "there")},
            </p>

            <p style="margin:0 0 18px;color:#334155;font-size:17px;line-height:1.85;">
              Thank you for contacting <strong style="color:#0f172a;">Get Solutions AI</strong>.
              We help businesses automate communication, capture more leads, improve follow-up, and grow their online presence with AI-powered systems.
            </p>

            <div style="background:#0b1730;border-radius:20px;padding:22px 22px 18px;margin:24px 0;">
              <h2 style="margin:0 0 14px;font-size:20px;color:#ffffff;">Your Inquiry</h2>
              <p style="margin:0;color:#e2e8f0;font-size:16px;line-height:1.9;">
                <strong style="color:#ffffff;">Business Type:</strong> ${escapeHtml(businessType || "Not provided")}<br>
                <strong style="color:#ffffff;">Needs Help With:</strong> ${escapeHtml(helpType || "Not provided")}
              </p>
            </div>

            <p style="margin:0 0 18px;color:#334155;font-size:17px;line-height:1.85;">
              A member of our team will review your inquiry and reach out with the next steps.
            </p>

            <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e7eef6;color:#64748b;font-size:15px;">
              Get Solutions AI
            </div>
          </div>
        </div>
      </div>
    </body>
  </html>
  `;
}

async function sendOwnerLeadEmail(leadData) {
  const {
    fullName,
    businessName,
    businessType,
    email,
    phone,
    helpType,
    message,
    wantsDemo,
    leadScore,
    intentLevel,
    aiSummary,
    recommendedNextStep
  } = leadData;

  const mailOptions = {
    from: `"${process.env.OWNER_NAME || "Get Solutions AI"}" <${process.env.SMTP_USER}>`,
    to: process.env.OWNER_EMAIL,
    subject: `${leadData.hotLead ? "🔥 Hot Lead" : "📩 New Qualified Lead"}: ${businessType || "Business Inquiry"}`,
    text: `
NEW QUALIFIED LEAD

Name: ${fullName || ""}
Business Name: ${businessName || ""}
Business Type: ${businessType || ""}
Email: ${email || ""}
Phone: ${phone || ""}
Need Help With: ${helpType || ""}
Wants Demo: ${wantsDemo || "No"}

Lead Score: ${leadScore ?? ""}
Intent Level: ${intentLevel || ""}

AI Summary:
${aiSummary || ""}

Recommended Next Step:
${recommendedNextStep || ""}

Message:
${message || ""}
    `.trim(),
    html: buildOwnerEmailHtml(leadData)
  };

  return transporter.sendMail(mailOptions);
}

async function sendVisitorAutoReply(leadData) {
  const { fullName, email, businessType, helpType } = leadData;

  if (!email) return null;

  const mailOptions = {
    from: `"${process.env.OWNER_NAME || "Get Solutions AI"}" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "We received your inquiry",
    text: `
Hi ${fullName || "there"},

Thanks for reaching out to Get Solutions AI. We received your inquiry and will follow up shortly.

Business Type: ${businessType || "Not provided"}
Needs Help With: ${helpType || "Not provided"}

We help businesses with AI automation, lead capture, follow-up systems, and online growth.

Best,
${process.env.OWNER_NAME || "Get Solutions AI"}
    `.trim(),
    html: buildVisitorEmailHtml(leadData)
  };

  return transporter.sendMail(mailOptions);
}

module.exports = {
  sendOwnerLeadEmail,
  sendVisitorAutoReply
};