require("dotenv").config();
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const openAiTimeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 12000);

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`OpenAI request timed out after ${timeoutMs}ms`)), timeoutMs);
    })
  ]);
}

function cleanTranscript(transcript) {
  if (!Array.isArray(transcript)) return [];

  return transcript
    .filter((item) => item && item.role && item.content)
    .map((item) => ({
      role: String(item.role).trim(),
      content: String(item.content).trim()
    }))
    .filter((item) => item.content.length > 0);
}

function buildTranscriptText(transcript) {
  const cleaned = cleanTranscript(transcript);

  if (!cleaned.length) return "No transcript provided.";

  return cleaned
    .map((item) => `${item.role.toUpperCase()}: ${item.content}`)
    .join("\n");
}

function fallbackLeadIntelligence(leadData) {
  let score = 1;

  const hasBusinessType = !!leadData.businessType;
  const hasBusinessName = !!leadData.businessName;
  const hasHelpType = !!leadData.helpType;
  const hasEmail = !!leadData.email;
  const hasPhone = !!leadData.phone;
  const wantsDemo = String(leadData.wantsDemo || "").toLowerCase() === "yes";
  const hasMessage = !!leadData.message && String(leadData.message).trim().length > 10;
  const hasTranscript =
    Array.isArray(leadData.transcript) && leadData.transcript.length > 0;

  if (hasBusinessType) score += 2;
  if (hasBusinessName) score += 1;
  if (hasHelpType) score += 2;
  if (hasEmail) score += 2;
  if (hasPhone) score += 1;
  if (wantsDemo) score += 2;
  if (hasMessage) score += 1;
  if (hasTranscript) score += 1;

  if (score > 10) score = 10;

  let intentLevel = "Low";
  if (score >= 8) intentLevel = "High";
  else if (score >= 4) intentLevel = "Medium";

  const heatTag = score >= 8 ? "hot" : score >= 4 ? "warm" : "cold";
  const demoReady = wantsDemo || score >= 8;

  const tags = [];
  if (heatTag) tags.push(heatTag);
  if (demoReady) tags.push("demo-ready");
  if (leadData.businessType) tags.push(String(leadData.businessType).toLowerCase());
  if (leadData.helpType) tags.push(String(leadData.helpType).toLowerCase());
  if (leadData.clientSource) tags.push(String(leadData.clientSource).toLowerCase());
  if (leadData.industry) tags.push(String(leadData.industry).toLowerCase());

  const summaryParts = [];

  if (leadData.businessName) {
    summaryParts.push(`Business name appears to be ${leadData.businessName}`);
  }

  if (leadData.businessType) {
    summaryParts.push(`lead appears to run a ${leadData.businessType}`);
  } else {
    summaryParts.push("lead submitted a business inquiry");
  }

  if (leadData.helpType) {
    summaryParts.push(`needs help with ${String(leadData.helpType).toLowerCase()}`);
  }

  if (leadData.clientSource) {
    summaryParts.push(
      `current client source may be ${String(leadData.clientSource).toLowerCase()}`
    );
  }

  if (wantsDemo) {
    summaryParts.push("lead requested a demo");
  }

  let summary = summaryParts.join(". ");
  if (!summary.endsWith(".")) summary += ".";

  let conversationSummary = "No conversation summary available.";
  if (hasTranscript) {
    const firstUser = leadData.transcript.find((item) => item.role === "user");
    const lastUser = [...leadData.transcript]
      .reverse()
      .find((item) => item.role === "user");

    conversationSummary = [
      firstUser?.content ? `Conversation opened with: "${firstUser.content}"` : "",
      lastUser?.content ? `Latest user message: "${lastUser.content}"` : "",
      leadData.helpType ? `Main need detected: ${leadData.helpType}.` : ""
    ]
      .filter(Boolean)
      .join(" ");
  }

  let recommendedNextStep = "Review lead and follow up manually.";
  if (intentLevel === "High") {
    recommendedNextStep =
      "Hot lead. Follow up immediately, send demo details, and prioritize this lead.";
  } else if (intentLevel === "Medium") {
    recommendedNextStep =
      "Warm lead. Follow up soon with a tailored explanation and invite them to a demo.";
  } else {
    recommendedNextStep =
      "Cold lead. Follow up normally, gather more context, and continue qualifying.";
  }

  const suggestedFollowUpMessage = `Hi ${
    leadData.fullName || "there"
  }, I saw your inquiry about ${
    leadData.helpType || "business growth"
  } for ${
    leadData.businessType || "your business"
  }. Our system can help automate communication, improve follow-up, and capture more opportunities. Would you like to see a quick demo?`;

  return {
    leadScore: score,
    intentLevel,
    heatTag,
    tags: [...new Set(tags)],
    summary,
    conversationSummary,
    recommendedNextStep,
    suggestedFollowUpMessage,
    demoReady,
    hotLead: intentLevel === "High"
  };
}

