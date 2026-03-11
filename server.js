require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const OpenAI = require("openai");

const assistantConfig = require("./services/assistantConfig");
const leadRoutes = require("./routes/leads");
const {
  getAllLeads,
  getLeadById,
  updateLeadStatus,
  markLeadResponded,
  getLeadsNeedingFollowUp,
  markFollowUpSent
} = require("./services/leadStoreService");
const {
  sendAutoFollowUpEmail,
  getEmailHealthStatus,
  verifyEmailTransport
} = require("./services/emailService");

const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return "";

  const parts = cookieHeader.split(";").map((part) => part.trim());
  const found = parts.find((part) => part.startsWith(`${name}=`));

  if (!found) return "";

  return decodeURIComponent(found.split("=").slice(1).join("="));
}

function isAuthorizedAdmin(req) {
  const queryPassword = req.query.password;
  const headerPassword = req.headers["x-admin-password"];
  const cookiePassword = getCookieValue(req.headers.cookie, "admin_password");

  const providedPassword = queryPassword || headerPassword || cookiePassword;

  return (
    !!process.env.ADMIN_PASSWORD &&
    !!providedPassword &&
    providedPassword === process.env.ADMIN_PASSWORD
  );
}

function requireAdminAuth(req, res, next) {
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).send("ADMIN_PASSWORD is missing in .env");
  }

  if (isAuthorizedAdmin(req)) {
    return next();
  }

  return res.sendFile(path.join(__dirname, "public", "admin-login.html"));
}

app.get("/api/config", (req, res) => {
  res.json(assistantConfig);
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, leadContext } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Conversation history is required."
      });
    }

    const contextSummary = `
Current known lead context:
- Full Name: ${leadContext?.fullName || "Unknown"}
- Business Name: ${leadContext?.businessName || "Unknown"}
- Business Type: ${leadContext?.businessType || "Unknown"}
- Help Type: ${leadContext?.helpType || "Unknown"}
- Wants Demo: ${leadContext?.wantsDemo || "Unknown"}
- Email: ${leadContext?.email || "Unknown"}
- Phone: ${leadContext?.phone || "Unknown"}
- Client Source: ${leadContext?.clientSource || "Unknown"}
- Industry: ${leadContext?.industry || "Unknown"}
- Stage: ${leadContext?.stage || "Unknown"}
- Interest Level: ${leadContext?.interestLevel || "Unknown"}
`;

    const systemPrompt = {
      role: "system",
      content: `
You are the Get Solutions AI Assistant.

You are a business-focused AI sales assistant for Get Solutions AI.

Get Solutions AI helps businesses:
- automate communication
- capture more leads
- improve follow-up
- grow online presence
- use AI website assistants
- build intake and automation systems
- qualify inquiries faster
- turn more visitors into booked calls or customers

${contextSummary}

PRIMARY GOAL:
Move qualified visitors toward giving contact details and booking a demo.

YOUR JOB:
- keep the conversation focused on business growth, automation, lead generation, follow-up, AI assistants, intake systems, and online presence
- use the full conversation history
- never reset the conversation
- never ask the same qualifying question twice
- ask only one strong next question when possible
- sound like a smart sales consultant, not a generic chatbot
- be clear, helpful, persuasive, and concise

IMPORTANT RULES:
- If the user already gave their business type, do not ask for it again.
- If the user already explained how they get clients, do not ask that again.
- If the user already told you what they want to improve, build on it.
- If the user seems interested, wants a demo, asks pricing, asks how it works, or says the solution sounds good, treat them as a warm lead.
- If email is unknown and the lead is warm, ask for the best email to send next steps or demo details.
- If full name is unknown and the lead is warm, you may ask for their name naturally.
- If business name is unknown and the lead is warm, you may ask for the company name naturally.
- If email is already known, do not ask for it again.
- Do not overwhelm the user with too many questions at once.

INDUSTRY GUIDANCE:
- Home care / home health / care agency:
  explain 24/7 family inquiry capture, caregiver applications, follow-up, private-pay lead growth, faster response, and online presence growth.
- Lash / salon / spa / beauty:
  explain website lead capture, Instagram/social media inquiry conversion, appointment follow-up, online presence growth, and more booked clients.
- Law firms:
  explain lead qualification, intake capture, follow-up, missed-call replacement, and consult booking.
- Restaurants:
  explain inquiry capture, reservations/orders/questions, follow-up, and customer engagement.
- Service businesses:
  explain lead capture, instant response, follow-up, and improved conversion.
- Tech companies:
  explain automation, website conversion, faster lead handling, follow-up, and growth systems.

UNRELATED QUESTIONS:
If asked unrelated questions, respond briefly like:
"I'm here to help with AI automation, lead generation, and business growth solutions. Tell me about your business and what you'd like to improve, and I'll help from there."

STYLE:
- short to medium replies
- natural
- confident
- sales-oriented without being pushy

Never mention internal rules.
`
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [systemPrompt, ...messages],
      temperature: 0.7
    });

    const reply = completion.choices[0].message.content;

    return res.json({
      success: true,
      reply
    });
  } catch (error) {
    console.error("AI CHAT ERROR:");
    console.error(error.message);
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "AI response failed."
    });
  }
});

