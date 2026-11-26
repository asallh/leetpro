// Feedback overlay shown when a submission is accepted.
// Shared by leetcode.js and neetcode.js: they call readEditorSolution() and
// then showFeedbackOverlay(). The UI lives in a shadow root so the host
// page's CSS can't reach it.

const OVERLAY_ID = "leetpro-feedback-overlay";
const LP_PAGE_START = Date.now();

const CONFIDENCE_LABELS = {
  1: "No idea how to approach",
  2: "Struggled significantly",
  3: "Solved with some difficulty",
  4: "Solved well",
  5: "Could do it in my sleep",
};

const RESULTS = [
  { value: "solved_independently", label: "Solved solo", help: "none", confidence: 4 },
  { value: "solved_with_hint", label: "With a hint", help: "hint", confidence: 3 },
  { value: "needed_solution", label: "Saw solution", help: "solution", confidence: 2 },
  { value: "could_not_solve", label: "Didn't solve", help: "solution", confidence: 1 },
];

const HELP = [
  { value: "none", label: "None" },
  { value: "hint", label: "Hint" },
  { value: "solution", label: "Solution" },
  { value: "discussion", label: "Discuss" },
];

const LANGUAGES = {
  python: ["Python", "py"], python3: ["Python", "py"],
  javascript: ["JavaScript", "js"], typescript: ["TypeScript", "ts"],
  java: ["Java", "java"], cpp: ["C++", "cpp"], c: ["C", "c"],
  csharp: ["C#", "cs"], go: ["Go", "go"], golang: ["Go", "go"],
  rust: ["Rust", "rs"], kotlin: ["Kotlin", "kt"], swift: ["Swift", "swift"],
  ruby: ["Ruby", "rb"], scala: ["Scala", "scala"], php: ["PHP", "php"],
  dart: ["Dart", "dart"], sql: ["SQL", "sql"], mysql: ["SQL", "sql"],
};

const KEYWORDS = new Set((
  "and as assert async await break case catch class const continue def default del " +
  "do elif else enum except export extends final finally fn for from func function " +
  "go if impl import in interface is lambda let loop match mod mut new nonlocal not " +
  "or override package pass private protected pub public raise return self static " +
  "struct super switch this throw throws trait try type typeof use val var void " +
  "when where while with yield None True False null nil true false undefined " +
  "int long float double char bool boolean string str auto unsigned vector " +
  "SELECT FROM WHERE JOIN LEFT RIGHT INNER ON GROUP BY ORDER HAVING LIMIT AS AND OR NOT"
).split(" "));

// Ask the page-world bridge for the full editor source; fall back to DOM.
function readEditorSolution(domFallback) {
  return new Promise((resolve) => {
    let settled = false;
    const fromDom = () => {
      const code = domFallback?.();
      return code ? { code, language: null } : null;
    };
    const finish = (value) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("leetpro:code", onCode);
      resolve(value);
    };
    const onCode = (event) => {
      let payload = null;
      try { payload = JSON.parse(event.detail); } catch { payload = null; }
      finish(payload?.code?.trim() ? payload : fromDom());
    };
    document.addEventListener("leetpro:code", onCode);
    document.dispatchEvent(new CustomEvent("leetpro:get-code"));
    setTimeout(() => finish(fromDom()), 400);
  });
}

