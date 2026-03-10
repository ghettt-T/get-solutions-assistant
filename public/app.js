const assistantResponses = {
  "Learn about our services":
    "We provide AI digital assistants, lead capture automation, follow-up systems, intake workflows, and marketing support to help businesses capture more opportunities online.",
  "Get more leads for my business":
    "We help businesses increase inquiries by responding faster, capturing lead details automatically, and improving follow-up so fewer opportunities are missed.",
  "Build an AI assistant":
    "We build custom AI assistants that answer questions, guide visitors, qualify leads, and help businesses automate customer communication.",
  "I run a home care agency":
    "For home care agencies, our system can answer family questions 24/7, capture client inquiries, collect caregiver applications, notify staff instantly, automate follow-up, and support online growth.",
  "Book a demo":
    "Great choice. Fill out the form below and check the demo box so we can follow up and schedule your walkthrough."
};

let assistantConfigData = null;
let conversationHistory = [];
let leadAlreadySubmitted = false;

let salesContext = {
  fullName: "",
  businessName: "",
  businessType: "",
  helpType: "",
  email: "",
  phone: "",
  wantsDemo: "No",
  clientSource: "",
  industry: "",
  stage: "intro",
  interestLevel: "unknown"
};

function runTypewriter(element, text, speed = 18) {
  if (!element) return;

  element.textContent = "";
  let index = 0;

  function typeNext() {
    if (index < text.length) {
      element.textContent += text.charAt(index);
      index += 1;
      setTimeout(typeNext, speed);
    }
  }

  typeNext();
}

function typeHeroText() {
  const heroText = document.getElementById("typewriterText");
  if (!heroText) return;

  const phrases = [
    "24/7 growth assistant",
    "lead capture engine",
    "sales assistant",
    "client conversion system"
  ];

  let phraseIndex = 0;
  let letterIndex = 0;
  let deleting = false;

  function animate() {
    const currentPhrase = phrases[phraseIndex];

    if (deleting) {
      letterIndex -= 1;
    } else {
      letterIndex += 1;
    }

    heroText.textContent = currentPhrase.substring(0, letterIndex);

    let speed = deleting ? 45 : 85;

    if (!deleting && letterIndex === currentPhrase.length) {
      deleting = true;
      speed = 1200;
    } else if (deleting && letterIndex === 0) {
      deleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      speed = 250;
    }

    setTimeout(animate, speed);
  }

  animate();
}

function createMessageElement(sender = "bot") {
  const message = document.createElement("div");
  message.className = `message ${sender}`;

  const avatarText = sender === "bot" ? "AI" : "You";

  message.innerHTML = `
    <div class="message-avatar">${avatarText}</div>
    <div class="message-bubble"></div>
  `;

  return {
    message,
    bubble: message.querySelector(".message-bubble")
  };
}

function appendMessage(text, sender = "bot", useTypewriter = false) {
  const chatWindow = document.getElementById("chatWindow");
  if (!chatWindow) return null;

  const { message, bubble } = createMessageElement(sender);
  chatWindow.appendChild(message);

  if (useTypewriter && sender === "bot") {
    runTypewriter(bubble, text, 14);
  } else {
    bubble.textContent = text;
  }

  chatWindow.scrollTop = chatWindow.scrollHeight;
  return { message, bubble };
}

function showThinkingIndicator(label = "AI is thinking") {
  const chatWindow = document.getElementById("chatWindow");
  if (!chatWindow) return null;

  const wrapper = document.createElement("div");
  wrapper.className = "message bot thinking-message";

  wrapper.innerHTML = `
    <div class="message-avatar">AI</div>
    <div class="message-bubble thinking-bubble">
      <span class="thinking-text">${label}</span>
      <span class="thinking-dots">
        <span>.</span><span>.</span><span>.</span>
      </span>
    </div>
  `;

  chatWindow.appendChild(wrapper);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return wrapper;
}