async function generateLeadIntelligence(leadData) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("LEAD INTELLIGENCE: OPENAI_API_KEY missing, using fallback scoring.");
    return fallbackLeadIntelligence(leadData);
  }

  const transcriptText = buildTranscriptText(leadData.transcript);

  const prompt = `
You are a sales qualification assistant for Get Solutions AI.

Get Solutions AI helps businesses:
- automate communication
- capture more leads
- improve follow-up
- grow online presence
- use AI assistants
- qualify visitors
- drive demo bookings

Analyze this lead and return VALID JSON ONLY.

Lead profile:
- Full Name: ${leadData.fullName || ""}
- Business Name: ${leadData.businessName || ""}
- Business Type: ${leadData.businessType || ""}
- Email: ${leadData.email || ""}
- Phone: ${leadData.phone || ""}
- Help Type: ${leadData.helpType || ""}
- Message: ${leadData.message || ""}
- Wants Demo: ${leadData.wantsDemo || "No"}
- Client Source: ${leadData.clientSource || ""}
- Industry: ${leadData.industry || ""}

Conversation transcript:
${transcriptText}

Scoring rules:
- Score from 1 to 10
- Higher score if the lead clearly owns or represents a business
- Higher score if they describe a real growth, marketing, automation, or lead generation problem
- Higher score if they ask for a demo or show strong buying intent
- Higher score if they provide email, phone, business name, or useful detail
- Higher score if the transcript shows a progressive conversation and real interest

Intent rules:
- 1 to 3 = Low
- 4 to 7 = Medium
- 8 to 10 = High

Heat tag rules:
- High = hot
- Medium = warm
- Low = cold

Demo ready rules:
- true if they clearly want a demo, ask pricing, ask next steps, or sound ready to move forward
- false otherwise

Return JSON only in exactly this format:
{
  "leadScore": 8,
  "intentLevel": "High",
  "heatTag": "hot",
  "tags": ["hot", "demo-ready", "marketing"],
  "summary": "Short internal summary of the lead and what they need.",
  "conversationSummary": "Short recap of what happened in the chat and what the lead expressed.",
  "recommendedNextStep": "Short recommended follow-up action.",
  "suggestedFollowUpMessage": "Short suggested message the owner can send.",
  "demoReady": true,
  "hotLead": true
}
`;

  try {
    const completion = await withTimeout(
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are a strict sales qualification assistant. Return only valid JSON. No markdown. No explanation."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      }),
      openAiTimeoutMs
    );

    const content = completion.choices[0].message.content.trim();
    const parsed = JSON.parse(content);

    const leadScore = Math.max(1, Math.min(10, Number(parsed.leadScore) || 5));
    const intentLevel =
      parsed.intentLevel === "High" ||
      parsed.intentLevel === "Medium" ||
      parsed.intentLevel === "Low"
        ? parsed.intentLevel
        : "Medium";

    const heatTag =
      parsed.heatTag === "hot" ||
      parsed.heatTag === "warm" ||
      parsed.heatTag === "cold"
        ? parsed.heatTag
        : intentLevel === "High"
          ? "hot"
          : intentLevel === "Medium"
            ? "warm"
            : "cold";

    return {
      leadScore,
      intentLevel,
      heatTag,
      tags: Array.isArray(parsed.tags) ? [...new Set(parsed.tags.map(String))] : [heatTag],
      summary:
        parsed.summary ||
        "Lead submitted an inquiry and may be a fit for follow-up.",
      conversationSummary:
        parsed.conversationSummary ||
        "Conversation summary was not available.",
      recommendedNextStep:
        parsed.recommendedNextStep ||
        "Review lead and follow up manually.",
      suggestedFollowUpMessage:
        parsed.suggestedFollowUpMessage ||
        "Hi, thanks for your inquiry. I’d love to show you how our system can help your business. Would you like a quick demo?",
      demoReady: Boolean(parsed.demoReady),
      hotLead: Boolean(parsed.hotLead) || intentLevel === "High"
    };
  } catch (error) {
    console.error("LEAD INTELLIGENCE ERROR:");
    console.error(error.message);

    return fallbackLeadIntelligence(leadData);
  }
}

module.exports = {
  generateLeadIntelligence
};