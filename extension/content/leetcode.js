(async function () {
  const slug = window.location.pathname.match(/\/problems\/([\w-]+)/)?.[1];
  if (!slug) return;

  let problemData = null;

  // Primary: LeetCode GraphQL API
  try {
    const res = await fetch("https://leetcode.com/graphql/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        query: `query getQuestionDetail($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            questionId
            title
            titleSlug
            difficulty
            topicTags { name slug }
          }
        }`,
        variables: { titleSlug: slug },
      }),
    });

    const json = await res.json();
    const q = json?.data?.question;

    if (q) {
      problemData = {
        leetcodeId: parseInt(q.questionId),
        title: q.title,
        slug: q.titleSlug,
        difficulty: q.difficulty.toLowerCase(),
        url: `https://leetcode.com/problems/${q.titleSlug}/`,
        platform: "leetcode",
        topics: q.topicTags.map((t) => t.name),
      };
    }
  } catch (e) {
    console.warn("[LeetPro] GraphQL failed, falling back to DOM", e);
  }

  // Fallback: DOM scraping
  if (!problemData) {
    problemData = await extractFromDOM(slug);
  }

  if (problemData) {
    chrome.runtime.sendMessage({
      type: "PROBLEM_DETECTED",
      data: problemData,
    });
    chrome.storage.local.set({ currentProblem: problemData });
  }

  // Handle SPA navigation
  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    window.dispatchEvent(new Event("leetpro-locationchange"));
  };

  window.addEventListener("popstate", () => redetect());
  window.addEventListener("leetpro-locationchange", () => redetect());

  async function redetect() {
    const newSlug = window.location.pathname.match(
      /\/problems\/([\w-]+)/
    )?.[1];
    if (!newSlug || newSlug === slug) return;
    setTimeout(() => location.reload(), 100);
  }

  async function extractFromDOM(slug) {
    await waitForElement('[data-cy="question-title"], .text-title-large, title');

    const titleEl =
      document.querySelector('[data-cy="question-title"]') ||
      document.querySelector(".text-title-large") ||
      document.querySelector('div[class*="title"]');

    const titleText = titleEl?.textContent?.trim();
    const match = titleText?.match(/^(\d+)\.\s*(.+)$/);

    let problemNumber = match ? parseInt(match[1]) : undefined;
    let problemName = match ? match[2] : titleText || slug;

    if (!problemName || problemName === slug) {
      const docTitle = document.title;
      const docMatch = docTitle.match(/^(.+?)\s*[-|]/);
      if (docMatch) problemName = docMatch[1].trim();
    }

    const difficultyEl = document.querySelector(
      '[class*="text-difficulty-easy"], [class*="text-difficulty-medium"], [class*="text-difficulty-hard"]'
    );
    let difficulty = "medium";
    if (difficultyEl) {
      const text = difficultyEl.textContent?.trim().toLowerCase();
      if (text === "easy" || text === "medium" || text === "hard") {
        difficulty = text;
      }
    }

    const topicEls = document.querySelectorAll('a[href*="/tag/"]');
    const topics = [...topicEls]
      .map((el) => el.textContent?.trim())
      .filter(Boolean);

    return {
      leetcodeId: problemNumber,
      title: problemName,
      slug,
      difficulty,
      url: `https://leetcode.com/problems/${slug}/`,
      platform: "leetcode",
      topics,
    };
  }

  // Watch for accepted submissions and auto-show the feedback overlay
  watchForAcceptedSubmission(problemData);

  function watchForAcceptedSubmission(problem) {
    // One overlay per submission, whichever signal sees it first.
    const shownFor = new Set();

    function trigger(key) {
      if (!key || shownFor.has(key)) return;
      shownFor.add(key);
      armedUntil = 0; // this submit is handled; don't let the DOM fallback re-fire
      readEditorSolution(grabSolutionCode).then((solution) =>
        showFeedbackOverlay(problem, solution)
      );
    }

    function currentSubmissionKey() {
      const id = window.location.pathname.match(/\/submissions\/(\d+)/)?.[1];
      return id ?? window.location.href;
    }

    // Primary: submit-watch.js (MAIN world) reports LeetCode's judge result.
    document.addEventListener("leetpro:accepted", (event) => {
      let id = null;
      try {
        id = JSON.parse(event.detail)?.submissionId ?? null;
      } catch {
        id = null;
      }
      // Only numeric ids are real submissions (test runs use runcode_… ids).
      if (id && /^\d+$/.test(String(id))) trigger(String(id));
    });

    // Fallback: the result panel's markup. Check every candidate rather than
    // only the first match, and accept extra text around "Accepted".
    const RESULT_SELECTORS = [
      '[data-e2e-locator="submission-result"]',
      '[class*="result_"] [class*="success"]',
      '[class*="text-green-s"]',
    ].join(",");

    // Test-case runs show their own green "Accepted" in the console panel.
    // Never count anything inside it.
    const RUN_RESULT_AREA =
      '[data-e2e-locator="console-result"], [data-layout-path*="testcase"], [data-layout-path*="test-result"]';

    // Only armed for a while after the Submit button is pressed, so browsing
    // an old accepted submission doesn't pop the overlay. Pressing Run (or
    // its Cmd/Ctrl+' shortcut) disarms it, so a run after a failed submit
    // can't be mistaken for an accepted one.
    let armedUntil = 0;
    const arm = () => (armedUntil = Date.now() + 2 * 60 * 1000);
    const disarm = () => (armedUntil = 0);
    document.addEventListener(
      "click",
      (event) => {
        const target = event.target;
        if (target?.closest?.('[data-e2e-locator="console-submit-button"]')) arm();
        else if (target?.closest?.('[data-e2e-locator="console-run-button"]')) disarm();
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
      // A real submission's result lives at /problems/<slug>/submissions/<id>/.
      if (!/\/submissions\/\d+/.test(window.location.pathname)) return;
      const accepted = [...document.querySelectorAll(RESULT_SELECTORS)].some(
        (el) =>
          !el.closest(RUN_RESULT_AREA) &&
          /^accepted\b/i.test(el.textContent?.trim() ?? "")
      );
      if (accepted) {
        armedUntil = 0;
        trigger(currentSubmissionKey());
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function grabSolutionCode() {
    // Monaco editor: try to get code from the editor's view lines
    const lines = document.querySelectorAll(".view-line");
    if (lines.length > 0) {
      return [...lines].map((l) => l.textContent).join("\n");
    }
    // Fallback: CodeMirror or textarea
    const cm = document.querySelector(".CodeMirror");
    if (cm?.CodeMirror) return cm.CodeMirror.getValue();
    const textarea = document.querySelector('textarea[name="code"]');
    if (textarea) return textarea.value;
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
