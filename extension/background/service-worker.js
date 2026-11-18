importScripts("../config.js");

const API_BASE = self.LEETPRO_CONFIG.apiBase.replace(/\/+$/, "");
const IS_DEV = (self.LEETPRO_CONFIG.env ?? "").toLowerCase() !== "prod";

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
      // A stalled request must still answer the overlay (issue #15).
      signal: AbortSignal.timeout(15000),
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
  try {
    return await res.json();
  } catch {
    // e.g. an HTML page from a proxy or the site gate instead of JSON
    throw new ApiError(0, "Couldn't reach LeetPro");
  }
}

const DEFAULT_TITLE = chrome.runtime.getManifest().name;

// Signed out: an amber "!" on the toolbar icon, so a new install doesn't sit
// there silently until the first accepted submission fails to log.
function showSignedOut() {
  chrome.action.setBadgeText({ text: "!" });
  chrome.action.setBadgeBackgroundColor({ color: "#F59E0B" });
  chrome.action.setTitle({ title: `${DEFAULT_TITLE}: sign in to start tracking` });
}

function openSignIn() {
  return chrome.tabs.create({ url: `${API_BASE}/sign-in` });
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
        else showSignedOut();
        sendResponse({
          success: true,
          reachable: true,
          authenticated,
          // Only what the popup's account menu shows.
          user:
            authenticated && data.user
              ? { name: data.user.name ?? "", email: data.user.email ?? "" }
              : null,
        });
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

  if (message.type === "SIGN_OUT") {
    // Only our own popup may sign the user out.
    if (sender.id !== chrome.runtime.id || sender.tab) {
      sendResponse({ success: false, error: "Not allowed" });
      return false;
    }
    apiRequest("/api/auth/sign-out", { method: "POST", body: "{}" })
      .then(async () => {
        await chrome.storage.local.remove("currentProblem");
        showSignedOut();
        sendResponse({ success: true });
      })
      .catch(fail(sendResponse));
    return true;
  }

  if (message.type === "OPEN_SIGN_IN") {
    // From the overlay's "Sign in" link; content scripts can't open tabs.
    if (sender.id !== chrome.runtime.id) return false;
    openSignIn();
    return false;
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
    chrome.action.setTitle({ title: DEFAULT_TITLE });
    if (count > 0) {
      chrome.action.setBadgeText({ text: String(count) });
      chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  } catch (err) {
    if (err.status === 401) showSignedOut();
    else chrome.action.setBadgeText({ text: "" });
  }
}

// Check review count every 30 minutes
chrome.alarms.create("updateBadge", { periodInMinutes: 30 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "updateBadge") updateBadge();
});

// Also update on install/startup
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  updateBadge();
  // First install: send a new user straight to sign-in instead of leaving
  // them to discover it in the popup.
  if (reason !== "install") return;
  try {
    const session = await apiRequest("/api/auth/get-session");
    if (!session?.session) openSignIn();
  } catch (err) {
    if (err.status === 401) openSignIn();
  }
});
chrome.runtime.onStartup.addListener(() => updateBadge());

// Grey out the icon on sites that aren't leetcode or neetcode
const SUPPORTED_PATTERNS = [/^https:\/\/leetcode\.com\//, /^https:\/\/neetcode\.io\//];

function isSupportedSite(url) {
  return SUPPORTED_PATTERNS.some((p) => p.test(url || ""));
}

const ICON_SIZES = [16, 32, 48, 128];
const iconPaths = (variant) =>
  Object.fromEntries(ICON_SIZES.map((size) => [size, `icons/icon${size}${variant}.png`]));

// Dev builds stamp a violet band (the web app's DEV pill color) across the
// bottom of the toolbar icon, so a dev and a production install never look
// alike. Drawn once per variant at runtime, so there are no extra PNGs to keep
// in sync with the real icons.
const devIconCache = new Map();

function devIcon(variant) {
  if (!devIconCache.has(variant)) {
    devIconCache.set(variant, drawDevIcon(variant).catch((err) => {
      devIconCache.delete(variant);
      throw err;
    }));
  }
  return devIconCache.get(variant);
}

async function drawDevIcon(variant) {
  const imageData = {};
  for (const size of ICON_SIZES) {
    const res = await fetch(chrome.runtime.getURL(`icons/icon${size}${variant}.png`));
    const bitmap = await createImageBitmap(await res.blob());
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, size, size);

    const band = Math.max(4, Math.round(size * 0.28));
    ctx.fillStyle = "#C084FC";
    ctx.fillRect(0, size - band, size, band);
    if (size >= 48) {
      ctx.fillStyle = "#16171A";
      ctx.font = `700 ${Math.round(band * 0.78)}px ui-monospace, Menlo, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("DEV", size / 2, size - band / 2 + 0.5);
    }
    imageData[size] = ctx.getImageData(0, 0, size, size);
  }
  return imageData;
}

async function setIcon(details, variant) {
  try {
    if (IS_DEV) {
      await chrome.action.setIcon({ ...details, imageData: await devIcon(variant) });
    } else {
      await chrome.action.setIcon({ ...details, path: iconPaths(variant) });
    }
  } catch {
    // The tab may have closed; a failed dev stamp falls back to the plain icon.
    if (IS_DEV) chrome.action.setIcon({ ...details, path: iconPaths(variant) }).catch(() => {});
  }
}

function updateIcon(tabId, url) {
  setIcon({ tabId }, isSupportedSite(url) ? "" : "-grey");
}

if (IS_DEV) {
  // Default icon for tabs that haven't fired an update yet.
  setIcon({}, "");
  chrome.action.setTitle({ title: DEFAULT_TITLE });
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
