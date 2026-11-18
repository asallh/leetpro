const states = {
  loading: document.getElementById("loading"),
  notAuth: document.getElementById("not-auth"),
  offline: document.getElementById("offline"),
  problemDetected: document.getElementById("problem-detected"),
  noProblem: document.getElementById("no-problem"),
  success: document.getElementById("success"),
};

const confidenceDescriptions = {
  1: "No idea how to approach",
  2: "Struggled significantly",
  3: "Solved with some difficulty",
  4: "Solved well",
  5: "Could do this in my sleep",
};

const RESULT_LABELS = {
  solved_independently: "Solved",
  solved_with_hint: "Hint",
  needed_solution: "Needed solution",
  could_not_solve: "Couldn't solve",
};

const STATUS_LABELS = {
  new_problem: "New",
  learning: "Learning",
  review: "Review",
  mastered: "Mastered",
};

const API_BASE = self.LEETPRO_CONFIG.apiBase.replace(/\/+$/, "");

// Links open the configured app in a new tab (and close the popup), so dev
// and production builds never point at the wrong host.
document.querySelectorAll("a[data-path]").forEach((link) => {
  link.href = `${API_BASE}${link.dataset.path}`;
  link.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: link.href });
    window.close();
  });
});

document.getElementById("retry-btn").addEventListener("click", () => init());

let selectedConfidence = 3;
let currentProblem = null;

function showState(name) {
  Object.values(states).forEach((el) => el.classList.add("hidden"));
  states[name].classList.remove("hidden");
  // The account menu only makes sense while signed in and reachable.
  if (name === "notAuth" || name === "offline") hideAccountMenu();
}

// Extract slug from a leetcode or neetcode URL
function extractSlug(url) {
  if (!url) return null;
  const m = url.match(/(?:leetcode\.com|neetcode\.io)\/problems\/([\w-]+)/);
  return m ? m[1] : null;
}

// Confidence buttons
document.querySelectorAll(".conf-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedConfidence = parseInt(btn.dataset.value);
    document.querySelectorAll(".conf-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    document.getElementById("confidence-desc").textContent =
      confidenceDescriptions[selectedConfidence];
  });
});

// Form submit
document.getElementById("attempt-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById("submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Logging...";

  // The server may not know this problem yet (the page loaded while signed
  // out, or detection failed). Register it first so the attempt has an id,
  // but only with details the content script read from the page.
  if (!currentProblem?.id && currentProblem?.slug && !currentProblem.unverified) {
    const detected = await new Promise((resolve) =>
      chrome.runtime.sendMessage({ type: "PROBLEM_DETECTED", data: currentProblem }, resolve)
    );
    if (detected?.success && detected.data?.id) {
      currentProblem = { ...currentProblem, id: detected.data.id };
    }
  }

  if (!currentProblem?.id) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Log attempt";
    alert("Couldn't log attempt: LeetPro doesn't recognise this problem yet. Refresh the problem page and try again.");
    return;
  }

  const data = {
    problemId: currentProblem.id,
    result: document.getElementById("result").value,
    confidence: selectedConfidence,
    timeMinutes: document.getElementById("time-minutes").value
      ? parseInt(document.getElementById("time-minutes").value)
      : undefined,
    helpUsed: document.getElementById("help-used").value,
    notes: document.getElementById("notes").value || undefined,
  };

  chrome.runtime.sendMessage({ type: "LOG_ATTEMPT", data }, (response) => {
    submitBtn.disabled = false;
    submitBtn.textContent = "Log attempt";

    if (response?.success) {
      showState("success");
      setTimeout(() => window.close(), 2000);
    } else if (response?.status === 401) {
      showState("notAuth");
    } else {
      alert("Failed to log attempt: " + (response?.error || "Unknown error"));
    }
  });
});

