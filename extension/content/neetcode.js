(async function () {
  const match = window.location.pathname.match(/\/problems\/([\w-]+)/);
  if (!match) return;
  const slug = match[1];

  await waitForElement("h1, [class*='title'], title");

  const titleEl =
    document.querySelector("h1") ||
    document.querySelector('[class*="title"]');

  let title = titleEl?.textContent?.trim() || slug;

  let leetcodeId = undefined;

  // Extract difficulty
  let difficulty = "medium";
  const diffEl = document.querySelector(
    '[class*="easy"], [class*="medium"], [class*="hard"]'
  );
  if (diffEl) {
    const text = diffEl.textContent?.trim().toLowerCase();
    if (text === "easy" || text === "medium" || text === "hard") {
      difficulty = text;
    }
  }

  // Extract category from breadcrumb or sidebar
  const topics = [];
  const breadcrumb = document.querySelector(
    '[class*="breadcrumb"], nav a, [class*="category"]'
  );
  if (breadcrumb) {
    const cat = breadcrumb.textContent?.trim();
    if (cat && cat.length < 50) topics.push(cat);
  }

  const problemData = {
    neetcodeId: slug,
    title: title.replace(/^\d+\.\s*/, ""),
    slug,
    difficulty,
    url: `https://neetcode.io/problems/${slug}`,
    platform: "neetcode",
    topics,
    leetcodeId,
  };

  try {
    chrome.runtime.sendMessage({
      type: "PROBLEM_DETECTED",
      data: problemData,
    });
    chrome.storage.local.set({ currentProblem: problemData });
  } catch {
    // The extension was reloaded; this old content script is orphaned.
  }

  // SPA navigation: NeetCode swaps problems without a page load, and this
  // script read the problem from the DOM once. Reload on a new slug so the
  // next submission is logged against the right problem (issue #15).
  // Content scripts run in an isolated world, so patching history.pushState
  // here never sees the page's own navigation; watch the URL instead.
  const onLocationChange = () => {
    const newSlug = window.location.pathname.match(/\/problems\/([\w-]+)/)?.[1];
    if (newSlug && newSlug !== slug) location.reload();
  };
  window.addEventListener("popstate", onLocationChange);
  setInterval(onLocationChange, 1000);

  // Watch for accepted submissions and auto-show the feedback overlay
  watchForAcceptedSubmission(problemData);

  function watchForAcceptedSubmission(problem) {
    // Submit and Run share one result panel, and the URL doesn't change on
    // submit, so we key each overlay by submission rather than by page.
    let armedUntil = 0; // DOM fallback window after pressing Submit
    let lastTriggerAt = 0;

    function trigger() {
      // Network and DOM signals can both see the same submission.
      if (Date.now() - lastTriggerAt < 15000) return;
      lastTriggerAt = Date.now();
      armedUntil = 0;
      readEditorSolution(grabSolutionCode).then((solution) =>
        showFeedbackOverlay(problem, solution)
      );
    }

    // Primary: submit-watch.js (MAIN world) sees NeetCode's submit response.
    // It only matches the submit function, never the Run function.
    document.addEventListener("leetpro:accepted", () => trigger());

    // Fallback: the result panel. Armed by Submit (button or Ctrl/Cmd+Enter),
    // disarmed by Run (button or Ctrl/Cmd+'), because Run renders its own
    // "Accepted" in the same panel.
    const arm = () => (armedUntil = Date.now() + 2 * 60 * 1000);
    const disarm = () => (armedUntil = 0);

    document.addEventListener(
      "click",
      (event) => {
        const button = event.target?.closest?.("button");
        if (!button) return;
        const label = button.textContent?.trim().toLowerCase();
        if (button.classList.contains("submit-btn") || label === "submit") arm();
        else if (label === "run") disarm();
      },
      true
    );
    document.addEventListener(
      "keydown",
      (event) => {
        if (!(event.metaKey || event.ctrlKey)) return;
        if (event.key === "Enter") arm();
        else if (event.key === "'") disarm();
      },
      true
    );

    const observer = new MutationObserver(() => {
      if (Date.now() > armedUntil) return;
      if (findAcceptedResult()) trigger();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // An element whose own text is exactly "Accepted" (the verdict heading),
    // ignoring buttons, the submissions history table, and test-case tabs.
    function findAcceptedResult() {
      const candidates = document.querySelectorAll(
        ".submission-result-accepted, h1, h2, h3, h4, span, div, p"
      );
      for (const el of candidates) {
        if (el.children.length > 0) continue;
        if (el.textContent?.trim() !== "Accepted") continue;
        if (el.closest("button, table, [role='tab']")) continue;
        return el;
      }
      return null;
    }
  }

  function grabSolutionCode() {
    // Monaco editor
    const lines = document.querySelectorAll(".view-line");
    if (lines.length > 0) {
      return [...lines].map((l) => l.textContent).join("\n");
    }
    // CodeMirror
    const cm = document.querySelector(".CodeMirror");
    if (cm?.CodeMirror) return cm.CodeMirror.getValue();
    return null;
  }

  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }
})();
