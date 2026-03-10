const express = require("express");
const router = express.Router();

const {
  sendOwnerLeadEmail,
  sendVisitorAutoReply
} = require("../services/emailService");

const {
  sendLeadSmsAlert,
  sendLeadAutoReplySms
} = require("../services/smsService");

const {
  generateLeadIntelligence
} = require("../services/leadIntelligenceService");

const {
  saveLead
} = require("../services/leadStoreService");

router.post("/submit-lead", async (req, res) => {
  try {
    const leadData = req.body;

    const intelligence = await generateLeadIntelligence(leadData);

    const enrichedLeadData = {
      ...leadData,
      leadScore: intelligence.leadScore,
      intentLevel: intelligence.intentLevel,
      heatTag: intelligence.heatTag,
      tags: intelligence.tags,
      aiSummary: intelligence.summary,
      conversationSummary: intelligence.conversationSummary,
      recommendedNextStep: intelligence.recommendedNextStep,
      suggestedFollowUpMessage: intelligence.suggestedFollowUpMessage,
      demoReady: intelligence.demoReady,
      hotLead: intelligence.hotLead
    };

    const savedLead = saveLead(enrichedLeadData);

    await sendOwnerLeadEmail({
      ...enrichedLeadData,
      leadId: savedLead.id,
      transcript: savedLead.conversation?.transcript || []
    });

    await sendVisitorAutoReply({
      ...enrichedLeadData,
      leadId: savedLead.id
    });

    try {
      await sendLeadSmsAlert({
        ...enrichedLeadData,
        leadId: savedLead.id
      });
    } catch (smsError) {
      console.error("OWNER SMS ERROR:");
      console.error(smsError.message);
    }

    try {
      await sendLeadAutoReplySms({
        ...enrichedLeadData,
        leadId: savedLead.id
      });
    } catch (smsError) {
      console.error("VISITOR SMS ERROR:");
      console.error(smsError.message);
    }

    return res.json({
      success: true,
      message: "Lead received",
      lead: {
        id: savedLead.id,
        status: savedLead.status,
        hotLead: savedLead.hotLead,
        demoReady: savedLead.demoReady,
        heatTag: savedLead.heatTag,
        tags: savedLead.tags,
        createdAt: savedLead.createdAt
      },
      intelligence: {
        leadScore: intelligence.leadScore,
        intentLevel: intelligence.intentLevel,
        heatTag: intelligence.heatTag,
        tags: intelligence.tags,
        summary: intelligence.summary,
        conversationSummary: intelligence.conversationSummary,
        recommendedNextStep: intelligence.recommendedNextStep,
        suggestedFollowUpMessage: intelligence.suggestedFollowUpMessage,
        demoReady: intelligence.demoReady,
        hotLead: intelligence.hotLead
      }
    });
  } catch (error) {
    console.error("LEAD SUBMISSION ERROR:");
    console.error(error.message);
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
});

module.exports = router;