function removeThinkingIndicator(indicator) {
  if (indicator && indicator.parentNode) {
    indicator.parentNode.removeChild(indicator);
  }
}

function setWelcomeMessage(text) {
  const welcomeMessage = document.getElementById("welcomeMessage");
  if (!welcomeMessage) return;

  welcomeMessage.textContent = text;

  conversationHistory = [
    {
      role: "assistant",
      content: text
    }
  ];

  salesContext.stage = "intro";
}

function renderQuickActions(options = []) {
  const quickActions = document.getElementById("quickActions");
  if (!quickActions) return;

  quickActions.innerHTML = "";

  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-action-btn";
    button.textContent = option;
    button.addEventListener("click", () => handleQuickAction(option));
    quickActions.appendChild(button);
  });
}

function getReplyForOption(option) {
  if (!assistantConfigData) {
    return assistantResponses[option] || option;
  }

  if (option === "I run a home care agency") {
    return assistantConfigData.healthcarePitch || assistantResponses[option];
  }

  return assistantResponses[option] || option;
}

function handleQuickAction(option) {
  appendMessage(option, "user");

  conversationHistory.push({
    role: "user",
    content: option
  });

  if (option === "Book a demo") {
    salesContext.wantsDemo = "Yes";
    salesContext.interestLevel = "high";
    salesContext.stage = "demo";
  }

  if (option === "I run a home care agency") {
    salesContext.businessType = "Home Care Agency";
    salesContext.industry = "homecare";
    salesContext.stage = "business_identified";
  }

  syncContextToForm();

  const reply = getReplyForOption(option);
  const thinking = showThinkingIndicator();

  setTimeout(() => {
    removeThinkingIndicator(thinking);

    appendMessage(reply, "bot", true);
    conversationHistory.push({
      role: "assistant",
      content: reply
    });
  }, 600);
}

async function loadAssistantConfig() {
  try {
    const response = await fetch("/api/config");

    if (!response.ok) {
      throw new Error("Failed to load assistant config.");
    }

    assistantConfigData = await response.json();

    const welcomeText =
      assistantConfigData?.welcomeMessage ||
      "Hi, welcome to Get Solutions AI. We help businesses automate communication, capture more leads, improve follow-up, and grow online presence using AI digital assistants and automation systems. What would you like help with today?";

    setWelcomeMessage(welcomeText);

    if (Array.isArray(assistantConfigData?.leadOptions)) {
      renderQuickActions(assistantConfigData.leadOptions);
    } else {
      renderQuickActions(Object.keys(assistantResponses));
    }
  } catch (error) {
    console.error("Failed to load config:", error);

    setWelcomeMessage(
      "Hi, welcome to Get Solutions AI. We help businesses automate communication, capture more leads, improve follow-up, and grow online presence using AI digital assistants and automation systems. What would you like help with today?"
    );

    renderQuickActions(Object.keys(assistantResponses));
  }
}

function animateCounters() {
  const counters = document.querySelectorAll(".stat-number");

  counters.forEach((counter) => {
    const target = Number(counter.dataset.target || 0);
    const suffix = target === 100 ? "%" : target === 24 ? "/7" : "";

    let current = 0;
    const increment = Math.max(1, Math.ceil(target / 30));

    function updateCounter() {
      current += increment;

      if (current >= target) {
        counter.textContent = `${target}${suffix}`;
        return;
      }

      counter.textContent = `${current}${suffix}`;
      requestAnimationFrame(updateCounter);
    }

    updateCounter();
  });
}

function normalizePhoneNumber(phone) {
  if (!phone) return "";

  const digits = String(phone).replace(/\D/g, "");

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (String(phone).startsWith("+")) return phone;

  return "";
}

