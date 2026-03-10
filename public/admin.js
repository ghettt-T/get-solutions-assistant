let leads = [];
let selectedLeadId = null;
let previousLeadIds = [];

function getHeatClass(heatTag = "") {
  const tag = String(heatTag).toLowerCase();
  if (tag === "hot") return "badge-hot";
  if (tag === "warm") return "badge-warm";
  return "badge-cold";
}

async function loadLeads(showNotification = false) {
  try {
    const response = await fetch("/api/leads");
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to load leads.");
    }

    const previousSelected = selectedLeadId;
    const newLeads = result.leads || [];

    if (showNotification && previousLeadIds.length) {
      const freshLead = newLeads.find((lead) => !previousLeadIds.includes(lead.id));
      if (freshLead) {
        showLiveNotification(freshLead);
      }
    }

    leads = newLeads;
    previousLeadIds = newLeads.map((lead) => lead.id);

    renderStats();
    renderLeadList();

    if (leads.length > 0) {
      const stillExists = leads.find((lead) => lead.id === previousSelected);
      selectLead(stillExists ? previousSelected : leads[0].id);
    } else {
      document.getElementById("leadDetail").innerHTML =
        `<div class="empty-state">No leads saved yet.</div>`;
    }
  } catch (error) {
    console.error(error);
    document.getElementById("leadList").innerHTML =
      `<div class="empty-state">Failed to load leads.</div>`;
  }
}

function renderStats() {
  const total = leads.length;
  const hot = leads.filter((lead) => lead.heatTag === "hot").length;
  const demoReady = leads.filter((lead) => lead.demoReady).length;
  const fresh = leads.filter((lead) => lead.status === "new").length;

  document.getElementById("totalLeads").textContent = total;
  document.getElementById("hotLeads").textContent = hot;
  document.getElementById("demoReadyLeads").textContent = demoReady;
  document.getElementById("newLeads").textContent = fresh;
}

function renderLeadList() {
  const leadList = document.getElementById("leadList");

  if (!leads.length) {
    leadList.innerHTML = `<div class="empty-state">No leads saved yet.</div>`;
    return;
  }

  leadList.innerHTML = leads
    .map((lead) => {
      const name = lead.profile?.fullName || "Website Visitor";
      const business =
        lead.profile?.businessName ||
        lead.profile?.businessType ||
        "Unknown Business";
      const need = lead.inquiry?.helpType || "Unknown Need";

      return `
        <div class="lead-list-item ${lead.id === selectedLeadId ? "active" : ""}" data-id="${lead.id}">
          <div class="lead-top-row">
            <div class="lead-name">${escapeHtml(name)}</div>
            <div class="badge-row">
              <div class="lead-badge ${getHeatClass(lead.heatTag)}">${escapeHtml(lead.heatTag || "cold")}</div>
              ${lead.demoReady ? `<div class="lead-badge badge-demo-ready">demo ready</div>` : ""}
              <div class="lead-badge badge-status">${escapeHtml(lead.status || "new")}</div>
            </div>
          </div>
          <div class="lead-meta">
            <div><strong>Business:</strong> ${escapeHtml(business)}</div>
            <div><strong>Need:</strong> ${escapeHtml(need)}</div>
            <div><strong>Score:</strong> ${escapeHtml(String(lead.intelligence?.leadScore ?? ""))}</div>
          </div>
        </div>
      `;
    })
    .join("");

  document.querySelectorAll(".lead-list-item").forEach((item) => {
    item.addEventListener("click", () => {
      selectLead(item.dataset.id);
    });
  });
}

function selectLead(id) {
  selectedLeadId = id;
  renderLeadList();

  const lead = leads.find((item) => item.id === id);
  renderLeadDetail(lead);
}

