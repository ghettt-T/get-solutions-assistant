const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(
      LEADS_FILE,
      JSON.stringify({ leads: [] }, null, 2),
      "utf8"
    );
  }
}

function readLeadStore() {
  ensureDataFile();

  try {
    const raw = fs.readFileSync(LEADS_FILE, "utf8");
    const parsed = JSON.parse(raw);

    if (!parsed.leads || !Array.isArray(parsed.leads)) {
      return { leads: [] };
    }

    return parsed;
  } catch (error) {
    return { leads: [] };
  }
}

function writeLeadStore(store) {
  ensureDataFile();
  fs.writeFileSync(LEADS_FILE, JSON.stringify(store, null, 2), "utf8");
}

function generateLeadId() {
  const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `LEAD-${datePart}-${randomPart}`;
}

function getHeatTag(leadScore = 0) {
  const score = Number(leadScore) || 0;
  if (score >= 8) return "hot";
  if (score >= 4) return "warm";
  return "cold";
}

function addTimelineEvent(record, type, label) {
  if (!record.timeline) {
    record.timeline = [];
  }

  record.timeline.push({
    type,
    label,
    createdAt: new Date().toISOString(),
    createdAtDisplay: new Date().toLocaleString()
  });
}

function buildTags(leadData) {
  const tags = [];

  const heatTag = getHeatTag(leadData.leadScore);
  tags.push(heatTag);

  if (leadData.hotLead) tags.push("hot-lead");
  if (leadData.demoReady) tags.push("demo-ready");
  if (leadData.wantsDemo === "Yes") tags.push("demo");
  if (Array.isArray(leadData.tags)) tags.push(...leadData.tags.map(String));
  if (leadData.businessType) tags.push(String(leadData.businessType).toLowerCase());
  if (leadData.helpType) tags.push(String(leadData.helpType).toLowerCase());
  if (leadData.intentLevel) tags.push(String(leadData.intentLevel).toLowerCase());

  return [...new Set(tags)];
}

function buildLeadRecord(leadData) {
  const now = new Date();
  const leadScore = Number(leadData.leadScore) || 0;
  const heatTag = getHeatTag(leadScore);

  const record = {
    id: generateLeadId(),
    createdAt: now.toISOString(),
    createdAtDisplay: now.toLocaleString(),
    updatedAt: now.toISOString(),
    status: "new",
    responded: false,
    hotLead: Boolean(leadData.hotLead),
    demoReady: Boolean(leadData.demoReady),
    heatTag,

    profile: {
      fullName: leadData.fullName || "",
      businessName: leadData.businessName || "",
      businessType: leadData.businessType || "",
      email: leadData.email || "",
      phone: leadData.phone || ""
    },

    inquiry: {
      helpType: leadData.helpType || "",
      message: leadData.message || "",
      wantsDemo: leadData.wantsDemo || "No",
      clientSource: leadData.clientSource || "",
      industry: leadData.industry || ""
    },

    intelligence: {
      leadScore,
      intentLevel: leadData.intentLevel || "Unknown",
      aiSummary: leadData.aiSummary || "",
      conversationSummary: leadData.conversationSummary || "",
      recommendedNextStep: leadData.recommendedNextStep || "",
      suggestedFollowUpMessage: leadData.suggestedFollowUpMessage || ""
    },

    conversation: {
      transcript: Array.isArray(leadData.transcript) ? leadData.transcript : []
    },

    followUp: {
      sent: false,
      sentAt: null,
      followUpCount: 0
    },

    timeline: [],
    tags: buildTags(leadData)
  };

  addTimelineEvent(record, "lead-created", "Lead created");
  addTimelineEvent(record, "ai-scored", "AI scored lead");

  if (record.inquiry.wantsDemo === "Yes") {
    addTimelineEvent(record, "demo-requested", "Lead requested demo");
  }

  if (record.demoReady) {
    addTimelineEvent(record, "demo-ready", "Lead marked demo ready");
  }

  if (record.conversation.transcript.length) {
    addTimelineEvent(record, "chat-captured", "Conversation transcript saved");
  }

  return record;
}

function saveLead(leadData) {
  const store = readLeadStore();
  const leadRecord = buildLeadRecord(leadData);

  store.leads.unshift(leadRecord);
  writeLeadStore(store);

  return leadRecord;
}

function getAllLeads() {
  const store = readLeadStore();

  return [...store.leads].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

function getLeadById(id) {
  const store = readLeadStore();
  return store.leads.find((lead) => lead.id === id) || null;
}

function updateLeadStatus(id, status) {
  const store = readLeadStore();
  const leadIndex = store.leads.findIndex((lead) => lead.id === id);

  if (leadIndex === -1) return null;

  store.leads[leadIndex].status = status;
  store.leads[leadIndex].updatedAt = new Date().toISOString();
  addTimelineEvent(store.leads[leadIndex], "status-updated", `Status changed to ${status}`);

  if (["contacted", "demo-booked", "closed"].includes(status)) {
    store.leads[leadIndex].responded = true;
  }

  writeLeadStore(store);
  return store.leads[leadIndex];
}

function markLeadResponded(id, responded = true) {
  const store = readLeadStore();
  const leadIndex = store.leads.findIndex((lead) => lead.id === id);

  if (leadIndex === -1) return null;

  store.leads[leadIndex].responded = responded;
  store.leads[leadIndex].updatedAt = new Date().toISOString();
  addTimelineEvent(
    store.leads[leadIndex],
    "responded-updated",
    responded ? "Lead marked responded" : "Lead marked not responded"
  );

  writeLeadStore(store);
  return store.leads[leadIndex];
}

function getLeadsNeedingFollowUp(hoursThreshold = 24) {
  const store = readLeadStore();
  const now = Date.now();
  const thresholdMs = hoursThreshold * 60 * 60 * 1000;

  return store.leads.filter((lead) => {
    const ageMs = now - new Date(lead.createdAt).getTime();
    const hasEmail = !!lead.profile?.email;
    const alreadySent = !!lead.followUp?.sent;
    const responded = !!lead.responded;
    const closed = ["closed", "demo-booked"].includes(lead.status);

    return hasEmail && !alreadySent && !responded && !closed && ageMs >= thresholdMs;
  });
}

function markFollowUpSent(id) {
  const store = readLeadStore();
  const leadIndex = store.leads.findIndex((lead) => lead.id === id);

  if (leadIndex === -1) return null;

  store.leads[leadIndex].followUp.sent = true;
  store.leads[leadIndex].followUp.sentAt = new Date().toISOString();
  store.leads[leadIndex].followUp.followUpCount =
    Number(store.leads[leadIndex].followUp.followUpCount || 0) + 1;
  store.leads[leadIndex].updatedAt = new Date().toISOString();

  addTimelineEvent(store.leads[leadIndex], "follow-up-sent", "Automatic follow-up email sent");

  writeLeadStore(store);
  return store.leads[leadIndex];
}

module.exports = {
  saveLead,
  getAllLeads,
  getLeadById,
  updateLeadStatus,
  markLeadResponded,
  getLeadsNeedingFollowUp,
  markFollowUpSent
};