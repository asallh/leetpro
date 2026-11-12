const states = {
  loading: document.getElementById("loading"),
  notAuth: document.getElementById("not-auth"),
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

let selectedConfidence = 3;
let currentProblem = null;

function showState(name) {
  Object.values(states).forEach((el) => el.classList.add("hidden"));
  states[name].classList.remove("hidden");
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

  const data = {
    problemId: currentProblem?.id,
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
    } else {
      alert("Failed to log attempt: " + (response?.error || "Unknown error"));
    }
  });
});

// Initialize popup
async function init() {
  showState("loading");

  // Check auth
  chrome.runtime.sendMessage({ type: "CHECK_AUTH" }, async (authRes) => {
    if (!authRes?.authenticated) {
      showState("notAuth");
      return;
    }

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
        // Fallback: we know the slug from URL but have no data
        showProblemUI({
          title: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          slug,
          difficulty: "medium",
          topics: [],
        });
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
