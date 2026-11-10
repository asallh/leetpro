const API_BASE_KEY = "leetpro_api_base";
const DEFAULT_API_BASE = "http://localhost:3000";

async function getApiBase() {
  const result = await chrome.storage.local.get(API_BASE_KEY);
  return result[API_BASE_KEY] || DEFAULT_API_BASE;
}

async function apiRequest(path, options = {}) {
  const base = await getApiBase();
  const res = await fetch(`${base}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PROBLEM_DETECTED") {
    apiRequest("/api/problems/detect", {
      method: "POST",
      body: JSON.stringify(message.data),
    })
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === "LOG_ATTEMPT") {
    apiRequest("/api/attempts", {
      method: "POST",
      body: JSON.stringify(message.data),
    })
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === "GET_STATS") {
    apiRequest("/api/stats")
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === "CHECK_AUTH") {
    apiRequest("/api/auth/get-session")
      .then((data) => sendResponse({ success: true, authenticated: !!data }))
      .catch(() => sendResponse({ success: false, authenticated: false }));
    return true;
  }

  if (message.type === "SET_API_BASE") {
    chrome.storage.local.set({ [API_BASE_KEY]: message.url });
    sendResponse({ success: true });
    return false;
  }
});

// Update badge with review count periodically
async function updateBadge() {
  try {
    const stats = await apiRequest("/api/stats");
    const count = stats.reviewDueCount;
    if (count > 0) {
      chrome.action.setBadgeText({ text: String(count) });
      chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  } catch {
    chrome.action.setBadgeText({ text: "" });
  }
}

// Check review count every 30 minutes
chrome.alarms.create("updateBadge", { periodInMinutes: 30 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "updateBadge") updateBadge();
});

// Also update on install/startup
chrome.runtime.onInstalled.addListener(() => updateBadge());
chrome.runtime.onStartup.addListener(() => updateBadge());
