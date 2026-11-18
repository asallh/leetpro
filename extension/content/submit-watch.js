// Runs in the page's MAIN world at document_start so it wraps fetch/XHR before
// the site's own code grabs a reference to them.
//
// It watches the judge's response to a real submission (never a test-case
// run) and, when it is accepted, tells the isolated content script with a
// "leetpro:accepted" event carrying a per-submission id. The JSON is a far
// steadier signal than result-panel markup, which both sites restyle often.
//
// LeetCode: Submit polls /submissions/detail/<numeric id>/check/ until the
//   judge finishes (state "SUCCESS", status_msg "Accepted"). Run polls the
//   same path with a runcode_… id and returns code_answer fields.
// NeetCode: Submit POSTs /api/executeCodeFunctionHttp and gets back
//   { data: { status: { description: "Accepted" } } }. Run uses a different
//   function, /api/runCodeFunctionHttp, which we never match.

(function () {
  if (window.__leetproSubmitWatch) return;
  window.__leetproSubmitWatch = true;

  const LEETCODE_CHECK = /\/submissions\/detail\/(\d+)\/check\/?/;
  const NEETCODE_SUBMIT = /\/executeCodeFunctionHttp(?:[?#]|$)/;

  const announced = new Set();
  let neetcodeSeq = 0;

  function announce(id) {
    if (announced.has(id)) return;
    announced.add(id);
    document.dispatchEvent(
      new CustomEvent("leetpro:accepted", { detail: JSON.stringify({ submissionId: id }) })
    );
  }

  function parse(text) {
    try {
      return typeof text === "string" ? JSON.parse(text) : text;
    } catch {
      return null;
    }
  }

  // Returns a handler for the response body if this URL is one we care about.
  function matcherFor(url) {
    const leetcodeId = url.match(LEETCODE_CHECK)?.[1];
    if (leetcodeId) {
      return (text) => {
        const data = parse(text);
        if (data?.state !== "SUCCESS") return;
        if (/runcode/i.test(String(data.task_name ?? "")) || "code_answer" in data) return;
        if (data.status_msg === "Accepted" || data.status_code === 10) announce(leetcodeId);
      };
    }
    if (NEETCODE_SUBMIT.test(url)) {
      const id = `neetcode-${Date.now()}-${++neetcodeSeq}`;
      return (text) => {
        const body = parse(text);
        const result = body?.data ?? body?.result ?? body;
        if (result?.status?.description === "Accepted") announce(id);
      };
    }
    return null;
  }

  const originalFetch = window.fetch;
  if (typeof originalFetch === "function") {
    window.fetch = function (...args) {
      const promise = originalFetch.apply(this, args);
      try {
        const input = args[0];
        const url = typeof input === "string" ? input : input?.url ?? String(input);
        const handle = matcherFor(url);
        if (handle) {
          promise
            .then((res) => res.clone().text())
            .then(handle)
            .catch(() => {});
        }
      } catch {
        // never break the page's request
      }
      return promise;
    };
  }

  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    try {
      const handle = matcherFor(String(url));
      if (handle) {
        this.addEventListener("load", () => {
          try {
            const body =
              this.responseType === "" || this.responseType === "text"
                ? this.responseText
                : this.response;
            handle(body);
          } catch {
            // ignore unreadable responses
          }
        });
      }
    } catch {
      // never break the page's request
    }
    return originalOpen.call(this, method, url, ...rest);
  };
})();