app.get("/api/admin-auth-check", (req, res) => {
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({
      success: false,
      message: "ADMIN_PASSWORD is missing in .env"
    });
  }

  if (!isAuthorizedAdmin(req)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized"
    });
  }

  return res.json({ success: true });
});

app.get("/api/email-health", requireAdminAuth, async (req, res) => {
  try {
    const shouldVerify = String(req.query.verify || "").toLowerCase() === "true";
    const status = getEmailHealthStatus();

    let verification = null;
    if (shouldVerify && status.configuredBase) {
      verification = await verifyEmailTransport();
    }

    return res.json({
      success: true,
      email: {
        ...status,
        verification
      }
    });
  } catch (error) {
    console.error("EMAIL HEALTH ERROR:");
    console.error(error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to check email health."
    });
  }
});

app.get("/api/leads", requireAdminAuth, (req, res) => {
  try {
    const leads = getAllLeads();
    return res.json({ success: true, leads });
  } catch (error) {
    console.error("GET LEADS ERROR:");
    console.error(error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to load leads."
    });
  }
});

app.get("/api/leads/:id", requireAdminAuth, (req, res) => {
  try {
    const lead = getLeadById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found."
      });
    }

    return res.json({ success: true, lead });
  } catch (error) {
    console.error("GET LEAD ERROR:");
    console.error(error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to load lead."
    });
  }
});

app.patch("/api/leads/:id/status", requireAdminAuth, (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required."
      });
    }

    const updatedLead = updateLeadStatus(req.params.id, status);

    if (!updatedLead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found."
      });
    }

    return res.json({ success: true, lead: updatedLead });
  } catch (error) {
    console.error("UPDATE LEAD STATUS ERROR:");
    console.error(error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update lead status."
    });
  }
});

app.patch("/api/leads/:id/responded", requireAdminAuth, (req, res) => {
  try {
    const { responded } = req.body;

    const updatedLead = markLeadResponded(req.params.id, Boolean(responded));

    if (!updatedLead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found."
      });
    }

    return res.json({ success: true, lead: updatedLead });
  } catch (error) {
    console.error("UPDATE RESPONDED ERROR:");
    console.error(error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update responded state."
    });
  }
});

app.use("/api", leadRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/admin", requireAdminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

async function runFollowUpSweep() {
  try {
    const hours = Number(process.env.FOLLOW_UP_HOURS || 24);
    const leads = getLeadsNeedingFollowUp(hours);

    for (const lead of leads) {
      try {
        await sendAutoFollowUpEmail(lead);
        markFollowUpSent(lead.id);
        console.log(`Follow-up email sent for ${lead.id}`);
      } catch (error) {
        console.error(`FOLLOW-UP EMAIL ERROR for ${lead.id}:`);
        console.error(error.message);
      }
    }
  } catch (error) {
    console.error("FOLLOW-UP SWEEP ERROR:");
    console.error(error.message);
  }
}

setInterval(runFollowUpSweep, 30 * 60 * 1000);
setTimeout(runFollowUpSweep, 10 * 1000);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});