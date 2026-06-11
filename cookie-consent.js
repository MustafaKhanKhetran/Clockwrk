(function () {
  const STORAGE_KEY = "cw_cookie_consent";

  function setConsent(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      document.cookie = `${STORAGE_KEY}=${value}; max-age=31536000; path=/; SameSite=Lax`;
    }
  }

  function hasConsentChoice() {
    try {
      return Boolean(localStorage.getItem(STORAGE_KEY));
    } catch {
      return document.cookie.split("; ").some((item) => item.startsWith(`${STORAGE_KEY}=`));
    }
  }

  function hideBanner(banner, value) {
    setConsent(value);
    banner.classList.remove("is-ready", "is-visible");
  }

  document.addEventListener("DOMContentLoaded", () => {
    const banner = document.querySelector("[data-cookie-consent]");
    if (!banner || hasConsentChoice()) return;

    const deny = banner.querySelector("[data-cookie-deny]");
    const allow = banner.querySelector("[data-cookie-allow]");

    banner.classList.add("is-visible");
    requestAnimationFrame(() => banner.classList.add("is-ready"));

    deny?.addEventListener("click", () => hideBanner(banner, "denied"));
    allow?.addEventListener("click", () => hideBanner(banner, "allowed"));
  });
})();
