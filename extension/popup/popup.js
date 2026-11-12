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

let selectedConfidence = 3;
let currentProblem = null;

function showState(name) {
  Object.values(states).forEach((el) => el.classList.add("hidden"));
  states[name].classList.remove("hidden");
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

    // Check for detected problem
    const stored = await chrome.storage.local.get("currentProblem");
    const problem = stored.currentProblem;

    // Also check current tab URL
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    const isOnProblem =
      tab?.url?.match(/leetcode\.com\/problems\//) ||
      tab?.url?.match(/neetcode\.io\/problems\//);

    if (problem && isOnProblem) {
      currentProblem = problem;
      showProblemUI(problem);
    } else {
      showStatsUI();
    }
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
