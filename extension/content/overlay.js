// Injected feedback overlay that appears when a submission is accepted.
// Shared by leetcode.js and neetcode.js — they call showFeedbackOverlay().

const OVERLAY_ID = "leetpro-feedback-overlay";

const CONFIDENCE_LABELS = {
  1: "No idea how to approach",
  2: "Struggled significantly",
  3: "Solved with some difficulty",
  4: "Solved well",
  5: "Could do this in my sleep",
};

function showFeedbackOverlay(problemData, solutionCode) {
  if (document.getElementById(OVERLAY_ID)) return;

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.innerHTML = `
    <style>
      #${OVERLAY_ID} {
        position: fixed;
        bottom: 0;
        right: 20px;
        width: 380px;
        max-height: 520px;
        overflow-y: auto;
        background: #1E2024;
        border: 1px solid #303238;
        border-bottom: none;
        border-radius: 10px 10px 0 0;
        box-shadow: 0 -4px 24px rgba(0,0,0,0.4);
        font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 13px;
        color: #E9E6DF;
        z-index: 999999;
        animation: leetpro-slide-up 0.3s ease-out;
      }
      @keyframes leetpro-slide-up {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      #${OVERLAY_ID} * { box-sizing: border-box; margin: 0; padding: 0; }
      .lp-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid #303238;
        background: #16171A;
        border-radius: 10px 10px 0 0;
      }
      .lp-header-left { display: flex; align-items: center; gap: 8px; }
      .lp-check { color: #6CC48A; font-size: 18px; font-weight: 700; }
      .lp-title { font-weight: 600; font-size: 14px; }
      .lp-brand { font-family: "JetBrains Mono", monospace; font-size: 11px; color: #9C988F; }
      .lp-brand b { color: #F0B429; font-weight: 700; }
      .lp-close {
        background: none; border: none; color: #9C988F; font-size: 18px;
        cursor: pointer; padding: 4px; line-height: 1;
      }
      .lp-close:hover { color: #E9E6DF; }
      .lp-body { padding: 14px 16px; }
      .lp-field { margin-bottom: 12px; }
      .lp-field label {
        display: block; font-size: 11px; font-weight: 600;
        color: #9C988F; margin-bottom: 5px; text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .lp-select, .lp-input, .lp-textarea {
        width: 100%; padding: 7px 9px;
        border: 1px solid #303238; border-radius: 4px;
        font-size: 13px; font-family: inherit;
        color: #E9E6DF; background: #16171A;
      }
      .lp-select:focus, .lp-input:focus, .lp-textarea:focus {
        outline: none; border-color: #F0B429;
        box-shadow: 0 0 0 2px rgba(240,180,41,0.25);
      }
      .lp-textarea { resize: vertical; }
      .lp-row { display: flex; gap: 8px; }
      .lp-half { flex: 1; }
      .lp-conf-grid {
        display: grid; grid-template-columns: repeat(5, 1fr);
        border: 1px solid #303238; border-radius: 4px; overflow: hidden;
      }
      .lp-conf-btn {
        height: 32px; border: 0; border-right: 1px solid #303238;
        background: #16171A; color: #E9E6DF; cursor: pointer;
        font-family: "JetBrains Mono", monospace; font-size: 13px;
      }
      .lp-conf-btn:last-child { border-right: 0; }
      .lp-conf-btn:hover { background: #26282D; }
      .lp-conf-btn.selected { background: #E9E6DF; color: #16171A; }
      .lp-conf-desc { font-size: 11px; color: #9C988F; margin-top: 4px; }
      .lp-submit {
        display: block; width: 100%; padding: 10px 16px; border: none;
        border-radius: 4px; font-family: inherit; font-size: 13px;
        font-weight: 600; cursor: pointer;
        background: #F0B429; color: #1A1408;
      }
      .lp-submit:hover { background: #F4C451; }
      .lp-submit:disabled { background: #26282D; color: #9C988F; cursor: not-allowed; }
      .lp-success { text-align: center; padding: 20px 16px; }
      .lp-success-icon { font-family: "JetBrains Mono", monospace; font-size: 22px; font-weight: 700; color: #6CC48A; }
      .lp-success p { margin-top: 6px; font-weight: 600; }
      .lp-dismiss { margin-top: 4px; font-size: 11px; color: #9C988F; }
    </style>
    <div class="lp-header">
      <div class="lp-header-left">
        <span class="lp-check">&#10003;</span>
        <span class="lp-title">Accepted — log your attempt</span>
      </div>
      <button class="lp-close" title="Dismiss">&times;</button>
    </div>
    <div class="lp-body">
      <form id="leetpro-overlay-form">
        <div class="lp-field">
          <label>Result</label>
          <select class="lp-select" id="lp-result">
            <option value="solved_independently">Solved independently</option>
            <option value="solved_with_hint">Solved with hint</option>
            <option value="needed_solution">Needed solution</option>
            <option value="could_not_solve">Could not solve</option>
          </select>
        </div>
        <div class="lp-field">
          <label>Confidence</label>
          <div class="lp-conf-grid" id="lp-conf-grid">
            <button type="button" data-value="1" class="lp-conf-btn">1</button>
            <button type="button" data-value="2" class="lp-conf-btn">2</button>
            <button type="button" data-value="3" class="lp-conf-btn">3</button>
            <button type="button" data-value="4" class="lp-conf-btn selected">4</button>
            <button type="button" data-value="5" class="lp-conf-btn">5</button>
          </div>
          <div class="lp-conf-desc" id="lp-conf-desc">Solved well</div>
        </div>
        <div class="lp-row">
          <div class="lp-field lp-half">
            <label>Time (min)</label>
            <input type="number" class="lp-input" id="lp-time" min="1" placeholder="25">
          </div>
          <div class="lp-field lp-half">
            <label>Help used</label>
            <select class="lp-select" id="lp-help">
              <option value="none">None</option>
              <option value="hint">Used hint</option>
              <option value="solution">Looked at solution</option>
              <option value="discussion">Read discussion</option>
            </select>
          </div>
        </div>
        <div class="lp-field">
          <label>Notes</label>
          <textarea class="lp-textarea" id="lp-notes" rows="2" placeholder="Key insight, approach..."></textarea>
        </div>
        <button type="submit" class="lp-submit" id="lp-submit-btn">Log attempt</button>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  let confidence = 4;

  // Default to 4 since they got accepted
  overlay.querySelector(".lp-close").addEventListener("click", () => {
    overlay.remove();
  });

  overlay.querySelectorAll(".lp-conf-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      confidence = parseInt(btn.dataset.value);
      overlay.querySelectorAll(".lp-conf-btn").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      overlay.querySelector("#lp-conf-desc").textContent = CONFIDENCE_LABELS[confidence];
    });
  });

  // Pre-fill solution code in notes if available
  if (solutionCode) {
    const trimmed = solutionCode.length > 2000
      ? solutionCode.slice(0, 2000) + "\n// ... (truncated)"
      : solutionCode;
    overlay.querySelector("#lp-notes").value = trimmed;
  }

  overlay.querySelector("#leetpro-overlay-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const submitBtn = overlay.querySelector("#lp-submit-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Logging...";

    const data = {
      problemId: problemData?.id,
      result: overlay.querySelector("#lp-result").value,
      confidence,
      timeMinutes: overlay.querySelector("#lp-time").value
        ? parseInt(overlay.querySelector("#lp-time").value)
        : undefined,
      helpUsed: overlay.querySelector("#lp-help").value,
      notes: overlay.querySelector("#lp-notes").value || undefined,
    };

    chrome.runtime.sendMessage({ type: "LOG_ATTEMPT", data }, (response) => {
      if (response?.success) {
        overlay.querySelector(".lp-body").innerHTML = `
          <div class="lp-success">
            <div class="lp-success-icon">&#10003; logged</div>
            <p>Attempt saved to your ledger</p>
            <div class="lp-dismiss">Closing in 3s...</div>
          </div>
        `;
        setTimeout(() => overlay.remove(), 3000);
      } else {
        submitBtn.disabled = false;
        submitBtn.textContent = "Log attempt";
        alert("Failed to log: " + (response?.error || "Unknown error"));
      }
    });
  });
}