// Account menu (header dots): who you're signed in as, dashboard, sign out
const menu = {
  root: document.getElementById("account-menu"),
  trigger: document.getElementById("menu-trigger"),
  panel: document.getElementById("menu-panel"),
  name: document.getElementById("menu-account-name"),
  email: document.getElementById("menu-account-email"),
  signOut: document.getElementById("menu-sign-out"),
  error: document.getElementById("menu-error"),
};

function menuItems() {
  return [...menu.panel.querySelectorAll('[role="menuitem"]:not(:disabled)')];
}

function openMenu() {
  menu.panel.hidden = false;
  menu.trigger.setAttribute("aria-expanded", "true");
  menuItems()[0]?.focus();
}

function closeMenu({ returnFocus = true } = {}) {
  if (menu.panel.hidden) return;
  menu.panel.hidden = true;
  menu.trigger.setAttribute("aria-expanded", "false");
  menu.error.hidden = true;
  if (returnFocus) menu.trigger.focus();
}

function showAccountMenu(user) {
  menu.name.textContent = user?.name || "";
  menu.email.textContent = user?.email || "";
  document.getElementById("menu-account").hidden = !user?.name && !user?.email;
  menu.root.classList.remove("hidden");
}

function hideAccountMenu() {
  closeMenu({ returnFocus: false });
  menu.root.classList.add("hidden");
}

menu.trigger.addEventListener("click", () => {
  if (menu.panel.hidden) openMenu();
  else closeMenu();
});

menu.panel.addEventListener("keydown", (event) => {
  const items = menuItems();
  const index = items.indexOf(document.activeElement);
  if (event.key === "Escape") {
    event.preventDefault();
    closeMenu();
  } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    items[(index + step + items.length) % items.length]?.focus();
  } else if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    items[event.key === "Home" ? 0 : items.length - 1]?.focus();
  } else if (event.key === "Tab") {
    closeMenu({ returnFocus: false });
  }
});

document.addEventListener("click", (event) => {
  if (!menu.root.contains(event.target)) closeMenu({ returnFocus: false });
});

document.getElementById("menu-dashboard").addEventListener("click", () =>
  closeMenu({ returnFocus: false })
);

// Sign out ends the shared session, so the website is signed out too.
menu.signOut.addEventListener("click", () => {
  menu.signOut.disabled = true;
  menu.signOut.textContent = "Signing out…";
  menu.error.hidden = true;
  chrome.runtime.sendMessage({ type: "SIGN_OUT" }, (response) => {
    menu.signOut.disabled = false;
    menu.signOut.textContent = "Sign out";
    if (response?.success) {
      hideAccountMenu();
      currentProblem = null;
      showState("notAuth");
    } else {
      menu.error.textContent = "Couldn't sign out. Check your connection and try again.";
      menu.error.hidden = false;
      menu.signOut.focus();
    }
  });
});

// Initialize popup
async function init() {
  showState("loading");

  // Check auth
  chrome.runtime.sendMessage({ type: "CHECK_AUTH" }, async (authRes) => {
    if (!authRes?.authenticated) {
      if (authRes?.reachable === false) {
        document.getElementById("offline-detail").textContent =
          authRes.status >= 500
            ? `LeetPro is having trouble (server ${authRes.status}). Try again shortly.`
            : "Check your connection and try again.";
        showState("offline");
      } else {
        showState("notAuth");
      }
      return;
    }
    showAccountMenu(authRes.user);

    // Get current tab URL to detect problem
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const slug = extractSlug(tab?.url);

    if (!slug) {
      showStatsUI();
      return;
    }

    // We're on a problem page — get stored problem data for display
    const stored = await chrome.storage.local.get("currentProblem");
    const storedProblem = stored.currentProblem;

    // Fetch server-side stats for this slug
    chrome.runtime.sendMessage({ type: "GET_PROBLEM_STATS", slug }, (res) => {
      if (res?.status === 401) {
        showState("notAuth");
        return;
      }
      if (res?.success && res.data?.found) {
        const { problem, stats, recentAttempts, tracked } = res.data;
        currentProblem = problem;

        // Show problem info from server data or stored data
        const displayProblem = storedProblem?.slug === slug ? storedProblem : {
          ...problem,
          slug,
          topics: [],
        };
        showProblemUI(displayProblem);

        if (tracked && stats) {
          showProblemStats(stats, recentAttempts);
        } else {
          document.getElementById("problem-new").classList.remove("hidden");
        }
      } else if (storedProblem?.slug === slug) {
        // Server doesn't know this problem yet, but content script detected it
        currentProblem = storedProblem;
        showProblemUI(storedProblem);
        document.getElementById("problem-new").classList.remove("hidden");
      } else {
        // Fallback: we only know the slug from the URL. The title and
        // difficulty would be guesses, and problem rows are shared and never
        // rewritten, so this one is display-only: logging asks for a refresh
        // so the content script can read the real details from the page.
        currentProblem = {
          title: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          slug,
          difficulty: "",
          topics: [],
          unverified: true,
        };
        showProblemUI(currentProblem);
        document.getElementById("problem-new").classList.remove("hidden");
      }
    });
  });
}

