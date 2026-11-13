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
    let lastShownUrl = null;
    const observer = new MutationObserver(() => {
      // LeetCode renders "Accepted" in a span with data-e2e-locator="submission-result"
      // or inside an element with class containing "text-green" or "success"
      const resultEl =
        document.querySelector('[data-e2e-locator="submission-result"]') ||
        document.querySelector('[class*="result_"] [class*="success"]') ||
        document.querySelector('[class*="text-green-s"]');

      if (!resultEl) return;
      const text = resultEl.textContent?.trim().toLowerCase();
      if (text !== "accepted") return;

      // Don't re-trigger for the same page
      if (lastShownUrl === window.location.href) return;
      lastShownUrl = window.location.href;

      readEditorSolution(grabSolutionCode).then((solution) =>
        showFeedbackOverlay(problem, solution)
      );
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