function detectIndustry(messageLower) {
  if (
    messageLower.includes("home care") ||
    messageLower.includes("home health") ||
    messageLower.includes("healthcare") ||
    messageLower.includes("care agency")
  ) return "homecare";

  if (
    messageLower.includes("lash") ||
    messageLower.includes("salon") ||
    messageLower.includes("spa") ||
    messageLower.includes("beauty")
  ) return "beauty";

  if (messageLower.includes("law firm") || messageLower.includes("attorney")) return "legal";
  if (messageLower.includes("restaurant")) return "restaurant";
  if (messageLower.includes("tech company") || messageLower.includes("tech business")) return "tech";
  if (messageLower.includes("service business")) return "service";

  return "";
}

function extractClientSource(messageLower) {
  if (messageLower.includes("word of mouth")) return "Word of Mouth";
  if (messageLower.includes("referral")) return "Referrals";
  if (messageLower.includes("instagram")) return "Instagram";
  if (messageLower.includes("facebook")) return "Facebook";
  if (messageLower.includes("social media")) return "Social Media";
  if (messageLower.includes("government")) return "Government";
  if (messageLower.includes("ads")) return "Ads";
  if (messageLower.includes("google")) return "Google";
  if (messageLower.includes("website")) return "Website";
  return "";
}

function detectInterestLevel(messageLower) {
  const highSignals = [
    "yes i would",
    "yes i would like to",
    "book a demo",
    "i want a demo",
    "interested",
    "sounds good",
    "that sounds good",
    "i need help",
    "can you help",
    "how much",
    "pricing",
    "let's do it",
    "i would love to",
    "send me details",
    "let's move forward"
  ];

  const mediumSignals = [
    "tell me more",
    "okay",
    "yes",
    "maybe",
    "how does it work",
    "can you explain",
    "what do you offer"
  ];

  if (highSignals.some((signal) => messageLower.includes(signal))) return "high";
  if (mediumSignals.some((signal) => messageLower.includes(signal))) return "medium";
  return salesContext.interestLevel;
}