function showProblemUI(problem) {
  const diffBadge = document.getElementById("problem-difficulty");
  const difficulty = String(problem.difficulty || "").toLowerCase();
  diffBadge.textContent = { easy: "E", medium: "M", hard: "H" }[difficulty] || "?";
  diffBadge.title = difficulty;
  diffBadge.setAttribute("aria-label", difficulty);
  diffBadge.className = `badge ${difficulty}`;

  document.getElementById("problem-title").textContent =
    (problem.leetcodeId ? `${problem.leetcodeId}. ` : "") + problem.title;

  const topicsEl = document.getElementById("problem-topics");
  topicsEl.innerHTML = "";
  (problem.topics || []).forEach((t) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = t;
    topicsEl.appendChild(tag);
  });

  showState("problemDetected");
}

function showProblemStats(stats, recentAttempts) {
  const el = document.getElementById("problem-stats");
  el.classList.remove("hidden");

  document.getElementById("ps-attempts").textContent = stats.totalAttempts;
  document.getElementById("ps-best").textContent =
    stats.bestConfidence ? `${stats.bestConfidence}/5` : "—";

  const recallEl = document.getElementById("ps-recall");
  if (stats.recall !== null && stats.recall !== undefined) {
    const pct = Math.round(stats.recall * 100);
    recallEl.textContent = `${pct}%`;
    recallEl.className = `stat-item-value ${pct < 70 ? "due" : "good"}`;
  } else {
    recallEl.textContent = "—";
  }

  const statusEl = document.getElementById("ps-status");
  statusEl.textContent = STATUS_LABELS[stats.status] || stats.status;

  // Recent attempts
  const historyEl = document.getElementById("ps-history");
  if (recentAttempts && recentAttempts.length > 0) {
    historyEl.innerHTML = "<h3>Recent attempts</h3>";
    for (const a of recentAttempts) {
      const d = new Date(a.date);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      const row = document.createElement("div");
      row.className = "history-row";
      row.innerHTML = `
        <span class="history-date">${dateStr}</span>
        <span class="history-result">${RESULT_LABELS[a.result] || a.result}</span>
        <span class="history-conf">${a.confidence}/5</span>
        <span class="history-date">${a.timeMinutes ? a.timeMinutes + "m" : ""}</span>
      `;
      historyEl.appendChild(row);
    }
  } else {
    historyEl.innerHTML = "";
  }
}

function showStatsUI() {
  chrome.runtime.sendMessage({ type: "GET_STATS" }, (res) => {
    if (res?.status === 401) {
      showState("notAuth");
      return;
    }
    if (res?.success && res.data) {
      document.getElementById("stat-solved").textContent =
        res.data.totalProblems || 0;
      document.getElementById("stat-review").textContent =
        res.data.reviewDueCount || 0;
      document.getElementById("stat-streak").textContent =
        res.data.streak || 0;
    }
    showState("noProblem");
  });
}

init();