function renderTimeline(timeline = []) {
  if (!Array.isArray(timeline) || !timeline.length) {
    return "No timeline yet.";
  }

  return timeline
    .slice()
    .reverse()
    .map((item) => {
      return `
        <div class="timeline-item">
          <div class="timeline-time">${escapeHtml(item.createdAtDisplay || item.createdAt || "")}</div>
          <div>${escapeHtml(item.label || "")}</div>
        </div>
      `;
    })
    .join("");
}

function renderLeadDetail(lead) {
  const detail = document.getElementById("leadDetail");

  if (!lead) {
    detail.innerHTML = "Lead not found.";
    return;
  }

  const transcript = Array.isArray(lead.conversation?.transcript)
    ? lead.conversation.transcript
    : [];

  detail.innerHTML = `
    <div class="detail-grid">
      <div class="detail-card">
        <div class="detail-label">Lead ID</div>
        <div class="detail-value">${escapeHtml(lead.id || "")}</div>
      </div>

      <div class="detail-card">
        <div class="detail-label">Created</div>
        <div class="detail-value">${escapeHtml(lead.createdAtDisplay || lead.createdAt || "")}</div>
      </div>

      <div class="detail-card">
        <div class="detail-label">Full Name</div>
        <div class="detail-value">${escapeHtml(lead.profile?.fullName || "")}</div>
      </div>

      <div class="detail-card">
        <div class="detail-label">Business Name</div>
        <div class="detail-value">${escapeHtml(lead.profile?.businessName || "")}</div>
      </div>

      <div class="detail-card">
        <div class="detail-label">Business Type</div>
        <div class="detail-value">${escapeHtml(lead.profile?.businessType || "")}</div>
      </div>

      <div class="detail-card">
        <div class="detail-label">Contact</div>
        <div class="detail-value">
          ${escapeHtml(lead.profile?.email || "")}<br>
          ${escapeHtml(lead.profile?.phone || "")}
        </div>
      </div>

      <div class="detail-card">
        <div class="detail-label">Lead Score</div>
        <div class="detail-value">${escapeHtml(String(lead.intelligence?.leadScore ?? ""))}</div>
      </div>

      <div class="detail-card">
        <div class="detail-label">Heat Tag</div>
        <div class="detail-value">${escapeHtml(lead.heatTag || "")}</div>
      </div>

      <div class="detail-card">
        <div class="detail-label">Intent Level</div>
        <div class="detail-value">${escapeHtml(lead.intelligence?.intentLevel || "")}</div>
      </div>

      <div class="detail-card">
        <div class="detail-label">Demo Ready</div>
        <div class="detail-value">${lead.demoReady ? "Yes" : "No"}</div>
      </div>

      <div class="detail-card full">
        <div class="detail-label">AI Summary</div>
        <div class="detail-value">${escapeHtml(lead.intelligence?.aiSummary || "")}</div>
      </div>

      <div class="detail-card full">
        <div class="detail-label">AI Conversation Summary</div>
        <div class="detail-value">${escapeHtml(lead.intelligence?.conversationSummary || "No conversation summary available.")}</div>
      </div>

      <div class="detail-card full">
        <div class="detail-label">Recommended Next Step</div>
        <div class="detail-value">${escapeHtml(lead.intelligence?.recommendedNextStep || "")}</div>
      </div>

      <div class="detail-card full">
        <div class="detail-label">Suggested Follow-Up Message</div>
        <div class="detail-value">${escapeHtml(lead.intelligence?.suggestedFollowUpMessage || "")}</div>
      </div>

      <div class="detail-card full">
        <div class="detail-label">Tags</div>
        <div class="detail-value">${Array.isArray(lead.tags) ? lead.tags.map(escapeHtml).join(", ") : ""}</div>
      </div>

      <div class="detail-card full">
        <div class="detail-label">Original Message</div>
        <div class="detail-value">${escapeHtml(lead.inquiry?.message || "")}</div>
      </div>

      <div class="detail-card full">
        <div class="detail-label">Follow-Up</div>
        <div class="detail-value">
          Sent: ${lead.followUp?.sent ? "Yes" : "No"}<br>
          Sent At: ${escapeHtml(lead.followUp?.sentAt || "Not yet")}<br>
          Count: ${escapeHtml(String(lead.followUp?.followUpCount || 0))}<br>
          Responded: ${lead.responded ? "Yes" : "No"}
        </div>
      </div>

      <div class="detail-card full">
        <div class="detail-label">Timeline</div>
        <div class="detail-value">${renderTimeline(lead.timeline)}</div>
      </div>

      <div class="detail-card full">
        <div class="detail-label">Status / Response</div>
        <div class="status-row">
          <select id="statusSelect" class="status-select">
            <option value="new" ${lead.status === "new" ? "selected" : ""}>new</option>
            <option value="contacted" ${lead.status === "contacted" ? "selected" : ""}>contacted</option>
            <option value="demo-booked" ${lead.status === "demo-booked" ? "selected" : ""}>demo-booked</option>
            <option value="closed" ${lead.status === "closed" ? "selected" : ""}>closed</option>
          </select>
          <button class="save-status-btn" id="saveStatusBtn">Save Status</button>
          <button class="responded-btn" id="respondedBtn">
            Mark ${lead.responded ? "Not Responded" : "Responded"}
          </button>
        </div>
      </div>

      <div class="detail-card full">
        <div class="detail-label">Transcript</div>
        <div class="detail-value">
          ${
            transcript.length
              ? transcript
                  .map((item) => {
                    const roleClass =
                      item.role === "user" ? "transcript-user" : "transcript-assistant";
                    return `
                      <div class="transcript-item ${roleClass}">
                        <strong>${escapeHtml(item.role || "message")}:</strong>
                        ${escapeHtml(item.content || "")}
                      </div>
                    `;
                  })
                  .join("")
              : "No transcript saved."
          }
        </div>
      </div>
    </div>
  `;

  document.getElementById("saveStatusBtn")?.addEventListener("click", async () => {
    await saveLeadStatus(lead.id);
  });

  document.getElementById("respondedBtn")?.addEventListener("click", async () => {
    await toggleResponded(lead.id, !lead.responded);
  });
}

