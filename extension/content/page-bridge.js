// Runs in the page's MAIN world so it can read the Monaco editor directly.
// Monaco virtualizes lines, so scraping .view-line in the DOM only returns
// what is on screen. The isolated content scripts ask for the full source
// with a "leetpro:get-code" event and get a JSON string back.

(function () {
  document.addEventListener("leetpro:get-code", () => {
    let payload = null;
    try {
      const editor = window.monaco?.editor;
      const models = editor?.getModels?.() ?? [];
      // Prefer the model backing the focused or most recent editor.
      const active = editor?.getEditors?.().find((e) => e.hasTextFocus?.()) ??
        editor?.getEditors?.()[0];
      const model = active?.getModel?.() ??
        models.find((m) => m.getValue().trim().length > 0) ??
        models[0];
      if (model) {
        payload = {
          code: model.getValue(),
          language: model.getLanguageId?.() ?? null,
        };
      }
    } catch {
      payload = null;
    }
    document.dispatchEvent(
      new CustomEvent("leetpro:code", { detail: JSON.stringify(payload) })
    );
  });
})();
