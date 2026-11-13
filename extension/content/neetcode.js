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

  chrome.runtime.sendMessage({
    type: "PROBLEM_DETECTED",
    data: problemData,
  });
  chrome.storage.local.set({ currentProblem: problemData });

  // SPA navigation handling
  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    window.dispatchEvent(new Event("leetpro-locationchange"));
  };

  window.addEventListener("popstate", () => {
    const newSlug = window.location.pathname.match(
      /\/problems\/([\w-]+)/
    )?.[1];
    if (newSlug && newSlug !== slug) {
      setTimeout(() => location.reload(), 100);
    }
  });

  window.addEventListener("leetpro-locationchange", () => {
    const newSlug = window.location.pathname.match(
      /\/problems\/([\w-]+)/
    )?.[1];
    if (newSlug && newSlug !== slug) {
      setTimeout(() => location.reload(), 100);
    }
  });

  // Watch for accepted submissions and auto-show the feedback overlay
  watchForAcceptedSubmission(problemData);

  function watchForAcceptedSubmission(problem) {
    let lastShownUrl = null;
    const observer = new MutationObserver(() => {
      // NeetCode shows success indicators after accepted submissions
      const resultEl =
        document.querySelector('[class*="accepted"], [class*="success"], [class*="correct"]');

      if (!resultEl) return;
      const text = resultEl.textContent?.trim().toLowerCase();
      if (!text.includes("accepted") && !text.includes("correct") && !text.includes("success")) return;

      if (lastShownUrl === window.location.href) return;
      lastShownUrl = window.location.href;

      readEditorSolution(grabSolutionCode).then((solution) =>
        showFeedbackOverlay(problem, solution)
      );
    });

    observer.observe(document.body, { childList: true, subtree: true });
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
