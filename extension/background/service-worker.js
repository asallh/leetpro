importScripts("../config.js");

const API_BASE = self.LEETPRO_CONFIG.apiBase.replace(/\/+$/, "");

// Errors carry the HTTP status so callers can tell "signed out" (401) apart
// from "server down" (status 0 = network failure, CORS, DNS, offline).
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function apiRequest(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      cache: "no-store",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(0, "Couldn't reach LeetPro");
  }
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json();
}

function fail(sendResponse) {
  return (err) =>
    sendResponse({ success: false, status: err.status ?? 0, error: err.message });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PROBLEM_DETECTED") {
    apiRequest("/api/problems/detect", {
      method: "POST",
      body: JSON.stringify(message.data),
    })
      .then((data) => sendResponse({ success: true, data }))
      .catch(fail(sendResponse));
    return true;
  }

  if (message.type === "LOG_ATTEMPT") {
    apiRequest("/api/attempts", {
      method: "POST",
      body: JSON.stringify(message.data),
    })
      .then((data) => sendResponse({ success: true, data }))
      .catch(fail(sendResponse));
    return true;
  }

  if (message.type === "UPDATE_ATTEMPT") {
    apiRequest(`/api/attempts/${encodeURIComponent(message.id)}`, {
      method: "PATCH",
      body: JSON.stringify(message.data),
    })
      .then((data) => sendResponse({ success: true, data }))
      .catch(fail(sendResponse));
    return true;
  }

  if (message.type === "GET_STATS") {
    apiRequest("/api/stats")
      .then((data) => sendResponse({ success: true, data }))
      .catch(fail(sendResponse));
    return true;
  }

  if (message.type === "GET_PROBLEM_STATS") {
    apiRequest(`/api/problems/stats?slug=${encodeURIComponent(message.slug)}`)
      .then((data) => sendResponse({ success: true, data }))
      .catch(fail(sendResponse));
    return true;
  }

  if (message.type === "CHECK_AUTH") {
    // get-session answers 200 with `null` when nobody is signed in.
    apiRequest("/api/auth/get-session")
      .then((data) => {
        const authenticated = !!data?.session;
        if (authenticated) updateBadge();
        else chrome.action.setBadgeText({ text: "" });
        sendResponse({ success: true, reachable: true, authenticated });
      })
      .catch((err) =>
        sendResponse({
          success: false,
          reachable: err.status !== 0 && err.status < 500,
          authenticated: false,
          status: err.status,
        })
      );
    return true;
  }

  if (message.type === "GET_CONFIG") {
    sendResponse({ apiBase: API_BASE });
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

// Grey out the icon on sites that aren't leetcode or neetcode
const SUPPORTED_PATTERNS = [/^https:\/\/leetcode\.com\//, /^https:\/\/neetcode\.io\//];

function isSupportedSite(url) {
  return SUPPORTED_PATTERNS.some((p) => p.test(url || ""));
}

function updateIcon(tabId, url) {
  const active = isSupportedSite(url);
  if (active) {
    chrome.action.setIcon({ tabId, path: {
      16: "icons/icon16.png", 32: "icons/icon32.png",
      48: "icons/icon48.png", 128: "icons/icon128.png",
    }}).catch(() => {});
  } else {
    chrome.action.setIcon({ tabId, path: {
      16: "icons/icon16-grey.png", 32: "icons/icon32-grey.png",
      48: "icons/icon48-grey.png", 128: "icons/icon128-grey.png",
    }}).catch(() => {});
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    updateIcon(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId).then((tab) => {
    updateIcon(tabId, tab.url);
  }).catch(() => {});
});
