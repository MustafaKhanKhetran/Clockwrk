(function () {
  const FIELD_SELECTOR = [
    "input:not([type='hidden']):not([type='file']):not([type='checkbox']):not([type='radio']):not([type='button']):not([type='submit']):not([type='reset'])",
    "textarea"
  ].join(", ");
  const SKIP_SELECTOR = [
    "#cwAppForm",
    "#cwAppForm .cw-link-pill-input",
    "#cwAppForm .cw-skill-input",
    ".cw-link-pill-input",
    ".cw-skill-input",
    ".cw-file-drop",
    ".bk-cf-guest-pill",
    "[data-no-input-hint]"
  ].join(", ");
  const SHELL_SELECTOR = [
    ".cw-group",
    ".book-call-field",
    ".bk-cf-field:not(.bk-cf-field--readonly)",
    ".referral-input-row",
    ".site-footer-input",
    ".pricing-checkout-field",
    ".pricing-mobile-checkout-field",
    ".ck-confirm-field",
    ".ck-referral-input-wrap"
  ].join(", ");

  function cleanHint(text) {
    return String(text || "")
      .replace(/\s*\*\s*$/g, "")
      .replace(/\s+—\s+press \+ to add/gi, "")
      .replace(/\s*\(optional\)/gi, "")
      .trim();
  }

  function isEligible(field) {
    if (!field || !field.matches?.(FIELD_SELECTOR)) return false;
    if (field.closest(SKIP_SELECTOR)) return false;
    return Boolean(cleanHint(field.getAttribute("placeholder")));
  }

  function hasActionButton(shell, field) {
    return Array.from(shell.querySelectorAll("button, [role='button']")).some(
      (button) => !button.classList.contains("cw-input-hint-btn") && button !== field,
    );
  }

  function wrapField(field) {
    if (field.parentElement?.classList.contains("cw-input-hint-wrap")) {
      return field.parentElement;
    }
    const wrap = document.createElement("span");
    wrap.className = "cw-input-hint-wrap";
    field.before(wrap);
    wrap.appendChild(field);
    return wrap;
  }

  function getShell(field) {
    if (!isEligible(field)) return null;
    let shell = field.closest(SHELL_SELECTOR);
    if (!shell || shell.matches(".cw-group") && shell.querySelectorAll(FIELD_SELECTOR).length > 1) {
      shell = wrapField(field);
    }
    shell.classList.add("cw-input-hint-shell");
    shell.classList.toggle("cw-input-hint-shell--with-action", hasActionButton(shell, field));
    return shell;
  }

  function getValue(field) {
    return String(field.dataset.fullUrl || field.value || "").trim();
  }

  function clearHint(shell) {
    if (!shell) return;
    shell.classList.remove("has-hover-hint", "is-hint-open");
    shell.querySelector(".cw-input-hint-btn")?.remove();
    shell.querySelector(".cw-input-hint-overlay")?.remove();
  }

  function showHintOverlay(shell) {
    if (!shell) return;
    shell.classList.add("is-hint-open");
  }

  function hideHintOverlay(shell) {
    if (!shell) return;
    shell.classList.remove("is-hint-open");
  }

  function ensureHint(field) {
    if (!isEligible(field)) return;
    const shell = getShell(field);
    if (!shell) return;
    if (!getValue(field)) {
      clearHint(shell);
      return;
    }
    const hint = cleanHint(field.getAttribute("placeholder"));
    if (!hint) return;

    shell.querySelector(".cw-input-hint-btn")?.remove();
    shell.querySelector(".cw-input-hint-overlay")?.remove();
    shell.classList.add("has-hover-hint");

    const button = document.createElement("button");
    button.type = "button";
    button.tabIndex = -1;
    button.className = "cw-input-hint-btn";
    button.setAttribute("aria-label", hint);
    button.textContent = "?";

    const overlay = document.createElement("span");
    overlay.className = "cw-input-hint-overlay";
    overlay.textContent = hint;

    button.addEventListener("mouseenter", () => showHintOverlay(shell));
    button.addEventListener("mouseleave", () => hideHintOverlay(shell));
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showHintOverlay(shell);
    });
    button.addEventListener("touchstart", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showHintOverlay(shell);
    }, { passive: false });

    shell.append(button, overlay);
  }

  function syncField(field) {
    if (!isEligible(field)) return;
    const shell = getShell(field);
    if (!shell) return;
    if (document.activeElement === field || !getValue(field)) {
      clearHint(shell);
      return;
    }
    ensureHint(field);
  }

  function findField(target) {
    const field = target?.closest?.(FIELD_SELECTOR);
    return isEligible(field) ? field : null;
  }

  function init() {
    document.querySelectorAll(FIELD_SELECTOR).forEach(syncField);

    document.addEventListener("input", (event) => syncField(event.target));
    document.addEventListener("change", (event) => syncField(event.target));
    document.addEventListener("focusin", (event) => {
      const field = findField(event.target);
      if (field) clearHint(getShell(field));
    });
    document.addEventListener("focusout", (event) => {
      const field = findField(event.target);
      if (field) requestAnimationFrame(() => syncField(field));
    });
    document.addEventListener("mouseover", (event) => {
      const field = findField(event.target);
      if (!field || document.activeElement === field || !getValue(field)) return;
      ensureHint(field);
    });
    document.addEventListener("mouseout", (event) => {
      const field = findField(event.target);
      if (!field) return;
      const shell = getShell(field);
      if (event.relatedTarget && shell?.contains(event.relatedTarget)) return;
      clearHint(shell);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