function lpGuessLanguage(code) {
  if (/^\s*(def |class \w+(\(.*\))?:)/m.test(code)) return "python";
  if (/\bfn \w+\s*\(|impl \w+/.test(code)) return "rust";
  if (/\bfunc \w+\s*\(/.test(code)) return "go";
  if (/#include|vector<|std::/.test(code)) return "cpp";
  if (/\bpublic (int|boolean|String|List|void|long)\b/.test(code)) return "java";
  if (/:\s*(number|string|boolean)\b/.test(code)) return "typescript";
  if (/\b(var|let|const|function)\b/.test(code)) return "javascript";
  return null;
}

function lpEscape(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function lpHighlight(code, language) {
  const hashComments = ["python", "python3", "ruby"].includes(language);
  const comment = hashComments
    ? "#[^\\n]*"
    : language === "sql" || language === "mysql"
      ? "--[^\\n]*"
      : "\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/";
  const string =
    "\"\"\"[\\s\\S]*?\"\"\"|'''[\\s\\S]*?'''|\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*'|`(?:\\\\.|[^`\\\\])*`";
  const re = new RegExp(
    `(${comment})|(${string})|(\\b\\d+(?:\\.\\d+)?\\b)|([A-Za-z_]\\w*)`,
    "g"
  );
  const span = (cls, text) => `<span class="${cls}">${lpEscape(text)}</span>`;
  let out = "";
  let last = 0;
  for (const m of code.matchAll(re)) {
    const token = m[0];
    out += lpEscape(code.slice(last, m.index));
    if (m[1]) out += span("t-c", token);
    else if (m[2]) out += span("t-s", token);
    else if (m[3]) out += span("t-n", token);
    else if (KEYWORDS.has(token)) out += span("t-k", token);
    else if (/^[A-Z]/.test(token)) out += span("t-t", token);
    else if (code[m.index + token.length] === "(") out += span("t-f", token);
    else out += lpEscape(token);
    last = m.index + token.length;
  }
  return out + lpEscape(code.slice(last)) + "\n";
}

const LP_STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .card {
    --bg: #16171A; --surface: #1E2024; --raised: #26282D;
    --text: #E9E6DF; --muted: #9C988F; --faint: #6F6C66; --border: #303238;
    --amber: #F0B429; --on-amber: #1A1408; --success: #6CC48A; --medium: #E3C27A; --error: #EF7B6A;
    --sans: "Mona Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    --mono: "JetBrains Mono", ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;
    position: fixed; right: 20px; bottom: 20px; z-index: 2147483646;
    width: 440px; max-width: calc(100vw - 40px); max-height: calc(100vh - 40px);
    display: flex; flex-direction: column;
    background: var(--surface); color: var(--text);
    border: 1px solid var(--border); border-radius: 16px;
    box-shadow: 0 24px 48px -12px rgba(0,0,0,.6), 0 0 0 1px rgba(0,0,0,.2);
    font: 13.5px/1.5 var(--sans); -webkit-font-smoothing: antialiased;
    animation: lp-in .22s cubic-bezier(.2,.8,.2,1);
    overflow: hidden;
  }
  @keyframes lp-in { from { transform: translateY(12px); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .card { animation: none; } }
  .marker { font-stretch: 112%; }
  button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
  button:focus-visible, input:focus-visible, textarea:focus-visible {
    outline: 2px solid var(--amber); outline-offset: 2px;
  }

  /* header: original mark, the problem as a marker headline */
  .head {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 12px 14px 16px; border-bottom: 1px solid var(--border);
    background: var(--bg); cursor: default;
  }
  .card.min .head { border-bottom: 0; cursor: pointer; }
  .mark { flex: none; display: block; border-radius: 22%; box-shadow: 0 0 0 1px var(--border); }
  .head-main { min-width: 0; flex: 1; }
  .status {
    display: flex; align-items: center; gap: 6px;
    font-weight: 600; font-size: 12.5px; color: var(--success);
  }
  .status svg { flex: none; }
  .title {
    margin-top: 3px; display: flex; align-items: baseline; gap: 8px;
    font-stretch: 112%; font-weight: 700; font-size: 17px; line-height: 1.2;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .title > span:last-child { overflow: hidden; text-overflow: ellipsis; }
  .title .num { font-weight: 500; color: var(--muted); font-variant-numeric: tabular-nums; }
  .diff { flex: none; font-size: 12.5px; font-weight: 600; }
  .diff.easy { color: var(--success); }
  .diff.medium { color: var(--medium); }
  .diff.hard { color: var(--error); }
  .icon-btn {
    flex: none; width: 30px; height: 30px; display: grid; place-items: center;
    border-radius: 8px; color: var(--muted);
  }
  .icon-btn:hover { background: var(--raised); color: var(--text); }

  /* body */
  .body { overflow-y: auto; padding: 16px; display: grid; gap: 18px; overscroll-behavior: contain; }
  .card.min .body, .card.min .foot { display: none; }
  .label-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 7px; }
  .label { display: block; font-size: 12.5px; font-weight: 600; color: var(--text); }
  .label-row .label { margin: 0; }
  .aside { font-size: 12.5px; color: var(--muted); }
  .aside b { color: var(--text); font-weight: 600; }

  .seg {
    display: grid; grid-auto-flow: column; grid-auto-columns: 1fr;
    background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 3px; gap: 3px;
  }
  .seg button {
    height: 32px; border-radius: 7px; color: var(--muted); font-size: 12.5px; white-space: nowrap;
    transition: background-color .15s ease-out, color .15s ease-out;
  }
  .seg button:hover { color: var(--text); background: var(--raised); }
  .seg button[aria-checked="true"] { background: var(--amber); color: var(--on-amber); font-weight: 600; }
  .seg.mono button { font-stretch: 112%; font-size: 15px; font-weight: 700; }
  .seg.small button { height: 30px; font-size: 12px; padding: 0 4px; }

  .row { display: grid; grid-template-columns: 104px 1fr; gap: 12px; }
  .field-time { position: relative; }
  .input {
    width: 100%; height: 38px; padding: 0 38px 0 12px;
    background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
    color: var(--text); font: 600 14px var(--sans); font-variant-numeric: tabular-nums;
    -moz-appearance: textfield;
  }
  .input::-webkit-outer-spin-button, .input::-webkit-inner-spin-button { -webkit-appearance: none; }
  .input::placeholder, .notes::placeholder { color: var(--faint); }
  .suffix {
    position: absolute; right: 12px; bottom: 0; height: 38px; display: flex; align-items: center;
    font-size: 12.5px; color: var(--faint); pointer-events: none;
  }

  /* IDE window: code stays in a monospace face */
  .ide { border: 1px solid var(--border); border-radius: 12px; background: #121316; overflow: hidden; }
  .ide.off { opacity: .45; }
  .ide-bar {
    display: flex; align-items: center; gap: 10px; height: 34px; padding: 0 6px 0 12px;
    background: var(--bg); border-bottom: 1px solid var(--border);
  }
  .dots { display: flex; gap: 5px; }
  .dots i { width: 8px; height: 8px; border-radius: 50%; background: var(--raised); box-shadow: inset 0 0 0 1px #3a3c42; }
  .tab {
    align-self: stretch; display: flex; align-items: center; gap: 6px; padding: 0 10px;
    margin-bottom: -1px; background: #121316; border: 1px solid var(--border); border-bottom: 0;
    border-top: 2px solid var(--amber); border-radius: 6px 6px 0 0; margin-top: 5px;
    font: 12px var(--mono); color: var(--text);
  }
  .ide-meta { margin-left: auto; font-size: 12px; color: var(--faint); white-space: nowrap; }
  .ide-btn { height: 24px; padding: 0 9px; border-radius: 6px; font-size: 12px; color: var(--muted); }
  .ide-btn:hover { background: var(--raised); color: var(--text); }
  .ide-scroll { display: flex; max-height: 240px; overflow: auto; overscroll-behavior: contain; }
  .gutter {
    position: sticky; left: 0; flex: none; min-width: 38px; padding: 10px 10px 10px 8px;
    text-align: right; user-select: none; color: #4D4F55; background: #121316;
    border-right: 1px solid #22242A;
  }
  .editor { display: grid; flex: 1; min-width: 0; }
  .gutter, .hl, .src { font: 12px/1.6 var(--mono); tab-size: 4; white-space: pre; }
  .hl, .src { grid-area: 1 / 1; padding: 10px 14px 10px 12px; min-width: 100%; }
  .hl { color: #CFCBC2; pointer-events: none; }
  .src {
    color: transparent; caret-color: var(--text); background: transparent; border: 0;
    resize: none; overflow: hidden; outline: none; field-sizing: content; min-height: 100%;
  }
  .src::selection { background: rgba(240,180,41,.28); color: transparent; }
  .src::placeholder { color: var(--faint); }
  .t-k { color: #EF9A7F; }
  .t-s { color: #8FCB9B; }
  .t-n { color: #E3C27A; }
  .t-c { color: #6F6C66; font-style: italic; }
  .t-t { color: #E9E6DF; font-weight: 600; }
  .t-f { color: #E9E6DF; }

  .switch { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--muted); cursor: pointer; user-select: none; }
  .switch input { appearance: none; width: 28px; height: 16px; border-radius: 8px; background: var(--raised); border: 1px solid var(--border); position: relative; cursor: pointer; transition: background .15s; }
  .switch input::after { content: ""; position: absolute; top: 2px; left: 2px; width: 10px; height: 10px; border-radius: 50%; background: var(--muted); transition: transform .15s, background .15s; }
  .switch input:checked { background: var(--amber); border-color: var(--amber); }
  .switch input:checked::after { transform: translateX(12px); background: var(--on-amber); }

  .notes {
    width: 100%; min-height: 60px; padding: 9px 12px; resize: vertical;
    background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
    color: var(--text); font: 13.5px/1.5 var(--sans);
  }

  /* footer */
  .foot {
    display: flex; align-items: center; gap: 12px; padding: 12px 16px;
    border-top: 1px solid var(--border); background: var(--bg);
  }
  .hint { flex: 1; font-size: 12.5px; color: var(--muted); }
  .hint b { color: var(--text); font-weight: 600; }
  .hint .ok { color: var(--success); font-weight: 600; }
  .hint.err { color: var(--error); }
  .hint .signin-link {
    background: none; border: 0; padding: 0; font: inherit; font-weight: 600;
    color: var(--text); text-decoration: underline; text-underline-offset: 2px; cursor: pointer;
  }
  kbd {
    display: inline-block; min-width: 18px; padding: 1px 4px; margin-right: 2px; text-align: center;
    border: 1px solid var(--border); border-bottom-width: 2px; border-radius: 4px;
    font: 10.5px var(--mono); color: var(--muted);
  }
  .submit {
    height: 38px; padding: 0 20px; border-radius: 8px;
    background: var(--amber); color: var(--on-amber); font-weight: 700; font-size: 13.5px;
  }
  .submit:hover { background: #F4C451; }
  .submit:disabled { background: var(--raised); color: var(--muted); cursor: progress; }

  /* done */
  .done { padding: 30px 20px 28px; text-align: center; }
  .done-icon {
    width: 44px; height: 44px; margin: 0 auto 12px; display: grid; place-items: center;
    border-radius: 50%; background: rgba(108,196,138,.14); color: var(--success);
  }
  .done-title { font-stretch: 112%; font-weight: 800; font-size: 20px; }
  .done-sub { margin-top: 6px; font-size: 13px; color: var(--muted); }
  .done-sub b { color: var(--text); font-weight: 600; }
`;

// Shadow DOM resolves fonts from the page, so load Mona Sans into the document once.
// If the host page's CSP blocks it, the overlay falls back to the system font.
function lpLoadFont() {
  if (document.getElementById("leetpro-font")) return;
  const link = document.createElement("link");
  link.id = "leetpro-font";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Mona+Sans:wdth,wght@75..125,200..900&display=swap";
  (document.head || document.documentElement).appendChild(link);
}

const LP_MARK = `
  <svg class="mark" width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="7" fill="#16171A"/>
    <rect x="8" y="8" width="16" height="4" rx="1" fill="#E9E6DF"/>
    <rect x="8" y="14" width="12" height="4" rx="1" fill="#8F8C85"/>
    <rect x="8" y="20" width="8" height="4" rx="1" fill="#F0B429"/>
  </svg>`;

const LP_CHECK = (size) => `
  <svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

function showFeedbackOverlay(problemData, solution) {
  if (document.getElementById(OVERLAY_ID)) return;

  const sol = typeof solution === "string" ? { code: solution, language: null } : solution;
  let code = (sol?.code ?? "").replace(/ /g, " ").replace(/\s+$/, "");
  const language = sol?.language || lpGuessLanguage(code) || null;
  const [langName, ext] = LANGUAGES[language] ?? [language ?? "Code", "txt"];

  const state = {
    result: RESULTS[0].value,
    confidence: RESULTS[0].confidence,
    help: RESULTS[0].help,
    saveSolution: true,
  };

  const elapsed = Math.round((Date.now() - LP_PAGE_START) / 60000);
  const defaultTime = elapsed >= 1 && elapsed <= 180 ? elapsed : "";

  lpLoadFont();
  const host = document.createElement("div");
  host.id = OVERLAY_ID;
  const root = host.attachShadow({ mode: "open" });

  const difficulty = problemData?.difficulty ?? "";
  const title = problemData?.title ?? "This problem";
  const num = problemData?.leetcodeId ? `<span class="num">${problemData.leetcodeId}.</span>` : "";

  const seg = (name, items, active, extra = "") => `
    <div class="seg ${extra}" role="radiogroup" data-group="${name}">
      ${items.map((it) => `<button type="button" role="radio" data-value="${it.value}"
        aria-checked="${String(it.value) === String(active)}">${it.label}</button>`).join("")}
    </div>`;

  root.innerHTML = `
    <style>${LP_STYLES}</style>
    <div class="card" role="dialog" aria-label="Log your LeetPro attempt">
      <header class="head">
        ${LP_MARK}
        <div class="head-main">
          <div class="status">${LP_CHECK(12)} Accepted and logged</div>
          <div class="title">
            ${num}<span>${lpEscape(title)}</span>
            ${difficulty ? `<span class="diff ${difficulty}">${difficulty[0].toUpperCase() + difficulty.slice(1)}</span>` : ""}
          </div>
        </div>
        <button type="button" class="icon-btn" data-action="min" title="Minimize" aria-label="Minimize">
          <svg width="14" height="14" viewBox="0 0 16 16"><path d="M3.5 8h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
        <button type="button" class="icon-btn" data-action="close" title="Dismiss (Esc)" aria-label="Dismiss">
          <svg width="14" height="14" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
      </header>

      <form class="body" novalidate>
        <section>
          <div class="label-row"><span class="label">Result</span></div>
          ${seg("result", RESULTS, state.result)}
        </section>

        <section>
          <div class="label-row">
            <span class="label">How confident are you?</span>
            <span class="aside" data-conf-desc>${CONFIDENCE_LABELS[state.confidence]}</span>
          </div>
          ${seg("confidence", [1, 2, 3, 4, 5].map((n) => ({ value: n, label: n })), state.confidence, "mono")}
        </section>

        <section class="row">
          <div>
            <div class="label-row"><label class="label" for="lp-time">Time</label></div>
            <div class="field-time">
              <input id="lp-time" class="input" type="number" min="1" inputmode="numeric" placeholder="25" value="${defaultTime}">
              <span class="suffix">min</span>
            </div>
          </div>
          <div>
            <div class="label-row"><span class="label">Help used</span></div>
            ${seg("help", HELP, state.help, "small")}
          </div>
        </section>

        <section>
          <div class="label-row">
            <span class="label">Solution</span>
            <label class="switch"><input type="checkbox" data-save checked> Save with attempt</label>
          </div>
          <div class="ide">
            <div class="ide-bar">
              <span class="dots"><i></i><i></i><i></i></span>
              <span class="tab">solution.${ext}</span>
              <span class="ide-meta" data-meta></span>
              <button type="button" class="ide-btn" data-action="copy">Copy</button>
            </div>
            <div class="ide-scroll">
              <pre class="gutter" aria-hidden="true" data-gutter></pre>
              <div class="editor">
                <pre class="hl" aria-hidden="true" data-hl></pre>
                <textarea class="src" spellcheck="false" autocapitalize="off" autocomplete="off"
                  aria-label="Solution code" placeholder="Couldn't read your editor. Paste your solution here."
                  data-src></textarea>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div class="label-row"><label class="label" for="lp-notes">Notes</label></div>
          <textarea id="lp-notes" class="notes" rows="2"
            placeholder="Key insight, e.g. map each complement to its index"></textarea>
        </section>
      </form>

      <footer class="foot">
        <span class="hint" data-hint>Logging attempt…</span>
        <button type="button" class="submit" data-action="submit" title="Done (⌘↵)">Done</button>
      </footer>
    </div>
  `;

  document.body.appendChild(host);

  const $ = (sel) => root.querySelector(sel);
  const card = $(".card");
  const src = $("[data-src]");
  const hl = $("[data-hl]");
  const gutter = $("[data-gutter]");
  const meta = $("[data-meta]");
  const hint = $("[data-hint]");
  const submitBtn = $("[data-action=submit]");

  let scheduleSave = () => {};
  let close = () => host.remove();
  let submit = () => {};

  // --- solution editor ---
  function renderCode() {
    const lines = Math.max(1, code.split("\n").length);
    hl.innerHTML = lpHighlight(code, language);
    gutter.textContent = Array.from({ length: lines }, (_, i) => i + 1).join("\n");
    meta.textContent = code ? `${langName}, ${lines} line${lines === 1 ? "" : "s"}` : langName;
  }
  src.value = code;
  renderCode();
  src.addEventListener("input", () => { code = src.value; renderCode(); scheduleSave(1200); });
  src.addEventListener("keydown", (e) => {
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      src.setRangeText("    ", src.selectionStart, src.selectionEnd, "end");
      code = src.value;
      renderCode();
      scheduleSave(1200);
    }
  });

  $("[data-save]").addEventListener("change", (e) => {
    state.saveSolution = e.target.checked;
    $(".ide").classList.toggle("off", !state.saveSolution);
    scheduleSave(0);
  });

  $("[data-action=copy]").addEventListener("click", async (e) => {
    try {
      await navigator.clipboard.writeText(code);
      e.target.textContent = "Copied";
    } catch {
      e.target.textContent = "Failed";
    }
    setTimeout(() => (e.target.textContent = "Copy"), 1400);
  });

  // --- segmented controls ---
  function setGroup(name, value) {
    root.querySelectorAll(`[data-group=${name}] button`).forEach((b) => {
      b.setAttribute("aria-checked", String(b.dataset.value === String(value)));
    });
  }
  function setConfidence(n) {
    state.confidence = n;
    setGroup("confidence", n);
    $("[data-conf-desc]").textContent = CONFIDENCE_LABELS[n];
  }
  root.querySelectorAll(".seg").forEach((group) => {
    group.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const name = group.dataset.group;
      const value = btn.dataset.value;
      scheduleSave();
      if (name === "confidence") return setConfidence(Number(value));
      state[name] = value;
      setGroup(name, value);
      if (name === "result") {
        // A result implies sensible defaults for help and confidence.
        const preset = RESULTS.find((r) => r.value === value);
        state.help = preset.help;
        setGroup("help", preset.help);
        setConfidence(preset.confidence);
      }
    });
  });

  $("#lp-time").addEventListener("input", () => scheduleSave(900));
  $("#lp-notes").addEventListener("input", () => scheduleSave(1200));

  // --- header actions ---
  $("[data-action=close]").addEventListener("click", () => close());
  $("[data-action=min]").addEventListener("click", (e) => {
    e.stopPropagation();
    card.classList.add("min");
  });
  $(".head").addEventListener("click", () => card.classList.remove("min"));

  // --- keyboard (kept away from the host page's shortcuts) ---
  card.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Escape") return close();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      return submit();
    }
    const typing = e.target.matches?.("input, textarea");
    if (!typing && /^[1-5]$/.test(e.key)) {
      setConfidence(Number(e.key));
      scheduleSave();
    }
  });
  card.addEventListener("keyup", (e) => e.stopPropagation());
  card.addEventListener("keypress", (e) => e.stopPropagation());
  submitBtn.addEventListener("click", () => submit());
  // Content scripts can't open tabs; the service worker opens the sign-in page.
  hint.addEventListener("click", (e) => {
    if (e.target.closest(".signin-link")) chrome.runtime.sendMessage({ type: "OPEN_SIGN_IN" });
  });

  // --- logging: create on open, then autosave edits to the same attempt ---
  const sync = { attemptId: null, creating: null, dirty: false, timer: null, closed: false, removed: false };

  // Always settles, so the overlay can never spin forever (issue #15). A
  // reloaded or updated extension orphans this content script: sendMessage
  // then throws or never answers, and only a page reload reconnects it.
  const SEND_TIMEOUT_MS = 20000;
  function send(message) {
    return new Promise((resolve) => {
      const timer = setTimeout(
        () => resolve({ success: false, error: "timeout" }),
        SEND_TIMEOUT_MS
      );
      const done = (response) => {
        clearTimeout(timer);
        resolve(response);
      };
      try {
        chrome.runtime.sendMessage(message, (response) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) done({ success: false, error: "disconnected" });
          else done(response ?? { success: false, error: "disconnected" });
        });
      } catch {
        done({ success: false, error: "disconnected" });
      }
    });
  }

  function setStatus(html, kind = "") {
    hint.className = `hint ${kind}`;
    hint.innerHTML = html;
  }

  function errorText(response, fallback) {
    const error = response?.error ?? "";
    if (error === "disconnected") {
      return "LeetPro was updated or reloaded. Reload this page to log your attempt.";
    }
    if (error === "timeout") {
      return "LeetPro took too long to answer. Press Retry.";
    }
    if (/401/.test(error)) {
      return `<button type="button" class="signin-link">Sign in to LeetPro</button>, then press Retry.`;
    }
    const status = error.match(/API (\d{3})/)?.[1];
    return status ? `${fallback} (server ${status})` : fallback;
  }

  function scheduleLabel(data) {
    if (!data?.nextReviewDate) return "";
    const days = data.reviewInterval;
    return ` <span class="next">Next review <b>${days === 1 ? "tomorrow" : `in ${days} days`}</b>.</span>`;
  }

  function details() {
    const time = parseInt($("#lp-time").value, 10);
    const notes = $("#lp-notes").value.trim();
    const keepCode = state.saveSolution && code.trim();
    return {
      result: state.result,
      confidence: state.confidence,
      helpUsed: state.help,
      timeMinutes: Number.isFinite(time) && time > 0 ? time : null,
      notes: notes || null,
      solution: keepCode ? code : null,
      language: keepCode && language ? language : null,
    };
  }

  // POST drops nulls; PATCH uses them to clear a field.
  const withoutNulls = (obj) =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null));

  async function create() {
    if (!problemData) {
      setStatus("Couldn't detect this problem. Reload and try again.", "err");
      return false;
    }
    setStatus("Logging attempt…");
    const detected = problemData.id
      ? { success: true, data: problemData }
      : await send({ type: "PROBLEM_DETECTED", data: problemData });
    if (!detected?.success || !detected.data?.id) {
      setStatus(errorText(detected, "Couldn't reach LeetPro. Check your connection, then press Retry."), "err");
      return false;
    }
    sync.dirty = false;
    const response = await send({
      type: "LOG_ATTEMPT",
      data: { problemId: detected.data.id, ...withoutNulls(details()) },
    });
    if (!response?.success || !response.data?.id) {
      setStatus(errorText(response, "Couldn't log the attempt."), "err");
      return false;
    }
    sync.attemptId = response.data.id;
    setStatus(`<span class="ok">Logged.</span>${scheduleLabel(response.data)}`);
    return true;
  }

  async function update() {
    sync.dirty = false;
    setStatus("Saving…");
    const response = await send({ type: "UPDATE_ATTEMPT", id: sync.attemptId, data: details() });
    if (!response?.success) {
      if (response?.status === 404) {
        // Usually removed in the web app. Stop: retrying can't work, and
        // logging it again would undo a removal the user chose.
        sync.removed = true;
        submitBtn.textContent = "Close";
        setStatus("This attempt is no longer in your LeetPro account (it may have been removed there), so changes here aren't saved.", "err");
        return false;
      }
      sync.dirty = true;
      setStatus(errorText(response, "Couldn't save your changes."), "err");
      return false;
    }
    setStatus(`<span class="ok">Saved.</span>${scheduleLabel(response.data)}`);
    return true;
  }

  // Runs whatever is pending: the first log, or the latest edits.
  async function flush() {
    clearTimeout(sync.timer);
    if (sync.removed) return false;
    if (sync.creating) await sync.creating;
    if (!sync.attemptId) {
      sync.creating = create().finally(() => (sync.creating = null));
      const ok = await sync.creating;
      return ok && sync.dirty ? update() : ok;
    }
    return sync.dirty ? update() : true;
  }

  scheduleSave = (delay = 700) => {
    sync.dirty = true;
    if (!sync.attemptId || sync.removed) return; // the first log picks these up
    clearTimeout(sync.timer);
    sync.timer = setTimeout(flush, delay);
  };

  close = () => {
    if (sync.closed) return;
    sync.closed = true;
    // The service worker finishes the request even after we're gone.
    if (sync.dirty || !sync.attemptId) flush();
    host.remove();
  };

  submit = async () => {
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    let ok = false;
    try {
      ok = await flush();
    } catch {
      setStatus("Couldn't log the attempt. Press Retry.", "err");
    } finally {
      submitBtn.disabled = false;
    }
    if (sync.removed) {
      close(); // nothing left to save, so the button just closes
      return;
    }
    if (!ok) {
      submitBtn.textContent = "Retry";
      return;
    }
    $(".body").outerHTML = `
      <div class="done" role="status">
        <div class="done-icon">${LP_CHECK(20)}</div>
        <div class="done-title">Logged${state.saveSolution && code.trim() ? " with your solution" : ""}</div>
        <div class="done-sub">${hint.querySelector(".next")?.innerHTML.trim() || "Saved to your ledger."}</div>
      </div>`;
    $(".foot").remove();
    sync.closed = true;
    setTimeout(() => host.remove(), 2200);
  };

  // Log the accepted submission straight away.
  flush();
}