function extractFullName(message) {
  const cleaned = message.trim();

  const patterns = [
    /(?:my name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i,
    /(?:i am|i'm)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i,
    /(?:this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i,
    /(?:you can call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i,
    /(?:reach me,?\s*)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function extractBusinessName(message) {
  const patterns = [
    /(?:my business is called)\s+([A-Za-z0-9&' .-]{2,60})/i,
    /(?:my company is called)\s+([A-Za-z0-9&' .-]{2,60})/i,
    /(?:our company is called)\s+([A-Za-z0-9&' .-]{2,60})/i,
    /(?:my business name is)\s+([A-Za-z0-9&' .-]{2,60})/i,
    /(?:company name is)\s+([A-Za-z0-9&' .-]{2,60})/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function syncContextToForm() {
  const fullNameInput = document.getElementById("fullName");
  const businessNameInput = document.getElementById("businessName");
  const businessTypeInput = document.getElementById("businessType");
  const helpTypeInput = document.getElementById("helpType");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const messageInput = document.getElementById("message");
  const wantsDemoCheckbox = document.getElementById("wantsDemo");

  if (fullNameInput && salesContext.fullName && !fullNameInput.value) {
    fullNameInput.value = salesContext.fullName;
  }

  if (businessNameInput && salesContext.businessName && !businessNameInput.value) {
    businessNameInput.value = salesContext.businessName;
  }

  if (businessTypeInput && salesContext.businessType && !businessTypeInput.value) {
    businessTypeInput.value = salesContext.businessType;
  }

  if (helpTypeInput && salesContext.helpType && !helpTypeInput.value) {
    helpTypeInput.value = salesContext.helpType;
  }

  if (emailInput && salesContext.email && !emailInput.value) {
    emailInput.value = salesContext.email;
  }

  if (phoneInput && salesContext.phone && !phoneInput.value) {
    phoneInput.value = salesContext.phone;
  }

  if (wantsDemoCheckbox && salesContext.wantsDemo === "Yes") {
    wantsDemoCheckbox.checked = true;
  }

  if (messageInput && !messageInput.value && conversationHistory.length > 1) {
    const lastUser = [...conversationHistory].reverse().find((m) => m.role === "user");
    if (lastUser) {
      messageInput.value = lastUser.content;
    }
  }
}

function tryAutoFillLeadFieldsFromChat(message) {
  const lower = message.toLowerCase();

  const detectedIndustry = detectIndustry(lower);
  const detectedClientSource = extractClientSource(lower);
  const extractedName = extractFullName(message);
  const extractedBusinessName = extractBusinessName(message);

  salesContext.interestLevel = detectInterestLevel(lower) || salesContext.interestLevel;

  if (extractedName) {
    salesContext.fullName = extractedName;
  }

  if (extractedBusinessName) {
    salesContext.businessName = extractedBusinessName;
  }

  if (detectedIndustry === "homecare") {
    salesContext.businessType = "Home Care Agency";
    salesContext.industry = "homecare";
  } else if (detectedIndustry === "beauty") {
    salesContext.businessType = salesContext.businessType || "Lash Business";
    salesContext.industry = "beauty";
  } else if (detectedIndustry === "legal") {
    salesContext.businessType = "Law Firm";
    salesContext.industry = "legal";
  } else if (detectedIndustry === "restaurant") {
    salesContext.businessType = "Restaurant";
    salesContext.industry = "restaurant";
  } else if (detectedIndustry === "tech") {
    salesContext.businessType = "Tech Company";
    salesContext.industry = "tech";
  } else if (detectedIndustry === "service") {
    salesContext.businessType = salesContext.businessType || "Service Business";
    salesContext.industry = "service";
  }

  if (detectedClientSource) {
    salesContext.clientSource = detectedClientSource;
  }

  if (lower.includes("private pay") || lower.includes("private client")) {
    salesContext.helpType = "More Private Clients";
  } else if (lower.includes("marketing")) {
    salesContext.helpType = "Marketing";
  } else if (lower.includes("lead")) {
    salesContext.helpType = "Lead Generation";
  } else if (lower.includes("automation")) {
    salesContext.helpType = "Automation";
  } else if (lower.includes("assistant") || lower.includes("chatbot")) {
    salesContext.helpType = "AI Assistant";
  }

  if (lower.includes("demo") || lower.includes("book")) {
    salesContext.wantsDemo = "Yes";
    salesContext.interestLevel = "high";
    salesContext.stage = "demo";
  }

  const emailMatch = message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  if (emailMatch && emailMatch[0]) {
    salesContext.email = emailMatch[0];
  }

  const phoneDigits = message.replace(/\D/g, "");
  if (phoneDigits.length === 10 || (phoneDigits.length === 11 && phoneDigits.startsWith("1"))) {
    salesContext.phone = normalizePhoneNumber(message);
  }

  if (salesContext.businessType && salesContext.stage === "intro") {
    salesContext.stage = "business_identified";
  }
  if (salesContext.clientSource && salesContext.stage === "business_identified") {
    salesContext.stage = "source_identified";
  }
  if (salesContext.helpType && salesContext.stage === "source_identified") {
    salesContext.stage = "problem_identified";
  }

  syncContextToForm();
}

async function sendChatMessageToAi() {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages: conversationHistory,
      leadContext: salesContext
    })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Chat failed.");
  }

  return result.reply;
}

function shouldAutoCheckDemo(reply) {
  const lower = reply.toLowerCase();
  return (
    lower.includes("book a demo") ||
    lower.includes("book demo") ||
    lower.includes("would you like to see a demo") ||
    lower.includes("would you like a demo") ||
    lower.includes("schedule a demo")
  );
}

function getLeadPayloadFromContext() {
  syncContextToForm();

  const messageInput = document.getElementById("message");

  return {
    fullName:
      salesContext.fullName ||
      document.getElementById("fullName")?.value.trim() ||
      "Website Visitor",
    businessName:
      salesContext.businessName ||
      document.getElementById("businessName")?.value.trim() ||
      "",
    businessType:
      salesContext.businessType ||
      document.getElementById("businessType")?.value.trim() ||
      "",
    email:
      salesContext.email ||
      document.getElementById("email")?.value.trim() ||
      "",
    phone:
      salesContext.phone ||
      normalizePhoneNumber(document.getElementById("phone")?.value.trim() || ""),
    helpType:
      salesContext.helpType ||
      document.getElementById("helpType")?.value.trim() ||
      "",
    message: messageInput?.value.trim() || "",
    wantsDemo:
      salesContext.wantsDemo ||
      (document.getElementById("wantsDemo")?.checked ? "Yes" : "No"),
    clientSource: salesContext.clientSource || "",
    industry: salesContext.industry || "",
    transcript: conversationHistory
  };
}

function canAutoSubmitLead() {
  const payload = getLeadPayloadFromContext();
  const hasBusinessType = !!payload.businessType;
  const hasHelpType = !!payload.helpType;
  const hasEmail = !!payload.email;
  const wantsDemo = payload.wantsDemo === "Yes";

  return !leadAlreadySubmitted && hasBusinessType && hasHelpType && (hasEmail || wantsDemo);
}

async function autoSubmitLeadFromChat() {
  if (!canAutoSubmitLead()) return;

  const payload = getLeadPayloadFromContext();
  leadAlreadySubmitted = true;

  const thinking = showThinkingIndicator("Submitting your details");

  try {
    const response = await fetch("/api/submit-lead", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    removeThinkingIndicator(thinking);

    if (!response.ok) {
      throw new Error(result.message || "Submission failed.");
    }

    const successReply =
      "Perfect — I’ve collected your details and passed them along. We’ll follow up with you shortly.";

    appendMessage(successReply, "bot", true);

    conversationHistory.push({
      role: "assistant",
      content: successReply
    });

    const statusMessage = document.getElementById("statusMessage");
    if (statusMessage) statusMessage.textContent = "Inquiry sent successfully.";
  } catch (error) {
    removeThinkingIndicator(thinking);
    leadAlreadySubmitted = false;
    console.error("Auto submit error:", error);
  }
}

function setupChatInput() {
  const chatForm = document.getElementById("chatInputForm");
  const chatInput = document.getElementById("chatInput");

  if (!chatForm || !chatInput) return;

  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = chatInput.value.trim();
    if (!message) return;

    appendMessage(message, "user");

    conversationHistory.push({
      role: "user",
      content: message
    });

    tryAutoFillLeadFieldsFromChat(message);
    chatInput.value = "";

    const thinking = showThinkingIndicator();

    try {
      const reply = await sendChatMessageToAi();

      removeThinkingIndicator(thinking);

      appendMessage(reply, "bot", true);

      conversationHistory.push({
        role: "assistant",
        content: reply
      });

      if (shouldAutoCheckDemo(reply)) {
        salesContext.wantsDemo = "Yes";
        salesContext.interestLevel = "high";
        const demoCheckbox = document.getElementById("wantsDemo");
        if (demoCheckbox) demoCheckbox.checked = true;
      }

      await autoSubmitLeadFromChat();
    } catch (error) {
      console.error("Chat error:", error);

      removeThinkingIndicator(thinking);

      const errorReply =
        "Sorry, something went wrong while generating a response. Please try again.";

      appendMessage(errorReply, "bot", true);

      conversationHistory.push({
        role: "assistant",
        content: errorReply
      });
    }
  });
}

function getFormPayload() {
  const payload = {
    fullName: document.getElementById("fullName")?.value.trim() || "",
    businessName: document.getElementById("businessName")?.value.trim() || "",
    businessType: document.getElementById("businessType")?.value.trim() || "",
    email: document.getElementById("email")?.value.trim() || "",
    phone: normalizePhoneNumber(document.getElementById("phone")?.value.trim() || ""),
    helpType: document.getElementById("helpType")?.value.trim() || "",
    message: document.getElementById("message")?.value.trim() || "",
    wantsDemo: document.getElementById("wantsDemo")?.checked ? "Yes" : "No",
    clientSource: salesContext.clientSource || "",
    industry: salesContext.industry || "",
    transcript: conversationHistory
  };

  salesContext.fullName = payload.fullName || salesContext.fullName;
  salesContext.businessName = payload.businessName || salesContext.businessName;
  salesContext.businessType = payload.businessType || salesContext.businessType;
  salesContext.email = payload.email || salesContext.email;
  salesContext.phone = payload.phone || salesContext.phone;
  salesContext.helpType = payload.helpType || salesContext.helpType;
  salesContext.wantsDemo = payload.wantsDemo || salesContext.wantsDemo;

  return payload;
}

function validateLeadForm(payload) {
  if (!payload.fullName) return "Full name is required.";
  if (!payload.businessType) return "Business type is required.";
  if (!payload.email) return "Email address is required.";
  return null;
}

function setupLeadForm() {
  const leadForm = document.getElementById("leadForm");
  if (!leadForm) return;

  leadForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const statusMessage = document.getElementById("statusMessage");
    const payload = getFormPayload();

    const validationError = validateLeadForm(payload);
    if (validationError) {
      statusMessage.textContent = validationError;
      return;
    }

    leadAlreadySubmitted = true;
    statusMessage.textContent = "Submitting your inquiry...";

    appendMessage(
      `My name is ${payload.fullName} and I need help with ${payload.helpType || "my business automation"}.`,
      "user"
    );

    conversationHistory.push({
      role: "user",
      content: `Lead form submitted. Name: ${payload.fullName}. Business name: ${payload.businessName}. Business type: ${payload.businessType}. Help type: ${payload.helpType}. Wants demo: ${payload.wantsDemo}.`
    });

    const thinking = showThinkingIndicator("Submitting your details");

    try {
      const response = await fetch("/api/submit-lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      removeThinkingIndicator(thinking);

      if (!response.ok) {
        leadAlreadySubmitted = false;
        throw new Error(result.message || "Submission failed.");
      }

      statusMessage.textContent = "Inquiry sent successfully.";

      const successReply =
        "Thanks — your inquiry was received. We’ll follow up with you shortly.";

      appendMessage(successReply, "bot", true);

      conversationHistory.push({
        role: "assistant",
        content: successReply
      });

      leadForm.reset();
    } catch (error) {
      console.error("Submit error:", error);

      removeThinkingIndicator(thinking);

      statusMessage.textContent = error.message || "Something went wrong.";

      const errorReply =
        "Something went wrong while submitting your inquiry. Please try again.";

      appendMessage(errorReply, "bot", true);

      conversationHistory.push({
        role: "assistant",
        content: errorReply
      });
    }
  });
}

function setupFloatingBubble() {
  const bubbleBtn = document.getElementById("chatBubbleBtn");
  const assistantPanel = document.querySelector(".assistant-panel");

  if (!bubbleBtn || !assistantPanel) return;

  bubbleBtn.addEventListener("click", () => {
    assistantPanel.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

function setupTiltCards() {
  const cards = document.querySelectorAll(".tilt-card");

  cards.forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const rotateX = ((y / rect.height) - 0.5) * -10;
      const rotateY = ((x / rect.width) - 0.5) * 10;

      card.style.transform =
        `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

function setupMouseGlow() {
  const glow = document.getElementById("cursorGlow");
  if (!glow) return;

  document.addEventListener("mousemove", (event) => {
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
  });
}

function initApp() {
  loadAssistantConfig();
  animateCounters();
  setupMouseGlow();
  setupTiltCards();
  setupLeadForm();
  setupChatInput();
  setupFloatingBubble();
  typeHeroText();
}

document.addEventListener("DOMContentLoaded", initApp);