async function saveLeadStatus(id) {
  const statusSelect = document.getElementById("statusSelect");
  if (!statusSelect) return;

  try {
    const response = await fetch(`/api/leads/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: statusSelect.value
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to update status.");
    }

    replaceLead(result.lead);
  } catch (error) {
    console.error(error);
    alert("Failed to update status.");
  }
}

async function toggleResponded(id, responded) {
  try {
    const response = await fetch(`/api/leads/${id}/responded`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ responded })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to update responded state.");
    }

    replaceLead(result.lead);
  } catch (error) {
    console.error(error);
    alert("Failed to update responded state.");
  }
}

function replaceLead(updatedLead) {
  const index = leads.findIndex((lead) => lead.id === updatedLead.id);

  if (index !== -1) {
    leads[index] = updatedLead;
  }

  renderStats();
  renderLeadList();
  renderLeadDetail(updatedLead);
}

function showLiveNotification(lead) {
  const box = document.getElementById("liveNotification");
  if (!box) return;

  box.innerHTML = `
    <div class="notification-title">New Lead Captured</div>
    <div class="notification-text">
      ${escapeHtml(lead.profile?.businessName || lead.profile?.businessType || "Business")}<br>
      ${escapeHtml(lead.inquiry?.helpType || "Unknown need")}<br>
      Score: ${escapeHtml(String(lead.intelligence?.leadScore ?? ""))}
    </div>
  `;

  box.classList.remove("hidden");

  setTimeout(() => {
    box.classList.add("hidden");
  }, 5000);
}

function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", () => {
    document.cookie =
      "admin_password=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/admin";
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
  setupLogout();
  loadLeads(false);
  setInterval(() => loadLeads(true), 10000);
});