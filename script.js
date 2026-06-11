// =========================================================
// CLOCKWRK - INTERACTIVE SCRIPT
// Smooth scroll, active nav, floating icons, navbar expand
// =========================================================

(function () {
  "use strict";

  // ---------------------------------------------------------
  // 1) Smooth Scroll + Active Link Tracking
  // ---------------------------------------------------------
  const links = Array.from(document.querySelectorAll(".nav-link"));
  const hashLinks = links.filter((a) => {
    const href = a.getAttribute("href") || "";
    return href.startsWith("#");
  });
  const sections = hashLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  // Smooth scroll on link click
  hashLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href");
      const targetEl = document.querySelector(targetId);

      if (targetEl) {
        // Smooth scroll to section
        targetEl.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        // Update URL without reload
        if (history.replaceState) {
          history.replaceState(null, "", targetId);
        }
      }
    });
  });

  document.querySelectorAll('.site-footer-top[href="#top"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });

      if (history.replaceState) {
        history.replaceState(null, "", window.location.pathname);
      }
    });
  });

  // Active link on scroll (Intersection Observer)
  if (sections.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const targetId = `#${entry.target.id}`;

            // Update active state
            links.forEach((link) => {
              const isActive = link.getAttribute("href") === targetId;
              link.classList.toggle("active", isActive);
            });
          }
        });
      },
      {
        root: null,
        threshold: 0.5, // Trigger when 50% of section is visible
        rootMargin: "-20% 0px -20% 0px", // Account for navbar
      }
    );

    sections.forEach((section) => observer.observe(section));
  }

  // ---------------------------------------------------------
  // 2) Navbar Expand/Collapse on Hover (Desktop only)
  //    ✅ Robust breakpoint control using matchMedia
  //    ✅ Auto-expand when scrolled past logo
  // ---------------------------------------------------------
  const navPill = document.getElementById("navPill");
  const navZone = document.getElementById("navZone");
  const logoStage = document.querySelector(".logo-stage");
  let isScrolledPastLogo = false;

  if (navZone && navPill) {
    const mqMobile = window.matchMedia("(max-width: 860px)");

    function setViewportMode() {
      // mark mode on <html> so CSS can hard-switch too
      document.documentElement.dataset.vp = mqMobile.matches
        ? "mobile"
        : "desktop";

      // always clear desktop-only state when entering mobile
      if (mqMobile.matches) {
        navPill.classList.remove("is-expanded");
        navPill.style.boxShadow = ""; // also clear inline shadow (your scroll code sets this)
      }
    }

    // Run once and on breakpoint changes (more reliable than resize)
    setViewportMode();
    mqMobile.addEventListener("change", setViewportMode);

    // Desktop hover behavior
    navZone.addEventListener("mouseenter", () => {
      if (!mqMobile.matches) navPill.classList.add("is-expanded");
    });

    navZone.addEventListener("mouseleave", () => {
      if (!mqMobile.matches && !isScrolledPastLogo) navPill.classList.remove("is-expanded");
    });

    const setScrollExpandedState = (shouldExpand) => {
      isScrolledPastLogo = shouldExpand;
      if (!mqMobile.matches) {
        navPill.classList.toggle("is-expanded", shouldExpand);
      }
    };

    // Auto-expand navbar when scrolled past logo (Desktop only)
    if (logoStage) {
      const logoObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
              setScrollExpandedState(true);
            } else if (entry.isIntersecting) {
              setScrollExpandedState(false);
            }
          });
        },
        {
          root: null,
          threshold: 0,
          rootMargin: "0px",
        }
      );

      logoObserver.observe(logoStage);
    } else {
      const updateNavScrollState = () => {
        setScrollExpandedState(window.scrollY > 24);
      };

      updateNavScrollState();
      window.addEventListener("scroll", updateNavScrollState, { passive: true });
    }
  }

  // ---------------------------------------------------------
  // 3) Floating Icons Animation (Smooth Motion)
  // ---------------------------------------------------------
  const floatEls = Array.from(document.querySelectorAll("[data-float]"));

  if (floatEls.length > 0) {
    const mqMobileFloat = window.matchMedia("(max-width: 860px)");
    let startTime = performance.now();
    let animationFrameId;

    function animateFloat(currentTime) {
      // Don't animate on mobile
      if (mqMobileFloat.matches) {
        floatEls.forEach((el) => {
          el.style.transform = "translate3d(0, 0, 0) rotate(0deg)";
        });
        return;
      }

      const elapsedSeconds = (currentTime - startTime) / 1000;

      floatEls.forEach((el, index) => {
        // Different speed and amplitude for each icon
        const speed = 0.8 + index * 0.12;
        const amplitudeX = 3 + index * 0.6;
        const amplitudeY = 2.2 + index * 0.5;

        // Calculate position
        const x = Math.sin(elapsedSeconds * speed) * amplitudeX;
        const y = Math.cos(elapsedSeconds * speed) * amplitudeY;
        const rotate = Math.sin(elapsedSeconds * (speed * 0.7)) * 1.2;

        // Apply transform
        el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg)`;
      });

      animationFrameId = requestAnimationFrame(animateFloat);
    }

    // Start animation
    animationFrameId = requestAnimationFrame(animateFloat);

    // Listen for breakpoint changes
    if (mqMobileFloat.addEventListener) {
      mqMobileFloat.addEventListener("change", () => {
        if (mqMobileFloat.matches) {
          // Stop animation on mobile
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
          }
          floatEls.forEach((el) => {
            el.style.transform = "translate3d(0, 0, 0) rotate(0deg)";
          });
        } else {
          // Restart animation on desktop
          startTime = performance.now();
          animationFrameId = requestAnimationFrame(animateFloat);
        }
      });
    }
  }

  // ---------------------------------------------------------
  // 4) Mobile Menu Toggle
  // ---------------------------------------------------------
  const mobileMenuBtn = document.querySelector(".mnav-menu");
  const mobileMenu = document.getElementById("mobileMenu");
  const mobileMenuLinks = document.querySelectorAll(".mobile-menu-link");
  let mobileMenuCloseTimer;

  if (mobileMenuBtn && mobileMenu) {
    const openMobileMenu = () => {
      clearTimeout(mobileMenuCloseTimer);
      document.body.classList.remove("mobile-menu-closing");
      document.body.classList.add("mobile-menu-open");
      mobileMenuBtn.classList.add("is-open");
      mobileMenu.classList.add("is-open");
      mobileMenuBtn.setAttribute("aria-label", "Close menu");
      mobileMenuBtn.setAttribute("aria-expanded", "true");
    };

    const closeMobileMenu = () => {
      clearTimeout(mobileMenuCloseTimer);
      mobileMenuBtn.classList.remove("is-open");
      mobileMenu.classList.remove("is-open");
      document.body.classList.remove("mobile-menu-open");
      document.body.classList.add("mobile-menu-closing");
      mobileMenuBtn.setAttribute("aria-label", "Open menu");
      mobileMenuBtn.setAttribute("aria-expanded", "false");

      mobileMenuCloseTimer = window.setTimeout(() => {
        document.body.classList.remove("mobile-menu-closing");
      }, 760);
    };

    // Toggle menu on button click
    mobileMenuBtn.addEventListener("click", () => {
      const isOpen = mobileMenuBtn.classList.contains("is-open");

      if (isOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    // Close menu when a link is clicked
    mobileMenuLinks.forEach((link) => {
      link.addEventListener("click", () => {
        closeMobileMenu();
      });
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (
        !mobileMenu.contains(e.target) &&
        !mobileMenuBtn.contains(e.target) &&
        mobileMenu.classList.contains("is-open")
      ) {
        closeMobileMenu();
      }
    });
  }

  // ---------------------------------------------------------
  // 5) Scroll-based Navbar Shadow (Optional Enhancement)
  // ---------------------------------------------------------
  window.addEventListener(
    "scroll",
    () => {
      const currentScroll = window.scrollY;

      if (navPill) {
        if (currentScroll > 100) {
          navPill.style.boxShadow = "0 18px 55px rgba(0, 0, 0, 0.15)";
        } else {
          navPill.style.boxShadow = "";
        }
      }
    },
    { passive: true }
  );

  // ---------------------------------------------------------
  // 6) Prevent Layout Shift (add class when fonts loaded)
  // ---------------------------------------------------------
  if (document.fonts) {
    document.fonts.ready.then(() => {
      document.body.classList.add("fonts-loaded");
    });
  }

  // ---------------------------------------------------------
  // 7) Performance: Reduce motion for users who prefer it
  // ---------------------------------------------------------
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  if (prefersReducedMotion.matches) {
    // Disable floating animation
    floatEls.forEach((el) => {
      el.style.transform = "none";
    });
  }

  // ---------------------------------------------------------
  // 8) Pricing — plan and billing selection
  // ---------------------------------------------------------
  const pricingShell = document.querySelector(".pricing-shell");

  if (pricingShell) {
    const pricingBilling = pricingShell.querySelector(".pricing-billing");
    const billingButtons = Array.from(
      pricingShell.querySelectorAll("[data-pricing-billing]")
    );
    const planCards = Array.from(
      pricingShell.querySelectorAll("[data-pricing-plan]")
    );
    const pricingSummary = pricingShell.querySelector(".pricing-summary");
    const summaryTotals = Array.from(pricingShell.querySelectorAll("[data-pricing-summary-total]"));
    const proceedButtons = Array.from(pricingShell.querySelectorAll("[data-plan]"));

    let activeBilling = "weekly";
    let isFirstSync = true;
    let activePlan = planCards.find((card) =>
      card.classList.contains("pricing-plan-card-active")
    ) || planCards[0];

    const addonButtons = Array.from(pricingShell.querySelectorAll(".pricing-addon-action button[data-addon-price]"));

    function getAddonPrice(btn) {
      const price = activeBilling === "monthly"
        ? (btn.dataset.addonMonthlyPrice || btn.dataset.addonPrice)
        : (btn.dataset.addonWeeklyPrice || btn.dataset.addonPrice);
      const amount = Number(price);
      return Number.isFinite(amount) ? amount : 0;
    }

    function getAddonTotal() {
      return addonButtons.reduce((sum, btn) => {
        return sum + (btn.classList.contains("is-added") ? getAddonPrice(btn) : 0);
      }, 0);
    }

    function formatPrice(value) {
      const amount = Number(value);
      if (!Number.isFinite(amount)) return "$0";
      return `$${amount.toLocaleString("en-US")}`;
    }

    function animateCounter(el, from, to, duration, prefix = "") {
      if (el._counterRAF) cancelAnimationFrame(el._counterRAF);
      const start = performance.now();
      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = `${prefix}${formatPrice(Math.round(from + (to - from) * eased))}`;
        if (progress < 1) {
          el._counterRAF = requestAnimationFrame(step);
        } else {
          el.textContent = `${prefix}${formatPrice(to)}`;
          el._counterRAF = null;
        }
      }
      el._counterRAF = requestAnimationFrame(step);
    }

    function syncPricingUI(billingChanged) {
      if (pricingBilling) {
        pricingBilling.dataset.activeBilling = activeBilling;
      }

      billingButtons.forEach((button) => {
        const isActive = button.dataset.pricingBilling === activeBilling;
        button.classList.toggle("pricing-billing-option-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });

      const isMonthly = activeBilling === "monthly";

      addonButtons.forEach((btn) => {
        const priceEl = btn.closest(".pricing-addon-action")?.querySelector(".pricing-addon-price");
        if (!priceEl) return;
        const targetVal = getAddonPrice(btn);
        if (isFirstSync) {
          priceEl.textContent = `+ ${formatPrice(targetVal)}`;
          priceEl._currentVal = targetVal;
        } else if (billingChanged) {
          const fromVal = priceEl._currentVal ?? targetVal;
          priceEl.classList.add("is-entering");
          animateCounter(priceEl, fromVal, targetVal, 300, "+ ");
          priceEl._currentVal = targetVal;
          setTimeout(() => priceEl.classList.remove("is-entering"), 320);
        }
      });

      planCards.forEach((card) => {
        const isActive = card === activePlan;
        const priceEl = card.querySelector(".pricing-plan-price");
        const origEl = card.querySelector(".pricing-plan-price-orig");
        const weeklyVal = Number(card.dataset.weeklyPrice);
        const monthlyDiscounted = Number(card.dataset.monthlyPrice);
        const monthlyFull = weeklyVal * 4;

        card.classList.toggle("pricing-plan-card-active", isActive);

        if (priceEl) {
          priceEl.classList.toggle("pricing-plan-price-active", isActive);
          const targetVal = isMonthly ? monthlyDiscounted : weeklyVal;

          if (isFirstSync) {
            priceEl.textContent = formatPrice(targetVal);
            priceEl._currentVal = targetVal;
          } else if (billingChanged) {
            const fromVal = priceEl._currentVal ?? weeklyVal;
            priceEl.classList.add("is-entering");
            animateCounter(priceEl, fromVal, targetVal, 300);
            priceEl._currentVal = targetVal;
            setTimeout(() => priceEl.classList.remove("is-entering"), 320);
          }
        }

        if (origEl && billingChanged) {
          if (isMonthly) {
            origEl.textContent = formatPrice(weeklyVal);
            origEl.classList.add("is-visible");
            animateCounter(origEl, weeklyVal, monthlyFull, 300);
            origEl._currentVal = monthlyFull;
          } else {
            origEl.classList.remove("is-visible");
            setTimeout(() => { origEl.textContent = ""; }, 280);
          }
        }
      });

      if (summaryTotals.length && activePlan) {
        const weeklyVal = Number(activePlan.dataset.weeklyPrice);
        const planVal = isMonthly
          ? Number(activePlan.dataset.monthlyPrice)
          : weeklyVal;
        const targetVal = planVal + getAddonTotal();
        summaryTotals.forEach((el) => {
          if (isFirstSync) {
            el.textContent = formatPrice(targetVal);
          } else {
            animateCounter(el, el._currentVal ?? targetVal, targetVal, 300);
          }
          el._currentVal = targetVal;
        });
      }

      proceedButtons.forEach((button) => {
        if (activePlan?.dataset.pricingPlan) {
          button.dataset.plan = activePlan.dataset.pricingPlan;
        }
      });

      isFirstSync = false;
    }

    billingButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeBilling = button.dataset.pricingBilling || "weekly";
        syncPricingUI(true);
      });
    });

    addonButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const isAdded = btn.classList.toggle("is-added");
        btn.classList.toggle("is-active", isAdded);
        const priceEl = btn.closest(".pricing-addon-action").querySelector(".pricing-addon-price");
        if (priceEl) priceEl.classList.toggle("is-added", isAdded);

        if (summaryTotals.length && activePlan) {
          const isMonthly = activeBilling === "monthly";
          const planVal = isMonthly
            ? Number(activePlan.dataset.monthlyPrice)
            : Number(activePlan.dataset.weeklyPrice);
          const newTotal = planVal + getAddonTotal();
          summaryTotals.forEach((el) => {
            animateCounter(el, el._currentVal ?? newTotal, newTotal, 300);
            el._currentVal = newTotal;
          });
        }
      });
    });

    planCards.forEach((card) => {
      const selectButton = card.querySelector(".pricing-plan-select");
      const activateCard = () => {
        activePlan = card;
        syncPricingUI(false);
      };

      card.addEventListener("click", activateCard);
      if (selectButton) {
        selectButton.addEventListener("click", (event) => {
          event.stopPropagation();
          activateCard();
        });
      }
    });

    syncPricingUI(false);

    const pricingEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function getPricingErrorKey(field) {
      return field?.id || field?.name || "";
    }

    function getPricingErrorAnchor(field) {
      if (field?.type === "checkbox") {
        return field.closest(".pricing-mobile-front-lower") || field.closest("label") || field;
      }
      return field.closest("label") || field;
    }

    function getPricingErrorMessage(field) {
      if (!field) return null;
      const key = getPricingErrorKey(field);
      if (!key) return null;
      let msg = pricingShell.querySelector(`[data-pricing-error-for="${key}"]`);
      if (!msg) {
        msg = document.createElement("span");
        msg.className = "bk-error-msg";
        msg.dataset.pricingErrorFor = key;
        getPricingErrorAnchor(field).insertAdjacentElement("afterend", msg);
      }
      return msg;
    }

    function pricingShowError(field, message) {
      if (!field) return;
      field.classList.add("bk-field-error");
      field.classList.remove("bk-field-ok");
      field.addEventListener("input", () => pricingClearError(field), { once: true });
      field.addEventListener("change", () => pricingClearError(field), { once: true });
    }

    function pricingClearError(field) {
      if (!field) return;
      field.classList.remove("bk-field-error");
      const key = getPricingErrorKey(field);
      const msg = key ? pricingShell.querySelector(`[data-pricing-error-for="${key}"]`) : null;
      if (msg) {
        msg.classList.remove("is-visible");
        setTimeout(() => msg.remove(), 200);
      }
    }

    function pricingMarkOk(field) {
      if (!field) return;
      pricingClearError(field);
      field.classList.add("bk-field-ok");
      field.classList.remove("bk-field-error");
    }

    function pricingShakeButton(button) {
      if (!button) return;
      button.classList.add("bk-shake");
      button.addEventListener("animationend", () => button.classList.remove("bk-shake"), { once: true });
    }

    function validatePricingInput(field, type, showEmptyError = false) {
      if (!field) return false;
      const value = field.value.trim();
      if (type === "name") {
        if (!value || value.length < 2) {
          if (showEmptyError || value) pricingShowError(field, "Please enter your name");
          return false;
        }
        pricingMarkOk(field);
        return true;
      }
      if (type === "email") {
        if (!value || !pricingEmailRegex.test(value)) {
          if (showEmptyError || value) pricingShowError(field, "Please enter a valid email");
          return false;
        }
        pricingMarkOk(field);
        return true;
      }
      if (type === "company") {
        if (!value) {
          if (showEmptyError) pricingShowError(field, "Please enter your company name");
          return false;
        }
        pricingMarkOk(field);
        return true;
      }
      return true;
    }

    function validatePricingCheckout(scope, submitButton) {
      if (!scope) return false;
      const nameField = scope.querySelector('input[name="pricing-name"], input[name="pricing-mobile-name"]');
      const emailField = scope.querySelector('input[name="pricing-email"], input[name="pricing-mobile-email"]');
      const companyField = scope.querySelector('input[name="pricing-company"], input[name="pricing-mobile-company"]');
      const consentField = scope.querySelector('input[name="pricing-consent"], input[name="pricing-mobile-consent"]');
      let hasError = false;

      if (!validatePricingInput(nameField, "name", true)) hasError = true;
      if (!validatePricingInput(emailField, "email", true)) hasError = true;
      if (!validatePricingInput(companyField, "company", true)) hasError = true;
      if (!consentField?.checked) {
        pricingShowError(consentField, "Please accept the terms to continue");
        hasError = true;
      } else {
        pricingMarkOk(consentField);
      }

      if (hasError) {
        pricingShakeButton(submitButton);
        const firstInvalid = [nameField, emailField, companyField, consentField].find(
          (field) => field?.classList.contains("bk-field-error"),
        );
        firstInvalid?.focus();
        return false;
      }

      return true;
    }

    function getPricingCheckoutFields() {
      const isMobile = window.innerWidth <= 860;
      return {
        nameField: document.querySelector(
          isMobile ? '[name="pricing-mobile-name"]' : '[name="pricing-name"]',
        ),
        emailField: document.querySelector(
          isMobile ? '[name="pricing-mobile-email"]' : '[name="pricing-email"]',
        ),
        companyField: document.querySelector(
          isMobile ? '[name="pricing-mobile-company"]' : '[name="pricing-company"]',
        ),
        consentField: document.querySelector(
          isMobile ? '[name="pricing-mobile-consent"]' : '[name="pricing-consent"]',
        ),
      };
    }

    function redirectToPricingCheckout(button) {
      const { nameField, emailField, companyField, consentField } = getPricingCheckoutFields();
      const plan = button?.dataset.plan || activePlan?.dataset.pricingPlan || "startup";
      const billing = pricingBilling?.dataset.activeBilling || activeBilling || "weekly";
      const whitelabel = addonButtons.some((btn) => btn.classList.contains("is-active"));
      const nameVal = nameField?.value.trim() || "";
      const emailVal = emailField?.value.trim() || "";
      const companyVal = companyField?.value.trim() || "";
      const params = new URLSearchParams({
        plan,
        billing,
        whitelabel: String(whitelabel),
        name: nameVal,
        email: emailVal,
        company: companyVal,
      });

      sessionStorage.setItem("cw_checkout_name", nameVal);
      sessionStorage.setItem("cw_checkout_company", companyVal);
      sessionStorage.setItem("cw_checkout_email", emailVal);
      sessionStorage.setItem("cw_checkout_plan", plan);
      sessionStorage.setItem("cw_checkout_scroll_y", String(window.scrollY));

      window.location.href = `/checkout?${params.toString()}`;
    }

    pricingShell
      .querySelectorAll(
        '.pricing-checkout-field input, .pricing-mobile-checkout-field input',
      )
      .forEach((field) => {
        field.addEventListener("blur", () => {
          if (!field.value.trim()) return;
          const name = field.getAttribute("name") || "";
          const type = name.includes("email")
            ? "email"
            : name.includes("company")
              ? "company"
              : "name";
          validatePricingInput(field, type);
        });
      });

    pricingShell
      .querySelectorAll('input[name="pricing-consent"], input[name="pricing-mobile-consent"]')
      .forEach((field) => {
        field.addEventListener("change", () => {
          if (field.checked) pricingMarkOk(field);
        });
      });

    // Mobile bottom summary — services-style popup behavior
    const mobileSummary = pricingShell.querySelector(".pricing-mobile-summary");
    const pricingSection = document.getElementById("pricing");
    if (mobileSummary && pricingSection) {
      const mobileSummaryLearn = mobileSummary.querySelector(".pricing-mobile-summary-learn");
      const mobileSummaryClose = mobileSummary.querySelector(".pricing-mobile-summary-close");
      const mobileSummaryProceed = mobileSummary.querySelector(".pricing-mobile-summary-cta");
      const mobileCheckoutBack = mobileSummary.querySelector(".pricing-mobile-checkout-back");
      const mobileSuccessBack = mobileSummary.querySelector(".pricing-mobile-success-back");
      const mobileBackPrice = mobileSummary.querySelector(".pricing-mobile-back-price");
      const mobileSummaryViews = Array.from(mobileSummary.querySelectorAll(".pricing-mobile-summary-view"));
      const mqPricingViewport = window.matchMedia("(max-width: 860px)");
      let pricingMobileActivated = false;
      let pricingMobileShown = false;
      let pricingMobileExpanded = false;
      let pendingPricingExpandAfterScroll = false;
      let pendingPricingExpandTarget = 0;
      let pricingMobileTransitionLockUntil = 0;
      let lastPricingScrollY = window.scrollY;
      let pricingMobileView = "learn";
      let pricingMobileResetTimer = null;
      let pricingMobileCollapsing = false;
      let pricingMobileScrollLocked = false;
      let pricingMobileOverlay = pricingShell.querySelector(".pricing-mobile-section-overlay");

      const isMobilePricingLayout = () => mqPricingViewport.matches;
      const setMobileProceedLabel = (_text) => {};
      const clearPricingMobileResetTimer = () => {
        if (!pricingMobileResetTimer) return;
        clearTimeout(pricingMobileResetTimer);
        pricingMobileResetTimer = null;
      };
      const preventPricingMobileScroll = (event) => {
        event.preventDefault();
      };
      const lockPricingMobileScroll = () => {
        if (pricingMobileScrollLocked) return;
        pricingMobileScrollLocked = true;
        document.addEventListener("wheel", preventPricingMobileScroll, { passive: false });
        document.addEventListener("touchmove", preventPricingMobileScroll, { passive: false });
      };
      const unlockPricingMobileScroll = () => {
        if (!pricingMobileScrollLocked) return;
        pricingMobileScrollLocked = false;
        document.removeEventListener("wheel", preventPricingMobileScroll);
        document.removeEventListener("touchmove", preventPricingMobileScroll);
      };
      const ensurePricingMobileOverlay = () => {
        if (pricingMobileOverlay) return pricingMobileOverlay;
        pricingMobileOverlay = document.createElement("button");
        pricingMobileOverlay.type = "button";
        pricingMobileOverlay.className = "pricing-mobile-section-overlay";
        pricingMobileOverlay.setAttribute("aria-label", "Close pricing popup");
        pricingShell.appendChild(pricingMobileOverlay);
        pricingMobileOverlay.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (pricingShell.classList.contains("is-payment-success")) {
            closeMobileSuccessState();
          } else {
            animateSummaryCollapse();
          }
        });
        return pricingMobileOverlay;
      };
      const showPricingMobileOverlay = () => {
        const overlay = ensurePricingMobileOverlay();
        overlay.classList.remove("is-closing");
        overlay.classList.add("is-visible");
      };
      const hidePricingMobileOverlay = () => {
        if (!pricingMobileOverlay) return;
        pricingMobileOverlay.classList.add("is-closing");
        pricingMobileOverlay.classList.remove("is-visible");
      };
      const resetPricingMobileOverlay = () => {
        if (!pricingMobileOverlay) return;
        pricingMobileOverlay.classList.remove("is-visible", "is-closing");
      };
      const updatePricingMobileSummaryPosition = () => {
        if (!mobileSummary || !pricingSection || !pricingShell) return;

        if (!isMobilePricingLayout()) {
          clearPricingMobileResetTimer();
          unlockPricingMobileScroll();
          resetPricingMobileOverlay();
          mobileSummary.classList.remove("is-visible", "is-docked", "is-expanded");
          mobileSummary.dataset.mobileView = "";
          mobileSummary.setAttribute("aria-hidden", "true");
          mobileSummaryViews.forEach((view) => view.setAttribute("aria-hidden", "true"));
          pricingShell.style.setProperty("--pricing-mobile-summary-space", "0px");
          mobileSummary.style.removeProperty("left");
          mobileSummary.style.removeProperty("width");
          mobileSummary.style.removeProperty("top");
          mobileSummary.style.removeProperty("bottom");
          pricingMobileShown = false;
          pricingMobileActivated = false;
          pricingMobileExpanded = false;
          pricingMobileView = "learn";
          setMobileProceedLabel("Proceed");
          pendingPricingExpandAfterScroll = false;
          lastPricingScrollY = window.scrollY;
          return;
        }

        const currentScrollY = window.scrollY;
        const scrollingDown = currentScrollY > lastPricingScrollY + 1;
        lastPricingScrollY = currentScrollY;

        if (pendingPricingExpandAfterScroll && Math.abs(currentScrollY - pendingPricingExpandTarget) <= 2) {
          pendingPricingExpandAfterScroll = false;
          pricingMobileExpanded = true;
          mobileSummary.dataset.mobileView = pricingMobileView;
          mobileSummary.classList.add("is-expanded");
          lockPricingMobileScroll();
          showPricingMobileOverlay();
          setTimeout(updatePricingMobileSummaryPosition, 880);
          return;
        }

        const sectionRect = pricingSection.getBoundingClientRect();
        const sectionHeight = Math.max(pricingSection.offsetHeight, 1);
        const sectionTop = window.scrollY + sectionRect.top;
        const shellRect = pricingShell.getBoundingClientRect();
        const sectionProgress = ((window.scrollY + window.innerHeight) - sectionTop) / sectionHeight;
        const isAbovePricingSection = sectionRect.top >= window.innerHeight * 0.82;
        const isInPricingViewport = sectionRect.top < window.innerHeight && sectionRect.bottom > 0;

        if (isAbovePricingSection) {
          if (pendingPricingExpandAfterScroll) {
            mobileSummary.classList.remove("is-visible", "is-docked", "is-expanded");
            mobileSummary.setAttribute("aria-hidden", "true");
            mobileSummaryViews.forEach((view) => view.setAttribute("aria-hidden", "true"));
            pricingShell.style.setProperty("--pricing-mobile-summary-space", "0px");
            mobileSummary.style.left = "0px";
            mobileSummary.style.width = `${window.innerWidth}px`;
            mobileSummary.style.top = "auto";
            mobileSummary.style.bottom = "0px";
            return;
          }

          clearPricingMobileResetTimer();
          unlockPricingMobileScroll();
          resetPricingMobileOverlay();
          mobileSummary.classList.remove("is-visible", "is-docked", "is-expanded");
          mobileSummary.setAttribute("aria-hidden", "true");
          mobileSummaryViews.forEach((view) => view.setAttribute("aria-hidden", "true"));
          pricingShell.style.setProperty("--pricing-mobile-summary-space", "0px");
          mobileSummary.style.left = "0px";
          mobileSummary.style.width = `${window.innerWidth}px`;
          mobileSummary.style.top = "auto";
          mobileSummary.style.bottom = "0px";
          pricingMobileShown = false;
          pricingMobileActivated = false;
          pricingMobileExpanded = false;
          pricingMobileView = "learn";
          setMobileProceedLabel("Proceed");
          pendingPricingExpandAfterScroll = false;
          return;
        }

        if (!pricingMobileActivated && scrollingDown && isInPricingViewport && sectionProgress >= 0.6) {
          pricingMobileActivated = true;
        }

        if (
          pricingMobileActivated &&
          !scrollingDown &&
          isInPricingViewport &&
          sectionProgress < 0.6 &&
          Date.now() > pricingMobileTransitionLockUntil
        ) {
          pricingMobileActivated = false;
        }

        if (!pricingMobileActivated) {
          clearPricingMobileResetTimer();
          unlockPricingMobileScroll();
          resetPricingMobileOverlay();
          mobileSummary.classList.remove("is-visible", "is-docked", "is-expanded");
          mobileSummary.setAttribute("aria-hidden", "true");
          mobileSummaryViews.forEach((view) => view.setAttribute("aria-hidden", "true"));
          pricingShell.style.setProperty("--pricing-mobile-summary-space", "0px");
          mobileSummary.style.left = "0px";
          mobileSummary.style.width = `${window.innerWidth}px`;
          mobileSummary.style.top = "auto";
          mobileSummary.style.bottom = "0px";
          pricingMobileShown = false;
          pricingMobileExpanded = false;
          pricingMobileView = "learn";
          setMobileProceedLabel("Proceed");
          pendingPricingExpandAfterScroll = false;
          return;
        }

        const shouldKeepMobileView = pricingMobileExpanded || pricingMobileCollapsing;
        mobileSummary.classList.add("is-visible");
        mobileSummary.classList.toggle("is-expanded", pricingMobileExpanded);
        mobileSummary.dataset.mobileView = shouldKeepMobileView ? pricingMobileView : "";
        mobileSummary.setAttribute("aria-hidden", "false");
        mobileSummaryViews.forEach((view) => {
          const isActiveView = shouldKeepMobileView && view.dataset.pricingMobileView === pricingMobileView;
          view.setAttribute("aria-hidden", String(!isActiveView));
        });
        pricingMobileShown = true;

        if (pricingMobileCollapsing) return;

        const summaryHeight = mobileSummary.offsetHeight;
        const reservedSpace = summaryHeight;
        const bottomOffset = 0;
        const isPastPricingSection = sectionRect.bottom <= 0;
        const shouldDock = isPastPricingSection || shellRect.bottom <= window.innerHeight;

        if (shouldDock) {
          const dockTop = Math.max(0, pricingShell.offsetHeight - summaryHeight);

          mobileSummary.classList.add("is-docked");
          pricingShell.style.setProperty("--pricing-mobile-summary-space", `${reservedSpace}px`);
          mobileSummary.style.left = `${-shellRect.left}px`;
          mobileSummary.style.width = `${window.innerWidth}px`;
          mobileSummary.style.top = `${dockTop}px`;
          mobileSummary.style.bottom = "auto";
        } else {
          mobileSummary.classList.remove("is-docked");
          pricingShell.style.setProperty("--pricing-mobile-summary-space", `${reservedSpace}px`);
          mobileSummary.style.left = "0px";
          mobileSummary.style.width = `${window.innerWidth}px`;
          mobileSummary.style.top = "auto";
          mobileSummary.style.bottom = `${bottomOffset}px`;
        }
      };

      window.addEventListener("scroll", updatePricingMobileSummaryPosition, { passive: true });
      window.addEventListener("resize", updatePricingMobileSummaryPosition);
      mqPricingViewport.addEventListener("change", updatePricingMobileSummaryPosition);

      function animateSummaryExpand(view = "learn") {
        clearPricingMobileResetTimer();
        pricingMobileCollapsing = false;
        mobileSummary.classList.remove("is-switching-to-checkout", "is-learn-proceeding");
        pendingPricingExpandAfterScroll = false;
        pricingMobileView = view;
        const doExpand = () => {
          pricingMobileTransitionLockUntil = Date.now() + 1100;
          pricingMobileActivated = true;
          pricingMobileExpanded = true;
          mobileSummary.dataset.mobileView = pricingMobileView;
          mobileSummary.classList.add("is-expanded");
          updatePricingMobileSummaryPosition();
          lockPricingMobileScroll();
          showPricingMobileOverlay();
          setTimeout(updatePricingMobileSummaryPosition, 880);
        };

        const sectionRect = pricingSection.getBoundingClientRect();
        const sectionTop = window.scrollY + sectionRect.top;
        const sectionBottom = sectionTop + pricingSection.offsetHeight;
        const dockScrollTarget = Math.max(0, sectionBottom - window.innerHeight - 318);
        const isPastSectionEnd = window.scrollY > dockScrollTarget + 1;

        if (isPastSectionEnd) {
          pricingMobileTransitionLockUntil = Date.now() + 1100;
          pricingMobileActivated = true;
          pricingMobileExpanded = false;
          pendingPricingExpandAfterScroll = true;
          pendingPricingExpandTarget = dockScrollTarget;
          mobileSummary.dataset.mobileView = "";
          mobileSummary.classList.remove("is-expanded");
          window.scrollTo({ top: dockScrollTarget, behavior: "smooth" });
        } else {
          doExpand();
        }
      }

      function switchSummaryToCheckout() {
        clearPricingMobileResetTimer();
        const priceStartTop = mobileBackPrice?.getBoundingClientRect().top || 0;
        pricingMobileTransitionLockUntil = Date.now() + 1100;
        pricingMobileActivated = true;
        pricingMobileExpanded = true;
        pricingMobileCollapsing = false;
        pendingPricingExpandAfterScroll = false;
        pricingMobileView = "checkout";
        mobileSummary.classList.remove("is-learn-proceeding");
        mobileSummary.classList.add("is-expanded", "is-switching-to-checkout");
        mobileSummary.dataset.mobileView = "checkout";
        updatePricingMobileSummaryPosition();
        if (mobileBackPrice) {
          const priceEndTop = mobileBackPrice.getBoundingClientRect().top;
          const priceDeltaY = priceStartTop - priceEndTop;
          mobileBackPrice.style.transition = "none";
          mobileBackPrice.style.transform = `translateY(${priceDeltaY}px)`;
          mobileBackPrice.offsetHeight;
          requestAnimationFrame(() => {
            mobileBackPrice.style.transition = "transform 1.1s cubic-bezier(0.16, 1, 0.3, 1), padding 1.1s cubic-bezier(0.16, 1, 0.3, 1)";
            mobileBackPrice.style.transform = "translateY(0)";
          });
        }
        setTimeout(() => {
          mobileSummary.classList.remove("is-switching-to-checkout");
          if (mobileBackPrice) {
            mobileBackPrice.style.removeProperty("transition");
            mobileBackPrice.style.removeProperty("transform");
          }
          updatePricingMobileSummaryPosition();
        }, 1100);
      }

      function animateSummaryCollapse() {
        clearPricingMobileResetTimer();
        pricingMobileTransitionLockUntil = Date.now() + 1080;
        const isClosingCheckout = pricingMobileView === "checkout";
        pricingMobileActivated = true;
        pricingMobileExpanded = false;
        pricingMobileCollapsing = true;
        setMobileProceedLabel("Proceed");
        mobileSummary.dataset.mobileView = pricingMobileView;
        mobileSummary.classList.toggle("is-returning-from-checkout", isClosingCheckout);
        mobileSummary.classList.remove("is-expanded", "is-learn-proceeding");
        hidePricingMobileOverlay();
        pricingMobileResetTimer = setTimeout(() => {
          mobileSummary.dataset.mobileView = "";
          pricingMobileView = "learn";
          pricingMobileResetTimer = null;
          pricingMobileCollapsing = false;
          mobileSummary.classList.remove("is-returning-from-checkout");
          unlockPricingMobileScroll();
          resetPricingMobileOverlay();
          updatePricingMobileSummaryPosition();
        }, 980);
      }

      function closeMobileSuccessState() {
        clearPricingMobileResetTimer();
        pricingMobileTransitionLockUntil = Date.now() + 1200;
        pricingMobileActivated = true;
        pricingMobileExpanded = false;
        pricingMobileCollapsing = true;
        pricingMobileView = "learn";
        pendingPricingExpandAfterScroll = false;
        setMobileProceedLabel("Proceed");
        hidePricingMobileOverlay();
        pricingShell.classList.add("is-mobile-success-closing");
        mobileSummary.dataset.mobileView = "success";
        mobileSummary.classList.remove(
          "is-expanded",
          "is-returning-from-checkout",
          "is-switching-to-checkout",
          "is-learn-proceeding"
        );
        mobileSummary.setAttribute("aria-hidden", "false");
        mobileSummaryViews.forEach((view) => {
          view.setAttribute(
            "aria-hidden",
            view.dataset.pricingMobileView === "success" ? "false" : "true"
          );
        });
        updatePricingMobileSummaryPosition();
        pricingMobileResetTimer = setTimeout(() => {
          pricingShell.classList.remove(
            "is-checkout-open",
            "is-payment-success",
            "is-mobile-success-closing"
          );
          mobileSummary.dataset.mobileView = "";
          pricingMobileCollapsing = false;
          pricingMobileResetTimer = null;
          mobileSummaryViews.forEach((view) => view.setAttribute("aria-hidden", "true"));
          unlockPricingMobileScroll();
          resetPricingMobileOverlay();
          updatePricingMobileSummaryPosition();
        }, 1120);
      }

      function openMobileSuccessState(scrollY) {
        clearPricingMobileResetTimer();
        pricingMobileTransitionLockUntil = Date.now() + 1100;
        pricingMobileActivated = true;
        pricingMobileExpanded = true;
        pricingMobileCollapsing = false;
        pricingMobileView = "success";
        pendingPricingExpandAfterScroll = false;
        mobileSummary.dataset.mobileView = "success";
        mobileSummary.classList.add("is-visible", "is-expanded");
        mobileSummary.classList.remove(
          "is-returning-from-checkout",
          "is-switching-to-checkout",
          "is-learn-proceeding"
        );
        mobileSummary.setAttribute("aria-hidden", "false");
        mobileSummaryViews.forEach((view) => {
          view.setAttribute(
            "aria-hidden",
            view.dataset.pricingMobileView === "success" ? "false" : "true"
          );
        });
        if (Number.isFinite(scrollY)) {
          window.scrollTo({ top: Math.max(0, scrollY), behavior: "auto" });
        }
        lockPricingMobileScroll();
        showPricingMobileOverlay();
        updatePricingMobileSummaryPosition();
      }

      pricingShell.addEventListener("pricing:success-open", (event) => {
        openMobileSuccessState(event.detail?.scrollY);
      });

      if (pricingShell.classList.contains("is-payment-success") && isMobilePricingLayout()) {
        openMobileSuccessState();
      }

      if (mobileSummaryLearn) {
        mobileSummaryLearn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          animateSummaryExpand("learn");
        });
      }

	      if (mobileSummaryProceed) {
	        mobileSummaryProceed.addEventListener("click", (event) => {
	          if (!isMobilePricingLayout()) return;
	          event.preventDefault();
	          event.stopPropagation();
	          if (pricingShell.classList.contains("is-payment-success")) {
	            window.location.href = "/portal";
	            return;
	          }
	          if (Date.now() < pricingMobileTransitionLockUntil) return;
	          if (pricingMobileExpanded && pricingMobileView === "learn") {
            switchSummaryToCheckout();
            setMobileProceedLabel("Subscribe");
          } else if (pricingMobileExpanded && pricingMobileView === "checkout") {
            if (validatePricingCheckout(mobileSummary, mobileSummaryProceed)) {
              redirectToPricingCheckout(mobileSummaryProceed);
            }
          } else {
            animateSummaryExpand("checkout");
            setMobileProceedLabel("Subscribe");
          }
        });
      }

      if (mobileSummaryClose) {
        mobileSummaryClose.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          animateSummaryCollapse();
          setMobileProceedLabel("Proceed");
        });
      }

      if (mobileCheckoutBack) {
        mobileCheckoutBack.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          animateSummaryCollapse();
          setMobileProceedLabel("Proceed");
        });
      }

      if (mobileSuccessBack) {
        mobileSuccessBack.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          closeMobileSuccessState();
        });
      }

      pricingShell.addEventListener("click", (event) => {
        if (
          !isMobilePricingLayout() ||
          !pricingShell.classList.contains("is-payment-success") ||
          !pricingMobileExpanded ||
          mobileSummary.contains(event.target)
        ) {
          return;
        }
        event.preventDefault();
        closeMobileSuccessState();
      });

      updatePricingMobileSummaryPosition();
    }

    // ─── Pricing Checkout Transition ──────────────────────────────────────────
    (function () {
      const desktopPricingQuery = window.matchMedia("(min-width: 861px)");
      let closeTimer = null;
      let desktopCheckoutReady = false;
      let desktopCheckoutReadyTimer = null;

      function setPricingCheckoutOpen(isOpen, sourceButton) {
        if (isOpen) {
          if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
          if (desktopCheckoutReadyTimer) clearTimeout(desktopCheckoutReadyTimer);
          desktopCheckoutReady = false;
          pricingShell.classList.remove("is-checkout-closing", "is-payment-success");
          pricingShell.classList.add("is-checkout-open");
          desktopCheckoutReadyTimer = setTimeout(() => {
            desktopCheckoutReady = true;
            desktopCheckoutReadyTimer = null;
          }, 760);
        } else {
          if (desktopCheckoutReadyTimer) clearTimeout(desktopCheckoutReadyTimer);
          desktopCheckoutReady = false;
          pricingShell.classList.add("is-checkout-closing");
          closeTimer = setTimeout(() => {
            pricingShell.classList.remove("is-checkout-open", "is-checkout-closing", "is-payment-success");
            sourceButton?.focus?.();
            closeTimer = null;
          }, 920);
        }
      }

	      proceedButtons.forEach((btn) => {
	        btn.addEventListener("click", function (event) {
	          event.preventDefault();
	          if (!desktopPricingQuery.matches || !this.closest(".pricing-summary")) return;
	          if (pricingShell.classList.contains("is-payment-success")) {
	            window.location.href = "/portal";
	            return;
	          }
	          if (pricingShell.classList.contains("is-checkout-open")) {
	            if (!desktopCheckoutReady) return;
	            if (validatePricingCheckout(pricingSummary, this)) {
              redirectToPricingCheckout(this);
            }
            return;
          }
          setPricingCheckoutOpen(true, this);
        });
      });

      const pricingMain = pricingShell.querySelector(".pricing-main");
      if (pricingMain) {
        pricingMain.addEventListener("click", function () {
          if (!desktopPricingQuery.matches) return;
          if (!pricingShell.classList.contains("is-checkout-open")) return;
          setPricingCheckoutOpen(false, null);
        });
      }

      desktopPricingQuery.addEventListener("change", function (event) {
        if (!event.matches) setPricingCheckoutOpen(false);
      });

      function clearStalePricingSuccessState() {
        pricingShell.classList.remove(
          "is-checkout-open",
          "is-checkout-closing",
          "is-payment-success",
          "is-mobile-success-closing"
        );
        const staleMobileSummary = pricingShell.querySelector(".pricing-mobile-summary");
        if (staleMobileSummary?.dataset.mobileView === "success") {
          staleMobileSummary.dataset.mobileView = "";
        }
      }

      const urlParams = new URLSearchParams(window.location.search);
      const hasPaymentSuccess = urlParams.get("payment") === "success";

      if (!hasPaymentSuccess) {
        clearStalePricingSuccessState();
      }

      window.addEventListener("pageshow", function (event) {
        if (!event.persisted) return;
        const restoredParams = new URLSearchParams(window.location.search);
        if (restoredParams.get("payment") !== "success") {
          clearStalePricingSuccessState();
        }
      });

      if (hasPaymentSuccess) {
        const cwName = sessionStorage.getItem("cw_checkout_name") || "";
        const cwCompany = sessionStorage.getItem("cw_checkout_company") || "";
        const cwPlan = sessionStorage.getItem("cw_checkout_plan") || "";
        const cwScrollY = Number(sessionStorage.getItem("cw_checkout_scroll_y"));

        sessionStorage.removeItem("cw_checkout_name");
        sessionStorage.removeItem("cw_checkout_company");
        sessionStorage.removeItem("cw_checkout_email");
        sessionStorage.removeItem("cw_checkout_plan");
        sessionStorage.removeItem("cw_checkout_scroll_y");

        const firstName = cwName ? cwName.trim().split(/\s+/)[0] : "";
        const greeting = firstName ? `You've got one now, ${firstName}.` : "You've got one now.";
        const planLine = cwPlan
          ? `${cwPlan.charAt(0).toUpperCase() + cwPlan.slice(1)}`
          : "";
        const projectLine = cwCompany
          ? `${cwCompany} is set up${planLine ? ` on our ${planLine} plan` : ""},`
          : `You're set up${planLine ? ` on our ${planLine} plan` : ""},`;
	        const successBody = document.querySelector(".pricing-success-body");
	        if (successBody) {
	          successBody.textContent = `${greeting} ${projectLine} let's build something great!`;
	        }
	        const mobileSuccessBody = document.querySelector(".pricing-mobile-success-body");
	        if (mobileSuccessBody) {
	          mobileSuccessBody.textContent = `${greeting} ${projectLine} let's build something great!`;
	        }
        const isMobileSuccess = window.innerWidth <= 860;
        if (isMobileSuccess) {
          pricingShell.dispatchEvent(new CustomEvent("pricing:success-open", {
            detail: {
              scrollY: Number.isFinite(cwScrollY) ? cwScrollY : undefined,
            },
          }));
        }

        if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
        if (desktopCheckoutReadyTimer) clearTimeout(desktopCheckoutReadyTimer);
        desktopCheckoutReady = false;
        pricingShell.classList.remove("is-checkout-closing");
        pricingShell.classList.add("is-checkout-open", "is-payment-success");
        window.history.replaceState({}, "", window.location.pathname);
        if (!isMobileSuccess) {
          document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    })();
  }

  // ---------------------------------------------------------
  // 9) Engagement Card — Kanban
  //    Progress tab: 2 non-active rows (top + bottom)
  //    Done tab: 1 active row
  //    Bottom progress row becomes the flying row, old done row fades out,
  //    flying row lands and stays, top progress row slides down, new top
  //    progress row fades in from the left.
  // ---------------------------------------------------------
  const BACKLOG = ["Email template", "Case study", "Style guide", "Wireframes", "Prototype", "Brand assets", "Landing page", "Logo design"];
  const mqProcessViewport = window.matchMedia("(max-width: 860px)");
  const engagementCard = document.querySelectorAll(".process-card")[1];

  if (engagementCard) {
    const flyCard         = engagementCard.querySelector(".process-fly-card");
    const flyTitle        = engagementCard.querySelector(".process-fly-title");
    const inProgressBoard = engagementCard.querySelector(".process-board-muted");
    const doneBoard       = engagementCard.querySelector(".process-board-accent");
    const boardEl         = engagementCard.querySelector(".process-visual-board");
    const REPLACEMENT_FADE_MS = 620;
    const TOP_SLIDE_MS = 860;
    const DONE_FADE_MS = 360;
    const FLY_DURATION_MS = 1950;
    const DONE_FADE_DELAY_MS = 1540;
    const LOOP_DELAY_MS = 120;

    let backlogIndex = 2; // static HTML uses index 0+1, start JS from 2
    let currentAnim  = null;
    let loopTimeout  = null;
    let isHovering   = false;

    function getRows(board) {
      return Array.from(board.querySelectorAll(".process-task-row"));
    }

    // New non-active card — fades in from the left into the top slot
    function makeProgressRow(text) {
      const el = document.createElement("div");
      el.className = "process-task-row";
      el.dataset.task = text;
      el.innerHTML =
        `<span class="process-task-label">${text}</span>` +
        `<span class="process-task-line"></span>` +
        `<span class="process-task-line"></span>`;
      el.style.cssText = `opacity:0;transform:translateX(-22px);transition:opacity ${REPLACEMENT_FADE_MS}ms cubic-bezier(0.22, 1, 0.36, 1),transform ${REPLACEMENT_FADE_MS}ms cubic-bezier(0.22, 1, 0.36, 1);`;
      return el;
    }

    function showRow(el) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.opacity = "1";
        el.style.transform = "translateX(0)";
      }));
    }

    // Insert a new progress row at the top, directly under the board title
    function prependProgressRow(text) {
      const row = makeProgressRow(text);
      const header = inProgressBoard.querySelector("p");
      header ? inProgressBoard.insertBefore(row, header.nextSibling) : inProgressBoard.appendChild(row);
      return row;
    }

    function insertDoneRowAfterHeader(row) {
      const header = doneBoard.querySelector("p");
      header ? doneBoard.insertBefore(row, header.nextSibling) : doneBoard.appendChild(row);
    }

    function runTask() {
      if (currentAnim && currentAnim.playState === "running") return;

      const ipRows = getRows(inProgressBoard);
      if (ipRows.length < 2) return;

      const topRow    = ipRows[0];
      const bottomRow = ipRows[1];
      const taskName  = bottomRow.dataset.task;
      const doneRow = getRows(doneBoard)[0];

      // === MEASURE everything before any DOM/layout changes ===
      const boardRect  = boardEl.getBoundingClientRect();
      const topRect    = topRow.getBoundingClientRect();
      const bottomRect = bottomRow.getBoundingClientRect();
      const doneHeader = doneBoard.querySelector("p");
      const doneRect = doneRow
        ? doneRow.getBoundingClientRect()
        : null;
      const doneHeaderRect = doneHeader
        ? doneHeader.getBoundingClientRect()
        : null;
      const doneStyles = getComputedStyle(doneBoard);
      const donePadLeft = parseFloat(doneStyles.paddingLeft) || 0;
      const donePadTop = parseFloat(doneStyles.paddingTop) || 0;
      const doneHeaderMargin = doneHeader
        ? parseFloat(getComputedStyle(doneHeader).marginBottom) || 0
        : 0;

      const startX = bottomRect.left - boardRect.left;
      const startY = bottomRect.top - boardRect.top;
      const landX  = doneRect
        ? doneRect.left - boardRect.left
        : doneBoard.getBoundingClientRect().left - boardRect.left + donePadLeft;
      const landY  = doneRect
        ? doneRect.top - boardRect.top
        : doneBoard.getBoundingClientRect().top - boardRect.top + donePadTop + (doneHeaderRect ? doneHeaderRect.height + doneHeaderMargin : 0);
      const deltaX = landX - startX;
      const deltaY = landY - startY;
      const arcMidX = deltaX * 0.5;
      const arcMidY = deltaY * 0.5 - Math.abs(deltaX) * 0.32;

      // === REAL FLYING CARD ===
      // Move the actual bottom progress row into overlay space so the same DOM card flies and stays.
      bottomRow.classList.add("process-task-row--done");
      bottomRow.style.position = "absolute";
      bottomRow.style.left = `${startX}px`;
      bottomRow.style.top = `${startY}px`;
      bottomRow.style.width = `${bottomRect.width}px`;
      bottomRow.style.height = `${bottomRect.height}px`;
      bottomRow.style.margin = "0";
      bottomRow.style.zIndex = "12";
      bottomRow.style.pointerEvents = "none";
      bottomRow.style.opacity = "1";
      boardEl.appendChild(bottomRow);

      // === PROGRESS TAB ===
      // Insert new top row first, then FLIP the existing top row so it slides smoothly down.
      const newTopRow = prependProgressRow(BACKLOG[backlogIndex % BACKLOG.length]);
      backlogIndex++;
      const topNewRect = topRow.getBoundingClientRect();
      const deltaTopY = topRect.top - topNewRect.top;
      topRow.style.transition = "none";
      topRow.style.transform = `translateY(${deltaTopY}px)`;
      topRow.offsetHeight;
      topRow.style.transition = `transform ${TOP_SLIDE_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`;
      topRow.style.transform = "translateY(0)";
      showRow(newTopRow);

      // === DONE TAB ===
      // Old active done row fades out just before the flying row arrives.
      if (doneRow) {
        setTimeout(() => {
          doneRow.style.transition = `opacity ${DONE_FADE_MS}ms ease`;
          doneRow.style.opacity = "0";
          setTimeout(() => doneRow.remove(), DONE_FADE_MS);
        }, DONE_FADE_DELAY_MS);
      }

      // === FLYING CARD ===
      currentAnim = bottomRow.animate([
        { transform: "translate(0px,0px) rotate(0deg) scale(1)", offset: 0 },
        { transform: `translate(${arcMidX}px,${arcMidY}px) rotate(-4deg) scale(1.03)`, offset: 0.5 },
        { transform: `translate(${deltaX}px,${deltaY}px) rotate(0deg) scale(1)`, offset: 1 },
      ], { duration: FLY_DURATION_MS, easing: "cubic-bezier(0.16, 0.92, 0.24, 1)", fill: "forwards" });

      currentAnim.onfinish = () => {
        bottomRow.getAnimations().forEach((animation) => animation.cancel());
        bottomRow.style.position = "";
        bottomRow.style.left = "";
        bottomRow.style.top = "";
        bottomRow.style.width = "";
        bottomRow.style.height = "";
        bottomRow.style.margin = "";
        bottomRow.style.zIndex = "";
        bottomRow.style.pointerEvents = "";
        bottomRow.style.transition = "";
        bottomRow.style.transform = "";
        bottomRow.style.opacity = "1";
        insertDoneRowAfterHeader(bottomRow);

        topRow.style.transition = "";
        if (isHovering) loopTimeout = setTimeout(runTask, LOOP_DELAY_MS);
      };
    }

    function startEngagementLoop() {
      isHovering = true;
      clearTimeout(loopTimeout);
      runTask();
    }

    function stopEngagementLoop() {
      isHovering = false;
      clearTimeout(loopTimeout);
    }

    engagementCard.addEventListener("mouseenter", () => {
      if (mqProcessViewport.matches) return;
      startEngagementLoop();
    });

    engagementCard.addEventListener("mouseleave", () => {
      if (mqProcessViewport.matches) return;
      stopEngagementLoop();
    });

    const engagementObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!mqProcessViewport.matches) return;
        if (entry.isIntersecting) startEngagementLoop();
        else stopEngagementLoop();
      });
    }, { threshold: 0.45 });

    engagementObserver.observe(engagementCard);
    mqProcessViewport.addEventListener("change", () => {
      stopEngagementLoop();
    });
  }

  // ---------------------------------------------------------
  // 10) Steady Updates Card — stacked website pages
  //     Front page fades out, the stack rises, and the page
  //     resets to the back for a continuous loop.
  // ---------------------------------------------------------
  const updatesCard = document.querySelectorAll(".process-card")[2];

  if (updatesCard) {
    const pageEls = Array.from(updatesCard.querySelectorAll(".process-site-page"));
    const POS_CLASSES = ["page-pos-0", "page-pos-1", "page-pos-2", "page-pos-3"];
    const FADE_MS = 520;
    const BETWEEN_LOOPS_MS = 320;
    let pageOrder = pageEls.map((_, index) => index);
    let pageLoopTimer = null;
    let pageResetTimer = null;
    let isUpdatesHovering = false;
    let isCyclingPages = false;

    function applyPageOrder(order, options = {}) {
      const { skipIndex = null, instantIndex = null } = options;

      order.forEach((pageIndex, pos) => {
        const page = pageEls[pageIndex];
        page.classList.remove(...POS_CLASSES);

        if (pageIndex === skipIndex) return;
        if (pageIndex === instantIndex) page.classList.add("is-instant");
        page.classList.add(POS_CLASSES[pos]);
      });
    }

    applyPageOrder(pageOrder);

    function cyclePages() {
      if (isCyclingPages || pageEls.length < 4) return;
      isCyclingPages = true;

      const leavingIndex = pageOrder[0];
      const leavingPage = pageEls[leavingIndex];
      const nextOrder = pageOrder.slice(1).concat(leavingIndex);

      leavingPage.classList.add("is-leaving");
      applyPageOrder(nextOrder, { skipIndex: leavingIndex });

      pageResetTimer = setTimeout(() => {
        pageOrder = nextOrder;
        leavingPage.classList.remove("is-leaving");
        applyPageOrder(pageOrder, { instantIndex: leavingIndex });

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            leavingPage.classList.remove("is-instant");
          });
        });

        isCyclingPages = false;

        if (isUpdatesHovering) {
          pageLoopTimer = setTimeout(cyclePages, BETWEEN_LOOPS_MS);
        }
      }, FADE_MS + 60);
    }

    function startUpdatesLoop() {
      isUpdatesHovering = true;
      clearTimeout(pageLoopTimer);
      cyclePages();
    }

    function stopUpdatesLoop() {
      isUpdatesHovering = false;
      clearTimeout(pageLoopTimer);
    }

    updatesCard.addEventListener("mouseenter", () => {
      if (mqProcessViewport.matches) return;
      startUpdatesLoop();
    });

    updatesCard.addEventListener("mouseleave", () => {
      if (mqProcessViewport.matches) return;
      stopUpdatesLoop();
    });

    const updatesObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!mqProcessViewport.matches) return;
        if (entry.isIntersecting) startUpdatesLoop();
        else stopUpdatesLoop();
      });
    }, { threshold: 0.45 });

    updatesObserver.observe(updatesCard);
    mqProcessViewport.addEventListener("change", () => {
      stopUpdatesLoop();
    });
  }

  // ---------------------------------------------------------
  // 11) CTA Card — x-axis "now" slider + floating arrow
  // ---------------------------------------------------------
  const ctaCard = document.querySelector(".process-card-cta");

  if (ctaCard) {
    const ctaHoverText = ctaCard.querySelector(".process-cta-title-hover");
    const MIN_O_COUNT = 1;
    const MAX_O_COUNT = 8;

    function setCtaNow(progress) {
      if (!ctaHoverText) return;
      const clamped = Math.max(0, Math.min(1, progress));
      const oCount = MIN_O_COUNT + Math.round(clamped * (MAX_O_COUNT - MIN_O_COUNT));
      ctaHoverText.textContent = `n${"o".repeat(oCount)}w!`;
    }

    ctaCard.addEventListener("mouseenter", () => {
      setCtaNow(0);
    });

    ctaCard.addEventListener("mousemove", (event) => {
      const rect = ctaCard.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      const xProgress = Math.max(0, Math.min(1, localX / rect.width));

      ctaCard.style.setProperty("--cta-arrow-left", `${localX}px`);
      ctaCard.style.setProperty("--cta-arrow-top", `${localY}px`);
      ctaCard.style.setProperty("--cta-arrow-x", "0px");
      ctaCard.style.setProperty("--cta-arrow-y", "0px");
      setCtaNow(xProgress);
    });

    ctaCard.addEventListener("mouseleave", () => {
      ctaCard.style.setProperty("--cta-arrow-x", "0px");
      ctaCard.style.setProperty("--cta-arrow-y", "0px");
      ctaCard.style.setProperty("--cta-arrow-left", "0px");
      ctaCard.style.setProperty("--cta-arrow-top", "0px");
      if (ctaHoverText) ctaHoverText.textContent = "now!";
    });
  }

  // ---------------------------------------------------------
  // 12) Services Accordion
  // ---------------------------------------------------------
  const serviceCategories = Array.from(document.querySelectorAll("[data-services-category]"));

  if (serviceCategories.length > 0) {
    const servicesSection = document.querySelector("#services");
    const servicesGrid = document.querySelector(".services-grid");
    const servicesList = document.querySelector(".services-list");
    const servicePills = Array.from(document.querySelectorAll(".services-request-pill"));
    const servicesDropzone = document.querySelector(".services-dropzone");
    const servicesDropSelectedList = document.querySelector(".services-drop-selected-list");
    const servicesDropListTrack = document.querySelector(".services-drop-list-track");
    const servicesDropPlanCopy = document.querySelector(".services-drop-plan-copy");
    const servicesDropStack = document.querySelector(".services-drop-stack");
    const servicesTools = document.querySelector(".services-tools");
    const servicesMobileTabs = Array.from(document.querySelectorAll("[data-services-mobile-tab]"));
    const servicesDisciplineButtons = Array.from(document.querySelectorAll("[data-services-discipline]"));
    const servicesTechPills = document.querySelector("[data-services-tech-pills]");
    const servicesMobileCompare = document.querySelector(".services-mobile-compare");
    const servicesMobileComparePromptText = document.querySelector(".services-mobile-compare-prompt-text");
    const servicesMobileCompareCopy = document.querySelector(".services-mobile-compare-copy");
    const servicesMobilePlanSlider = document.querySelector(".services-mobile-plan-slider");
    const servicesMobilePlans = Array.from(document.querySelectorAll("[data-services-mobile-plan]"));
    let dropStackTimer;
    let draggedServiceLabel = "";
    let draggedServicePill = null;
    let activeDragGhost = null;
    let activeDroppedServices = [];
    let mobileCompareUpdateFrame = 0;
    let mobilePlanUpdateFrame = 0;
    let mobileCompareShown = false;
    let mobileCompareActivated = false;
    let lastMobileCompareScrollY = window.scrollY;
    const SERVICES_TECH_MAP = {
      design: ["Figma", "Photoshop", "Illustrator", "Webflow", "WordPress"],
      development: ["HTML", "CSS", "PHP", "Laravel", "Python", "Javascript", "TypeScript", "Node.js", "Nuxt.js", "Next.js", "React.js", "Express.js", "React Native", "TailwindCSS", "Vue"],
      integration: ["Stripe", "Paypal", "AWS", "Amazon", "MongoDB", "Postgres", "MySQL", "Redis", "SQLite", "Sendgrid", "DigitalOcean", "Firebase", "Nexgen", "Any other API"],
    };

    // Shared tooltip for selected service info buttons
    const serviceInfoTooltip = document.createElement("div");
    serviceInfoTooltip.className = "services-drop-tooltip";
    serviceInfoTooltip.innerHTML =
      `<p class="services-drop-tooltip-desc"></p>` +
      `<p class="services-drop-tooltip-note">It's an example. Services are tailored to each client's needs.</p>`;
    document.body.appendChild(serviceInfoTooltip);

    let _tooltipActiveBtn = null;

    function showServiceInfoTooltip(btn) {
      const desc = btn.dataset.tooltipDesc || btn.dataset.tooltip || "";
      if (!desc) return;
      serviceInfoTooltip.querySelector(".services-drop-tooltip-desc").textContent = desc;
      serviceInfoTooltip.classList.add("is-visible");
      _tooltipActiveBtn = btn;
      positionServiceInfoTooltip(btn);
    }

    function isMobileServiceHintTap(event, pill) {
      if (!isMobileServicesLayout()) return false;
      const rect = pill.getBoundingClientRect();
      return event.clientX >= rect.right - 72;
    }

    function positionServiceInfoTooltip(btn) {
      const rect = btn.getBoundingClientRect();
      const tW = serviceInfoTooltip.offsetWidth || 440;
      let left = rect.right - tW;
      if (left < 8) left = 8;
      if (left + tW > window.innerWidth - 8) left = window.innerWidth - 8 - tW;
      serviceInfoTooltip.style.left = `${left}px`;
      serviceInfoTooltip.style.top = "auto";
      serviceInfoTooltip.style.bottom = `${window.innerHeight - rect.top + 10}px`;
    }

    function hideServiceInfoTooltip() {
      serviceInfoTooltip.classList.remove("is-visible");
      _tooltipActiveBtn = null;
    }

    serviceInfoTooltip.addEventListener("mouseleave", () => hideServiceInfoTooltip());

    document.addEventListener("click", (e) => {
      const activeContainsTarget = _tooltipActiveBtn && _tooltipActiveBtn.contains(e.target);
      if (!serviceInfoTooltip.contains(e.target) && !activeContainsTarget) {
        hideServiceInfoTooltip();
      }
    });

    // Sync count badges
    function syncServiceCounts() {
      serviceCategories.forEach((cat) => {
        const countEl = cat.querySelector(".services-item-count");
        const pills    = cat.querySelectorAll(".services-request-pill");
        if (countEl) countEl.textContent = String(pills.length);
      });
    }

    function getCategoryServiceCount(cat) {
      return cat.querySelectorAll(".services-request-pill").length;
    }

    function isCategoryEmpty(cat) {
      return getCategoryServiceCount(cat) === 0;
    }

    function findNextAvailableCategory(fromCategory) {
      const currentIndex = serviceCategories.indexOf(fromCategory);
      if (currentIndex === -1) return null;

      for (let i = currentIndex + 1; i < serviceCategories.length; i += 1) {
        if (!isCategoryEmpty(serviceCategories[i])) return serviceCategories[i];
      }

      for (let i = 0; i < currentIndex; i += 1) {
        if (!isCategoryEmpty(serviceCategories[i])) return serviceCategories[i];
      }

      return null;
    }

    function updateCategoryAvailability() {
      serviceCategories.forEach((cat) => {
        const isEmpty = isCategoryEmpty(cat);
        const bar = cat.querySelector(".services-item-bar");
        const panel = cat.querySelector(".services-item-panel");
        const categoryIndex = serviceCategories.indexOf(cat);
        const mobileTab = servicesMobileTabs[categoryIndex];

        cat.classList.toggle("services-item-empty", isEmpty);

        if (bar) {
          bar.setAttribute("aria-disabled", String(isEmpty));
        }

        if (mobileTab) {
          mobileTab.disabled = isEmpty;
          mobileTab.classList.toggle("services-mobile-tab-empty", isEmpty);
        }

        if (isEmpty) {
          cat.classList.remove("services-item-active");
          if (bar) bar.setAttribute("aria-expanded", "false");
          if (panel) panel.setAttribute("aria-hidden", "true");
          cat.style.setProperty("--services-panel-height", "0px");
        }
      });
    }

    function getSelectedCountForCategory(category) {
      return activeDroppedServices.filter((entry) => {
        const sourceCategory =
          entry.parent?.closest?.("[data-services-category]") ||
          entry.pill?.closest?.("[data-services-category]") ||
          null;
        return sourceCategory === category;
      }).length;
    }

    function updateMobileTabCounts() {
      servicesMobileTabs.forEach((tab, index) => {
        const category = serviceCategories[index];
        const badge = tab.querySelector(".services-mobile-tab-badge");
        if (!category || !badge) return;

        const selectedCount = getSelectedCountForCategory(category);
        badge.textContent = String(selectedCount);
        tab.classList.toggle("services-mobile-tab-has-count", selectedCount > 0);
      });
    }

    // Calculate how tall the open panel should be, then set CSS vars on all panels
    function isMobileServicesLayout() {
      return window.innerWidth <= 860;
    }

    function scheduleMobileComparePosition() {
      if (mobileCompareUpdateFrame) return;
      mobileCompareUpdateFrame = requestAnimationFrame(() => {
        mobileCompareUpdateFrame = 0;
        updateMobileComparePosition();
      });
    }

    function updateMobilePlanSliderState() {
      if (!servicesMobilePlanSlider || servicesMobilePlans.length === 0) return;

      const sliderRect = servicesMobilePlanSlider.getBoundingClientRect();
      const sliderCenter = sliderRect.left + sliderRect.width / 2;

      let activeIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      servicesMobilePlans.forEach((plan, index) => {
        const rect = plan.getBoundingClientRect();
        const planCenter = rect.left + rect.width / 2;
        const distance = Math.abs(planCenter - sliderCenter);
        if (distance < bestDistance) {
          bestDistance = distance;
          activeIndex = index;
        }
      });

      servicesMobilePlans.forEach((plan, index) => {
        plan.classList.toggle("services-mobile-plan-active", index === activeIndex);
        plan.classList.toggle("services-mobile-plan-prev", index === activeIndex - 1);
        plan.classList.toggle("services-mobile-plan-next", index === activeIndex + 1);
      });
    }

    function scheduleMobilePlanSliderState() {
      if (mobilePlanUpdateFrame) return;
      mobilePlanUpdateFrame = requestAnimationFrame(() => {
        mobilePlanUpdateFrame = 0;
        updateMobilePlanSliderState();
      });
    }

    function layoutAccordion(activeCategory) {
      if (!servicesList) return;

      if (isMobileServicesLayout()) {
        const mobileTabsEl = document.querySelector(".services-mobile-tabs");
        const listStyles = window.getComputedStyle(servicesList);
        const tabsStyles = mobileTabsEl ? window.getComputedStyle(mobileTabsEl) : null;
        const listPaddingTop = parseFloat(listStyles.paddingTop) || 0;
        const listPaddingBottom = parseFloat(listStyles.paddingBottom) || 0;
        const tabsHeight = mobileTabsEl ? mobileTabsEl.offsetHeight : 0;
        const tabsMarginBottom = tabsStyles ? (parseFloat(tabsStyles.marginBottom) || 0) : 0;
        let maxContentHeight = 0;

        serviceCategories.forEach((cat) => {
          const scroller = cat.querySelector(".services-panel-scroller");
          const contentHeight = scroller ? scroller.scrollHeight : 0;
          maxContentHeight = Math.max(maxContentHeight, contentHeight);
        });

        serviceCategories.forEach((cat) => {
          const isOpen = cat === activeCategory;
          const scroller = cat.querySelector(".services-panel-scroller");
          const contentHeight = scroller ? scroller.scrollHeight : 0;
          cat.style.setProperty("--services-panel-height", isOpen ? `${contentHeight}px` : "0px");
        });

        const stableMobileListHeight =
          listPaddingTop + tabsHeight + tabsMarginBottom + maxContentHeight + listPaddingBottom;
        servicesList.style.minHeight = `${Math.ceil(stableMobileListHeight)}px`;
        return;
      }

      servicesList.style.removeProperty("min-height");

      const totalHeaderH = serviceCategories.reduce((sum, cat) => {
        const bar = cat.querySelector(".services-item-bar");
        return sum + (bar ? bar.offsetHeight : 0);
      }, 0);

      const panelH  = Math.max(0, servicesList.clientHeight - totalHeaderH);

      serviceCategories.forEach((cat) => {
        const isOpen = cat === activeCategory;
        cat.style.setProperty("--services-panel-height", isOpen ? `${panelH}px` : "0px");
      });
    }

    function animateCategoryShift(previousTops) {
      if (isMobileServicesLayout()) return;

      serviceCategories.forEach((cat) => {
        const previousTop = previousTops.get(cat);
        if (typeof previousTop !== "number") return;

        const nextTop = cat.getBoundingClientRect().top;
        const deltaY = previousTop - nextTop;

        if (Math.abs(deltaY) < 1) return;

        cat.animate(
          [
            { transform: `translateY(${deltaY}px)` },
            { transform: "translateY(0)" },
          ],
          {
            duration: 620,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          },
        );
      });
    }

    // Open a category: update classes + aria, then let CSS transition do the work
    function openCategory(target) {
      if (!target || isCategoryEmpty(target)) return;
      if (target.classList.contains("services-item-active")) return;

      const previousTops = new Map(
        serviceCategories.map((cat) => [cat, cat.getBoundingClientRect().top]),
      );

      serviceCategories.forEach((cat) => {
        const isActive = cat === target;
        const bar   = cat.querySelector(".services-item-bar");
        const panel = cat.querySelector(".services-item-panel");
        const scroller = cat.querySelector(".services-panel-scroller");
        const categoryIndex = serviceCategories.indexOf(cat);
        const mobileTab = servicesMobileTabs[categoryIndex];

        cat.classList.toggle("services-item-active", isActive);
        if (bar)   bar.setAttribute("aria-expanded", String(isActive));
        if (panel) panel.setAttribute("aria-hidden",  String(!isActive));
        if (mobileTab) mobileTab.classList.toggle("services-mobile-tab-active", isActive);

        // Reset scroll position when closing so it's fresh on next open
        if (!isActive && scroller) scroller.scrollTop = 0;
      });

      layoutAccordion(target);
      updateScrollbar(target);
      scheduleMobileComparePosition();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => animateCategoryShift(previousTops));
      });
    }

    function openCategoryMobile(target) {
      if (!target || isCategoryEmpty(target)) return;
      if (target.classList.contains("services-item-active")) return;

      const currentActive = serviceCategories.find((cat) => cat.classList.contains("services-item-active"));
      const currentIndex = serviceCategories.indexOf(currentActive);
      const targetIndex = serviceCategories.indexOf(target);
      const goingRight = targetIndex > currentIndex;
      const exitX = goingRight ? "-48px" : "48px";
      const enterX = goingRight ? "48px" : "-48px";
      const EXIT_DURATION = 160;
      const ENTER_DURATION = 260;
      const STAGGER = 30;

      // Cancel any in-progress animations from rapid tapping
      serviceCategories.forEach((cat) => {
        cat.querySelectorAll(".services-request-pill").forEach((p) => {
          p.getAnimations().forEach((a) => a.cancel());
        });
      });

      function doSwitch() {
        serviceCategories.forEach((cat) => {
          const isActive = cat === target;
          const bar = cat.querySelector(".services-item-bar");
          const panel = cat.querySelector(".services-item-panel");
          const catIndex = serviceCategories.indexOf(cat);
          const mobileTab = servicesMobileTabs[catIndex];

          cat.classList.toggle("services-item-active", isActive);
          if (bar) bar.setAttribute("aria-expanded", String(isActive));
          if (panel) panel.setAttribute("aria-hidden", String(!isActive));
          if (mobileTab) mobileTab.classList.toggle("services-mobile-tab-active", isActive);

          const scroller = cat.querySelector(".services-panel-scroller");
          if (!isActive && scroller) scroller.scrollTop = 0;
        });

        layoutAccordion(target);
        updateScrollbar(target);
        updateMobileTabCounts();
        scheduleMobileComparePosition();

        // Slide new pills in with stagger
        requestAnimationFrame(() => {
          const newPills = Array.from(target.querySelectorAll(".services-request-pill"));
          newPills.forEach((pill, i) => {
            pill.animate(
              [
                { opacity: 0, transform: `translateX(${enterX})` },
                { opacity: 1, transform: "translateX(0)" },
              ],
              {
                duration: ENTER_DURATION,
                delay: i * STAGGER,
                easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                fill: "both",
              }
            );
          });
        });
      }

      if (!currentActive) {
        doSwitch();
        return;
      }

      const currentPills = Array.from(currentActive.querySelectorAll(".services-request-pill"));
      if (currentPills.length === 0) {
        doSwitch();
        return;
      }

      // Slide current pills out with stagger, then switch
      currentPills.forEach((pill, i) => {
        const anim = pill.animate(
          [
            { opacity: 1, transform: "translateX(0)" },
            { opacity: 0, transform: `translateX(${exitX})` },
          ],
          {
            duration: EXIT_DURATION,
            delay: i * STAGGER,
            easing: "cubic-bezier(0.4, 0, 1, 1)",
            fill: "forwards",
          }
        );
        if (i === currentPills.length - 1) {
          anim.onfinish = () => {
            doSwitch();
            // Cancel fill-forwarded exit animations now that panel is hidden
            currentPills.forEach((p) => p.getAnimations().forEach((a) => a.cancel()));
          };
        }
      });
    }

    // Scrollbar thumb — tracks scroll position inside the active panel
    function updateScrollbar(activeCategory) {
      serviceCategories.forEach((cat) => {
        const scroller   = cat.querySelector(".services-panel-scroller");
        const thumbWrap  = cat.querySelector(".services-scrollbar");
        const thumb      = thumbWrap?.querySelector("span");
        if (!scroller || !thumb) return;

        // Remove old listener to avoid stacking
        if (scroller._scrollHandler) {
          scroller.removeEventListener("scroll", scroller._scrollHandler);
        }

        if (cat !== activeCategory) return;

        function moveThumb() {
          const { scrollTop, scrollHeight, clientHeight } = scroller;
          const trackH   = thumbWrap.clientHeight;
          const thumbH   = thumb.offsetHeight;
          const maxScroll = scrollHeight - clientHeight;
          const maxTravel = trackH - thumbH;
          const ratio     = maxScroll > 0 ? scrollTop / maxScroll : 0;
          thumb.style.top = `${ratio * maxTravel}px`;
        }

        scroller._scrollHandler = moveThumb;
        scroller.addEventListener("scroll", moveThumb, { passive: true });
        moveThumb(); // set initial position
      });
    }

    // Initial setup
    syncServiceCounts();
    updateMobileTabCounts();
    updateMobileCompareState();
    const initialActive = serviceCategories.find((cat) => cat.classList.contains("services-item-active"));
    layoutAccordion(initialActive);
    updateScrollbar(initialActive);
    scheduleMobilePlanSliderState();

    function renderServicesTech(discipline) {
      if (!servicesTechPills) return;

      const techList = SERVICES_TECH_MAP[discipline] || [];
      servicesTechPills.innerHTML = techList
        .map((item) => `<span class="services-tech-pill">${item}</span>`)
        .join("");

      if (servicesTools) {
        const rows = techList.length > 8 ? 2 : 1;
        servicesTools.style.minHeight = rows > 1 ? "164px" : "126px";
        servicesTechPills.style.minHeight = rows > 1 ? "132px" : "84px";
      }
    }

    renderServicesTech("design");

    // Click handlers
    serviceCategories.forEach((cat) => {
      const bar = cat.querySelector(".services-item-bar");
      if (!bar) return;
      bar.addEventListener("click", () => openCategory(cat));
    });

    servicesMobileTabs.forEach((tab, index) => {
      const targetCategory = serviceCategories[index];
      if (!targetCategory) return;

      tab.addEventListener("click", () => {
        if (isMobileServicesLayout()) {
          openCategoryMobile(targetCategory);
        } else {
          openCategory(targetCategory);
        }
      });
    });

    servicesDisciplineButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const discipline = button.getAttribute("data-services-discipline");
        if (!discipline) return;

        servicesDisciplineButtons.forEach((pill) => {
          pill.classList.toggle("services-filter-pill-active", pill === button);
        });

        renderServicesTech(discipline);
      });
    });

    servicePills.forEach((pill) => {
      pill.setAttribute("draggable", isMobileServicesLayout() ? "false" : "true");

      pill.addEventListener("dragstart", (event) => {
        if (isMobileServicesLayout()) return;
        hideServiceInfoTooltip();
        draggedServiceLabel = pill.querySelector("span")?.textContent?.trim() || "";
        draggedServicePill = pill;
        pill.classList.add("services-request-pill-dragging");
        if (servicesDropzone && activeDroppedServices.length > 0) {
          servicesDropzone.classList.add("services-dropzone-active");
        }
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "copy";
          event.dataTransfer.setData("text/plain", draggedServiceLabel);

          const ghost = document.createElement("div");
          ghost.className = "services-drag-ghost";
          ghost.textContent = draggedServiceLabel;
          document.body.appendChild(ghost);
          activeDragGhost = ghost;
          event.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
        }
      });

      pill.addEventListener("dragend", () => {
        if (isMobileServicesLayout()) return;
        pill.classList.remove("services-request-pill-dragging");
        if (servicesDropzone) {
          servicesDropzone.classList.remove("services-dropzone-active");
        }
        if (activeDragGhost) {
          activeDragGhost.remove();
          activeDragGhost = null;
        }
        draggedServicePill = null;
      });

      pill.addEventListener("click", (event) => {
        if (isMobileServiceHintTap(event, pill)) {
          event.stopPropagation();
          if (_tooltipActiveBtn === pill && serviceInfoTooltip.classList.contains("is-visible")) {
            hideServiceInfoTooltip();
          } else {
            showServiceInfoTooltip(pill);
          }
          return;
        }

        if (!event.target.closest(".services-request-plus")) return;

        hideServiceInfoTooltip();
        const label = pill.querySelector("span")?.textContent?.trim() || "";
        const existingEntry = activeDroppedServices.find((service) => service.pill === pill);

        if (existingEntry) {
          removeDroppedService(pill, existingEntry.itemEl);
          return;
        }

        draggedServiceLabel = label;
        draggedServicePill = pill;
        addDroppedService(label);
        draggedServicePill = null;
      });
    });

    function refreshServicesLayout() {
      syncServiceCounts();
      updateCategoryAvailability();
      updateMobileTabCounts();
      let active = serviceCategories.find((cat) => cat.classList.contains("services-item-active"));

      if (!active || isCategoryEmpty(active)) {
        active = serviceCategories.find((cat) => !isCategoryEmpty(cat)) || null;
        serviceCategories.forEach((cat) => {
          const isActive = cat === active;
          const bar = cat.querySelector(".services-item-bar");
          const panel = cat.querySelector(".services-item-panel");
          cat.classList.toggle("services-item-active", isActive);
          if (bar) bar.setAttribute("aria-expanded", String(isActive));
          if (panel) panel.setAttribute("aria-hidden", String(!isActive));
        });
      }

      layoutAccordion(active);
      updateScrollbar(active);
    }

    function _roundUpWeek(x) {
      return Math.max(1, Math.ceil(x));
    }

    function _subscriptionLabel(weeks) {
      const roundedWeeks = _roundUpWeek(weeks);
      const unit = roundedWeeks === 1 ? "wk." : "wks.";
      return `~${roundedWeeks} ${unit} of subscription`;
    }

    function _calcPlanWeeks() {
      const totalHours = activeDroppedServices.reduce((sum, entry) => {
        return sum + (parseInt(entry.pill.dataset.hours, 10) || 0);
      }, 0);
      const buffered = totalHours * 1.2;
      const startupRaw = buffered / 40;
      return {
        startup: _roundUpWeek(startupRaw),
        business: _roundUpWeek(startupRaw / 2),
        enterprise: _roundUpWeek(startupRaw / 3),
      };
    }

    function updateDropzonePlanCopy() {
      if (!servicesDropPlanCopy) return;
      const count = activeDroppedServices.length;
      const word = count === 1 ? "That" : "Those";
      const noun = count === 1 ? "service" : "services";
      servicesDropPlanCopy.textContent = `${word} ${count} ${noun} can be provided on a:`;

      const weeks = _calcPlanWeeks();
      document.querySelectorAll("[data-services-drop-plan]").forEach((planEl) => {
        const type = planEl.dataset.servicesDropPlan;
        const meta = planEl.querySelector(".services-drop-plan-meta");
        if (meta && weeks[type] !== undefined) {
          meta.textContent = _subscriptionLabel(weeks[type]);
        }
      });
    }

    function updateMobileCompareState() {
      if (!servicesMobileCompare) return;

      const count = activeDroppedServices.length;
      const hasSelection = count > 0;
      const word = count === 1 ? "That" : "Those";
      const noun = count === 1 ? "service" : "services";
      const weeks = _calcPlanWeeks();

      servicesMobileCompare.classList.toggle("services-mobile-compare-has-selection", hasSelection);
      servicesMobileCompare.classList.toggle("services-mobile-compare-empty", !hasSelection);

      if (servicesMobileComparePromptText) {
        servicesMobileComparePromptText.textContent = hasSelection
          ? "You can pick more to fulfill 1 mo.!"
          : "Pick services you want to receive";
      }

      if (servicesMobileCompareCopy) {
        servicesMobileCompareCopy.textContent = `${word} ${count || 1} ${noun} can be provided on a:`;
      }

      servicesMobilePlans.forEach((plan) => {
        const planType = plan.getAttribute("data-services-mobile-plan");
        const meta = plan.querySelector("[data-services-mobile-plan-meta]");
        if (!planType || !meta) return;
        meta.textContent = _subscriptionLabel(weeks[planType] ?? 1);
      });

      scheduleMobilePlanSliderState();
      scheduleMobileComparePosition();
    }

    function updateMobileComparePosition() {
      if (!servicesMobileCompare || !servicesSection || !servicesGrid || !servicesList) return;

      if (!isMobileServicesLayout()) {
        servicesMobileCompare.classList.remove("services-mobile-compare-visible", "services-mobile-compare-docked");
        servicesMobileCompare.setAttribute("aria-hidden", "true");
        servicesGrid.style.setProperty("--services-mobile-compare-space", "0px");
        servicesMobileCompare.style.removeProperty("left");
        servicesMobileCompare.style.removeProperty("width");
        servicesMobileCompare.style.removeProperty("top");
        servicesMobileCompare.style.removeProperty("bottom");
        mobileCompareShown = false;
        mobileCompareActivated = false;
        lastMobileCompareScrollY = window.scrollY;
        return;
      }

      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastMobileCompareScrollY + 1;
      lastMobileCompareScrollY = currentScrollY;

      const sectionRect = servicesSection.getBoundingClientRect();
      const sectionTop = window.scrollY + sectionRect.top;
      const sectionHeight = Math.max(servicesSection.offsetHeight, 1);
      const listRect = servicesList.getBoundingClientRect();
      const gridRect = servicesGrid.getBoundingClientRect();
      const sectionProgress = ((window.scrollY + window.innerHeight) - sectionTop) / sectionHeight;
      const isAboveServiceTable = listRect.top >= window.innerHeight * 0.82;
      const isInServicesViewport = sectionRect.top < window.innerHeight && sectionRect.bottom > 0;

      if (isAboveServiceTable) {
        servicesMobileCompare.classList.remove("services-mobile-compare-docked");
        servicesGrid.style.setProperty("--services-mobile-compare-space", "0px");
        servicesMobileCompare.style.left = "0px";
        servicesMobileCompare.style.width = `${window.innerWidth}px`;
        servicesMobileCompare.style.top = "auto";
        servicesMobileCompare.style.bottom = "0px";
        servicesMobileCompare.classList.remove("services-mobile-compare-visible");
        servicesMobileCompare.setAttribute("aria-hidden", "true");
        mobileCompareShown = false;
        mobileCompareActivated = false;
        return;
      }

      if (!mobileCompareActivated && scrollingDown && isInServicesViewport && sectionProgress >= 0.4) {
        mobileCompareActivated = true;
      }

      if (!mobileCompareActivated) {
        servicesMobileCompare.classList.remove("services-mobile-compare-docked");
        servicesGrid.style.setProperty("--services-mobile-compare-space", "0px");
        servicesMobileCompare.style.left = "0px";
        servicesMobileCompare.style.width = `${window.innerWidth}px`;
        servicesMobileCompare.style.top = "auto";
        servicesMobileCompare.style.bottom = "0px";
        servicesMobileCompare.classList.remove("services-mobile-compare-visible");
        servicesMobileCompare.setAttribute("aria-hidden", "true");
        mobileCompareShown = false;
        return;
      }

      servicesMobileCompare.classList.add("services-mobile-compare-visible");
      servicesMobileCompare.setAttribute("aria-hidden", "false");
      mobileCompareShown = true;

      const bottomOffset = 0;
      const compareHeight = servicesMobileCompare.offsetHeight;
      const reservedSpace = compareHeight;
      const floatingTop = window.innerHeight - bottomOffset - compareHeight;
      const isPastServicesSection = sectionRect.bottom <= 0;
      const shouldDock = isPastServicesSection || listRect.bottom <= floatingTop;

      if (shouldDock) {
        const dockTop = Math.max(0, servicesList.offsetTop + servicesList.offsetHeight);

        servicesMobileCompare.classList.add("services-mobile-compare-docked");
        servicesGrid.style.setProperty("--services-mobile-compare-space", `${reservedSpace}px`);
        servicesMobileCompare.style.left = `${-gridRect.left}px`;
        servicesMobileCompare.style.width = `${window.innerWidth}px`;
        servicesMobileCompare.style.top = `${dockTop}px`;
        servicesMobileCompare.style.bottom = "auto";
      } else {
        servicesMobileCompare.classList.remove("services-mobile-compare-docked");
        servicesGrid.style.setProperty("--services-mobile-compare-space", `${reservedSpace}px`);
        servicesMobileCompare.style.left = "0px";
        servicesMobileCompare.style.width = `${window.innerWidth}px`;
        servicesMobileCompare.style.top = "auto";
        servicesMobileCompare.style.bottom = `${bottomOffset}px`;
      }
    }

    function updateSelectedListScrollbar() {
      if (!servicesDropSelectedList || !servicesDropListTrack) return;
      const { scrollTop, scrollHeight, clientHeight } = servicesDropSelectedList;
      const isScrollable = scrollHeight > clientHeight + 1;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 2;

      // Gradient mask — show when scrollable and not fully scrolled down
      servicesDropSelectedList.classList.toggle("is-overflowing", isScrollable && !isAtBottom);

      // Track visibility
      servicesDropListTrack.classList.toggle("is-visible", isScrollable);

      // Proportional thumb size + position
      const thumb = servicesDropListTrack.querySelector("span");
      if (thumb && isScrollable) {
        const trackH = servicesDropListTrack.clientHeight;
        const thumbH = Math.max(24, (clientHeight / scrollHeight) * trackH);
        const maxScroll = scrollHeight - clientHeight;
        const maxTravel = Math.max(0, trackH - thumbH);
        const ratio = maxScroll > 0 ? scrollTop / maxScroll : 0;
        thumb.style.height = `${thumbH}px`;
        thumb.style.top = `${ratio * maxTravel}px`;
      }
    }

    if (servicesDropSelectedList) {
      servicesDropSelectedList.addEventListener("scroll", updateSelectedListScrollbar, { passive: true });
    }

    function removeDroppedService(pill, itemEl) {
      const idx = activeDroppedServices.findIndex((s) => s.pill === pill);
      if (idx === -1) return;
      const sourceCategory = pill.closest("[data-services-category]");
      const entry = activeDroppedServices[idx];

      if (entry.mobilePersistent) {
        pill.classList.remove("services-request-pill-selected");
      } else {
        const { parent, nextSibling } = entry;
        if (nextSibling && nextSibling.parentNode === parent) {
          parent.insertBefore(pill, nextSibling);
        } else {
          parent.appendChild(pill);
        }
      }

      activeDroppedServices.splice(idx, 1);
      itemEl.remove();
      if (!entry.mobilePersistent) {
        refreshServicesLayout();
      }
      if (!entry.mobilePersistent && sourceCategory && !sourceCategory.classList.contains("services-item-active")) {
        openCategory(sourceCategory);
      }
      updateMobileTabCounts();
      updateDropzonePlanCopy();
      updateMobileCompareState();
      requestAnimationFrame(updateSelectedListScrollbar);
      if (activeDroppedServices.length === 0 && servicesDropzone) {
        servicesDropzone.classList.remove("services-dropzone-has-items");
      }
    }

    function addDroppedService(label) {
      if (!servicesDropzone || !label || !draggedServicePill) return;
      // Don't add the same pill twice
      if (activeDroppedServices.some((s) => s.pill === draggedServicePill)) return;

      const pill = draggedServicePill;
      const tooltipDesc = pill.dataset.tooltip || "";
      const mobilePersistent = isMobileServicesLayout();
      const entry = {
        pill,
        parent: pill.parentElement,
        nextSibling: pill.nextElementSibling,
        mobilePersistent,
      };

      const sourceCategory = pill.closest("[data-services-category]");

      if (mobilePersistent) {
        pill.classList.add("services-request-pill-selected");
      } else {
        pill.remove();
        refreshServicesLayout();
      }
      if (!mobilePersistent && sourceCategory && isCategoryEmpty(sourceCategory)) {
        const replacementCategory = findNextAvailableCategory(sourceCategory);
        if (replacementCategory) openCategory(replacementCategory);
      }

      const itemEl = document.createElement("div");
      itemEl.className = "services-drop-selected-item";
      itemEl.innerHTML =
        `<div class="services-drop-selected-pill">` +
          `<span class="services-drop-selected-label">${label}</span>` +
          `<button class="services-drop-info" type="button" aria-label="More info">?</button>` +
        `</div>` +
        `<button class="services-drop-remove-single" type="button" aria-label="Remove ${label}">` +
          `<span></span><span></span>` +
        `</button>`;

      const infoBtn = itemEl.querySelector(".services-drop-info");
      if (infoBtn && tooltipDesc) {
        infoBtn.dataset.tooltipName = label;
        infoBtn.dataset.tooltipDesc = tooltipDesc;
        infoBtn.addEventListener("mouseenter", () => showServiceInfoTooltip(infoBtn));
        infoBtn.addEventListener("mouseleave", (e) => {
          if (!serviceInfoTooltip.contains(e.relatedTarget)) hideServiceInfoTooltip();
        });
        infoBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (_tooltipActiveBtn === infoBtn && serviceInfoTooltip.classList.contains("is-visible")) {
            hideServiceInfoTooltip();
          } else {
            showServiceInfoTooltip(infoBtn);
          }
        });
      }

      itemEl.querySelector(".services-drop-remove-single").addEventListener("click", () => {
        hideServiceInfoTooltip();
        removeDroppedService(pill, itemEl);
      });

      entry.itemEl = itemEl;
      activeDroppedServices.push(entry);
      if (servicesDropSelectedList) servicesDropSelectedList.appendChild(itemEl);

      servicesDropzone.classList.add("services-dropzone-has-items");
      updateMobileTabCounts();
      updateDropzonePlanCopy();
      updateMobileCompareState();
      requestAnimationFrame(updateSelectedListScrollbar);
    }


    if (servicesDropzone) {
      servicesDropzone.addEventListener("dragenter", (event) => {
        if (isMobileServicesLayout()) return;
        event.preventDefault();
        servicesDropzone.classList.add("services-dropzone-active");
      });

      servicesDropzone.addEventListener("dragover", (event) => {
        if (isMobileServicesLayout()) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
        servicesDropzone.classList.add("services-dropzone-active");
      });

      servicesDropzone.addEventListener("dragleave", (event) => {
        if (isMobileServicesLayout()) return;
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && servicesDropzone.contains(nextTarget)) return;
        servicesDropzone.classList.remove("services-dropzone-active");
      });

      servicesDropzone.addEventListener("drop", (event) => {
        if (isMobileServicesLayout()) return;
        event.preventDefault();
        servicesDropzone.classList.remove("services-dropzone-active");
        const droppedLabel = event.dataTransfer?.getData("text/plain") || draggedServiceLabel;
        addDroppedService(droppedLabel.trim());
      });
    }

    // Recalculate on resize
    window.addEventListener("resize", () => {
      const active = serviceCategories.find((cat) => cat.classList.contains("services-item-active"));
      layoutAccordion(active);
      scheduleMobilePlanSliderState();
      scheduleMobileComparePosition();
    }, { passive: true });

    window.addEventListener("scroll", scheduleMobileComparePosition, { passive: true });

    if (servicesMobilePlanSlider) {
      servicesMobilePlanSlider.addEventListener("scroll", scheduleMobilePlanSliderState, { passive: true });
    }

    if (typeof ResizeObserver !== "undefined") {
      const mobileCompareObserver = new ResizeObserver(() => {
        scheduleMobileComparePosition();
      });

      mobileCompareObserver.observe(servicesList);
    }

    if (servicesDropStack) {
      const DROP_ROLES = ["incoming", "top", "middle", "bottom"];
      const DROP_LOOP_MS = 1480;
      const DROP_ANIM_MS = 820;

      function setDropRole(el, role) {
        if (!el) return;
        el.setAttribute("data-drop-role", role);
      }

      function getDropPill(role) {
        return servicesDropStack.querySelector(`[data-drop-role="${role}"]`);
      }

      function resetOutgoingPill(el) {
        if (!el) return;
        el.classList.add("services-drop-pill-reset");
        setDropRole(el, "incoming");

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.classList.remove("services-drop-pill-reset");
          });
        });
      }

      function cycleDropStack() {
        const incoming = getDropPill("incoming");
        const top = getDropPill("top");
        const middle = getDropPill("middle");
        const bottom = getDropPill("bottom");

        setDropRole(incoming, "top");
        setDropRole(top, "middle");
        setDropRole(middle, "bottom");
        setDropRole(bottom, "outgoing");

        window.setTimeout(() => {
          resetOutgoingPill(bottom);
        }, DROP_ANIM_MS);
      }

      DROP_ROLES.forEach((role, index) => {
        const pill = servicesDropStack.children[index];
        if (pill) setDropRole(pill, role);
      });

      cycleDropStack();
      dropStackTimer = window.setInterval(cycleDropStack, DROP_LOOP_MS);
    }
  }

  // ---------------------------------------------------------
  // 13) Discovery Card — complete animation cycle on hover
  //    Panels slide + green circle + ring draw = ~1.1s total.
  //    Class stays active until full cycle finishes so mouse-out
  //    mid-animation doesn't cut it short.
  // ---------------------------------------------------------
  const discoveryCard = document.querySelector(".process-visual-people")
    ?.closest(".process-card");

  if (discoveryCard) {
    const ANIM_DURATION = 1100; // ms — covers full forward animation (ring 0.35+0.45s + checkmark 0.8+0.3s = ~1.1s)
    const HOLD_AFTER_COMPLETE_MS = 0;
    let rewindTimer;
    let hasPlayedInView = false;

    function scheduleDiscoveryRewind() {
      clearTimeout(rewindTimer);
      rewindTimer = setTimeout(() => {
        discoveryCard.classList.remove("discovery-active");
      }, ANIM_DURATION + HOLD_AFTER_COMPLETE_MS);
    }

    function triggerDiscoveryAnimation() {
      discoveryCard.classList.add("discovery-active");
      scheduleDiscoveryRewind();
    }

    discoveryCard.addEventListener("mouseenter", () => {
      if (mqProcessViewport.matches) return;
      triggerDiscoveryAnimation();
    });

    discoveryCard.addEventListener("mouseleave", () => {
      if (mqProcessViewport.matches) return;
      scheduleDiscoveryRewind();
    });

    const discoveryObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!mqProcessViewport.matches) return;

        if (entry.isIntersecting && !hasPlayedInView) {
          hasPlayedInView = true;
          triggerDiscoveryAnimation();
        } else if (!entry.isIntersecting) {
          hasPlayedInView = false;
        }
      });
    }, { threshold: 0.55 });

    discoveryObserver.observe(discoveryCard);
    mqProcessViewport.addEventListener("change", () => {
      hasPlayedInView = false;
      clearTimeout(rewindTimer);
      discoveryCard.classList.remove("discovery-active");
    });
  }

  const quickCallSection = document.querySelector(".quick-call-section");

  if (quickCallSection) {
    let quickCallPlayed = false;
    const quickCallObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || quickCallPlayed) return;

        quickCallPlayed = true;
        quickCallSection.classList.add("quick-call-visible");

        window.setTimeout(() => {
          quickCallSection.classList.add("quick-call-flyout");
        }, 2000);

        quickCallObserver.unobserve(quickCallSection);
      });
    }, { threshold: 0.28 });

    quickCallObserver.observe(quickCallSection);
  }

  const aboutStrengthCards = Array.from(document.querySelectorAll(".about-strength-card"));
  const aboutStrengthViewport = window.matchMedia("(max-width: 860px)");

  if (aboutStrengthCards.length) {
    function clearActiveAboutStrength() {
      aboutStrengthCards.forEach((card) => {
        card.classList.remove("is-mobile-active");
        card.querySelector(".about-strength-toggle")?.setAttribute("aria-pressed", "false");
      });
    }

    function setActiveAboutStrength(activeCard) {
      aboutStrengthCards.forEach((card) => {
        const isActive = card === activeCard && !card.classList.contains("is-mobile-active");
        card.classList.toggle("is-mobile-active", isActive);
        card.querySelector(".about-strength-toggle")?.setAttribute("aria-pressed", String(isActive));
      });
    }

    aboutStrengthCards.forEach((card) => {
      const toggle = card.querySelector(".about-strength-toggle");

      card.addEventListener("click", (event) => {
        if (!aboutStrengthViewport.matches) return;
        event.stopPropagation();
        setActiveAboutStrength(card);
      });

      toggle?.addEventListener("click", (event) => {
        event.stopPropagation();
        if (!aboutStrengthViewport.matches) return;
        setActiveAboutStrength(card);
      });
    });

    document.addEventListener("click", () => {
      if (!aboutStrengthViewport.matches) return;
      clearActiveAboutStrength();
    });

    window.addEventListener("scroll", () => {
      if (!aboutStrengthViewport.matches) return;
      clearActiveAboutStrength();
    }, { passive: true });

    aboutStrengthViewport.addEventListener("change", () => {
      clearActiveAboutStrength();
    });
  }

  const aboutTrust = document.querySelector(".about-trust");
  const aboutTrustCardWindow = aboutTrust?.querySelector(".about-trust-card-window");
  const aboutTrustTrack = aboutTrust?.querySelector(".about-trust-card-track");
  const aboutTrustCards = aboutTrustTrack
    ? Array.from(aboutTrustTrack.querySelectorAll(".about-trust-card"))
    : [];
  const aboutTrustViewport = window.matchMedia("(min-width: 861px)");
  const aboutTrustMobileViewport = window.matchMedia("(max-width: 860px)");

  if (aboutTrust && aboutTrustTrack && aboutTrustCards.length > 1) {
    let aboutTrustFrame = 0;
    let aboutTrustMobileFrame = 0;

    function updateAboutTrustScroll() {
      aboutTrustFrame = 0;

      if (!aboutTrustViewport.matches) {
        aboutTrustCards.forEach((card) => {
          card.style.removeProperty("--about-card-y");
          card.style.removeProperty("--about-card-scale");
          card.style.removeProperty("--about-card-opacity");
          card.style.removeProperty("z-index");
        });
        return;
      }

      const rect = aboutTrust.getBoundingClientRect();
      const scrollRange = Math.max(1, aboutTrust.offsetHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / scrollRange));
      const deckProgress = progress * (aboutTrustCards.length - 1);
      const stackGap = 26;
      const cardHeight = aboutTrustTrack.getBoundingClientRect().height;
      const lineGap = 118;
      const lineStep = cardHeight + lineGap;

      aboutTrustCards.forEach((card, index) => {
        const stackedY = index * stackGap;
        const linedY = (index - deckProgress) * lineStep;
        const y = Math.max(stackedY, linedY);
        const scale = 1;

        card.style.setProperty("--about-card-y", `${y}px`);
        card.style.setProperty("--about-card-scale", String(scale));
        card.style.setProperty("--about-card-opacity", "1");
        card.style.zIndex = String(100 + index);
      });
    }

    function requestAboutTrustUpdate() {
      if (aboutTrustFrame) return;
      aboutTrustFrame = window.requestAnimationFrame(updateAboutTrustScroll);
    }

    function updateAboutTrustMobileSliderState() {
      aboutTrustMobileFrame = 0;
      if (!aboutTrustCardWindow || !aboutTrustMobileViewport.matches) {
        aboutTrustCards.forEach((card) => {
          card.classList.remove("about-trust-card-active", "about-trust-card-prev", "about-trust-card-next");
        });
        return;
      }

      const sliderRect = aboutTrustCardWindow.getBoundingClientRect();
      const sliderCenter = sliderRect.left + sliderRect.width / 2;
      let activeIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      aboutTrustCards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const distance = Math.abs(cardCenter - sliderCenter);
        if (distance < bestDistance) {
          bestDistance = distance;
          activeIndex = index;
        }
      });

      aboutTrustCards.forEach((card, index) => {
        card.classList.toggle("about-trust-card-active", index === activeIndex);
        card.classList.toggle("about-trust-card-prev", index === activeIndex - 1);
        card.classList.toggle("about-trust-card-next", index === activeIndex + 1);
      });
    }

    function requestAboutTrustMobileSliderState() {
      if (aboutTrustMobileFrame) return;
      aboutTrustMobileFrame = window.requestAnimationFrame(updateAboutTrustMobileSliderState);
    }

    window.addEventListener("scroll", requestAboutTrustUpdate, { passive: true });
    window.addEventListener("resize", requestAboutTrustUpdate);
    window.addEventListener("resize", requestAboutTrustMobileSliderState);
    aboutTrustCardWindow?.addEventListener("scroll", requestAboutTrustMobileSliderState, { passive: true });
    aboutTrustViewport.addEventListener("change", requestAboutTrustUpdate);
    aboutTrustMobileViewport.addEventListener("change", requestAboutTrustMobileSliderState);
    updateAboutTrustScroll();
    updateAboutTrustMobileSliderState();
  }

  const showcaseCards = Array.from(document.querySelectorAll(".showcase-card"));
  const showcaseMobileViewport = window.matchMedia("(max-width: 860px)");

  if (showcaseCards.length) {
    let showcaseFrame = 0;

    function clearShowcaseMobileActive() {
      showcaseCards.forEach((card) => {
        card.classList.remove("is-mobile-active");
      });
    }

    function updateShowcaseMobileActive() {
      showcaseFrame = 0;

      if (!showcaseMobileViewport.matches) {
        clearShowcaseMobileActive();
        return;
      }

      const viewportCenter = window.innerHeight * 0.5;
      let activeCard = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      showcaseCards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);

        if (visibleHeight <= 0) return;

        const cardCenter = rect.top + rect.height / 2;
        const distance = Math.abs(cardCenter - viewportCenter);

        if (distance < bestDistance) {
          bestDistance = distance;
          activeCard = card;
        }
      });

      showcaseCards.forEach((card) => {
        card.classList.toggle("is-mobile-active", card === activeCard);
      });
    }

    function requestShowcaseMobileActiveUpdate() {
      if (showcaseFrame) return;
      showcaseFrame = window.requestAnimationFrame(updateShowcaseMobileActive);
    }

    window.addEventListener("scroll", requestShowcaseMobileActiveUpdate, { passive: true });
    window.addEventListener("resize", requestShowcaseMobileActiveUpdate);
    showcaseMobileViewport.addEventListener("change", requestShowcaseMobileActiveUpdate);
    updateShowcaseMobileActive();
  }

  // ---------------------------------------------------------
  // Mobile CTA tap animation
  // ---------------------------------------------------------
  const mqMobileCta = window.matchMedia("(max-width: 880px)");
  const ctaEls = Array.from(document.querySelectorAll(
    ".cta-pill, .nav-cta-pill, .mnav-cta, .pricing-summary-cta, .pricing-mobile-summary-cta"
  ));

  ctaEls.forEach((el) => {
    el.addEventListener("touchstart", () => {
      if (!mqMobileCta.matches) return;
      el.classList.add("is-tapped");
    }, { passive: true });

    el.addEventListener("touchend", () => {
      if (!mqMobileCta.matches) return;
      setTimeout(() => el.classList.remove("is-tapped"), 380);
    }, { passive: true });

    el.addEventListener("touchcancel", () => {
      el.classList.remove("is-tapped");
    }, { passive: true });
  });

  // ---------------------------------------------------------
  // Feedback horizontal slide scroll
  // ---------------------------------------------------------
  const feedbackSection = document.getElementById("feedback");
  const feedbackSlidesEl = feedbackSection ? feedbackSection.querySelector(".feedback-slides") : null;
  const feedbackFinalSlide = feedbackSection
    ? feedbackSection.querySelector(".feedback-slide-final")
    : null;
  const feedbackFinalConnector = feedbackSection
    ? feedbackSection.querySelector(".feedback-connector-final")
    : null;
  const feedbackClientPortraits = feedbackSection
    ? Array.from(feedbackSection.querySelectorAll(".feedback-block-circle"))
    : [];
  const feedbackClientQuote = feedbackSection
    ? feedbackSection.querySelector(".feedback-block-client-quote")
    : null;
  const feedbackClientName = feedbackSection
    ? feedbackSection.querySelector(".feedback-block-client-name")
    : null;
  const feedbackClientRole = feedbackSection
    ? feedbackSection.querySelector(".feedback-block-client-role")
    : null;
  const feedbackClientBlock = feedbackSection
    ? feedbackSection.querySelector(".feedback-block-client")
    : null;
  const feedbackMobilePortraits = feedbackSection
    ? Array.from(feedbackSection.querySelectorAll(".feedback-mobile-avatar"))
    : [];
  const feedbackMobileQuote = feedbackSection
    ? feedbackSection.querySelector(".feedback-mobile-quote")
    : null;
  const feedbackMobileName = feedbackSection
    ? feedbackSection.querySelector(".feedback-mobile-name")
    : null;
  const feedbackMobileRole = feedbackSection
    ? feedbackSection.querySelector(".feedback-mobile-role")
    : null;
  const feedbackMobileCopy = feedbackSection
    ? feedbackSection.querySelector(".feedback-mobile-copy")
    : null;
  const feedbackMobileCard = feedbackSection
    ? feedbackSection.querySelector(".feedback-mobile-testimonial-card")
    : null;
  const feedbackClientTestimonials = [
    {
      quote: "Clockwrk built out both our finance app and web platform, and honestly, the whole experience was smooth from start to finish. The UI feels clean and intuitive, and everything just works the way it should. They understood what we needed without us having to over-explain - which made a big difference.",
      name: "Saadulev Khan",
      role: "CEO @ HKK",
    },
    {
      quote: "Clockwrk really understood what we were trying to build with Lagom from day one. They translated our vision into a brand and website that felt right immediately. The team is sharp, quick to respond, and easy to collaborate with. I'd definitely work with them again.",
      name: "Moaz Khan Tareen",
      role: "Principal Architect, Lagom Studio",
    },
    {
      quote: "Working with Clockwrk on our ecommerce store was a great experience. They handled everything end-to-end and made the process feel straightforward, which isn't always the case with projects like this. The final result looks great and performs even better than we expected.",
      name: "Zuraiz Sohal",
      role: "COO @ Kanzo",
    },
    {
      quote: "We needed a proper upgrade, and Clockwrk delivered exactly that. The new website feels modern, clean, and much more aligned with where our business is today. They worked efficiently without cutting corners, which we really appreciated.",
      name: "Mahad Saud",
      role: "CEO @ Three Star Mills",
    },
    {
      quote: "Building a full ERP system is complex, but Clockwrk approached it with a lot of clarity and structure. From frontend to backend, everything was well thought out and executed properly. You can tell they take their work seriously - one of the more reliable and capable teams I've worked with.",
      name: "Umer Sarwar Lodhi",
      role: "Founder @ SPP",
    },
  ];

  if (feedbackSection && feedbackSlidesEl) {
    const feedbackDesktopViewport = window.matchMedia("(min-width: 861px)");
    const feedbackMobileViewport = window.matchMedia("(max-width: 860px)");
    let fbMaxTranslate = 0;
    let feedbackRevealScrollDistance = 0;
    let feedbackEdgeFadeScrollDistance = 0;
    let feedbackRevealStartScrollY = null;
    let feedbackTimerRaf = null;
    let feedbackTimerStartedAt = 0;
    let feedbackActiveClient = 0;
    let feedbackRenderedClient = -1;
    let feedbackCopyFadeTimer = null;
    const feedbackClientDuration = 6500;
    const feedbackTimerStartThreshold = 0.45;
    const feedbackCopyFadeDuration = 260;
    const feedbackHeightTransitionDuration = 320;

    function renderFeedbackClient(index, shouldFade = true) {
      const activeTestimonial = feedbackClientTestimonials[index];
      if (!activeTestimonial || index === feedbackRenderedClient) {
        return;
      }

      if (feedbackCopyFadeTimer) {
        clearTimeout(feedbackCopyFadeTimer);
        feedbackCopyFadeTimer = null;
      }

      const updateDesktopCopy = () => {
        if (feedbackClientQuote) feedbackClientQuote.textContent = activeTestimonial.quote;
        if (feedbackClientName) feedbackClientName.textContent = activeTestimonial.name;
        if (feedbackClientRole) feedbackClientRole.textContent = activeTestimonial.role;
        feedbackClientBlock?.classList.remove("is-fading");
      };

      const updateMobileCopy = () => {
        if (feedbackMobileQuote) feedbackMobileQuote.textContent = activeTestimonial.quote;
        if (feedbackMobileName) feedbackMobileName.textContent = activeTestimonial.name;
        if (feedbackMobileRole) feedbackMobileRole.textContent = activeTestimonial.role;
      };

      if (!shouldFade || (!feedbackClientBlock && !feedbackMobileCopy)) {
        updateDesktopCopy();
        updateMobileCopy();
        feedbackRenderedClient = index;
        return;
      }

      if (feedbackClientBlock) {
        feedbackClientBlock.classList.add("is-fading");
      }

      if (feedbackMobileCopy && feedbackMobileViewport.matches) {
        if (feedbackMobileCard) {
          feedbackMobileCard.style.height = `${feedbackMobileCard.offsetHeight}px`;
        }

        feedbackMobileCopy.classList.add("is-fading");
        feedbackCopyFadeTimer = setTimeout(() => {
          updateMobileCopy();
          if (feedbackMobileCard) {
            feedbackMobileCard.style.height = `${feedbackMobileCard.scrollHeight}px`;
          }

          requestAnimationFrame(() => {
            feedbackMobileCopy.classList.remove("is-fading");
          });

          feedbackCopyFadeTimer = setTimeout(() => {
            if (feedbackMobileCard) {
              feedbackMobileCard.style.height = "";
            }
            updateDesktopCopy();
            feedbackRenderedClient = index;
            feedbackCopyFadeTimer = null;
          }, feedbackHeightTransitionDuration);
        }, feedbackCopyFadeDuration);
        return;
      }

      feedbackCopyFadeTimer = setTimeout(() => {
        updateDesktopCopy();
        feedbackRenderedClient = index;
        feedbackCopyFadeTimer = null;
      }, feedbackCopyFadeDuration);
    }

    function setFeedbackActiveClient(index) {
      if (!feedbackClientPortraits.length) {
        return;
      }

      feedbackActiveClient = index % feedbackClientPortraits.length;
      feedbackClientPortraits.forEach((portrait, portraitIndex) => {
        const isActive = portraitIndex === feedbackActiveClient;
        portrait.classList.toggle("is-active", isActive);
        portrait.style.setProperty("--timer-progress", "0deg");
      });
      feedbackMobilePortraits.forEach((portrait, portraitIndex) => {
        const isActive = portraitIndex === feedbackActiveClient;
        portrait.classList.toggle("is-active", isActive);
        portrait.style.setProperty("--timer-progress", "0deg");
      });

      renderFeedbackClient(feedbackActiveClient, feedbackRenderedClient !== -1);
    }

    function stopFeedbackClientTimer() {
      if (feedbackTimerRaf) {
        cancelAnimationFrame(feedbackTimerRaf);
        feedbackTimerRaf = null;
      }
      feedbackTimerStartedAt = 0;
      setFeedbackActiveClient(0);
    }

    function runFeedbackClientTimer(now) {
      if (!feedbackTimerStartedAt) {
        feedbackTimerStartedAt = now;
      }

      const elapsed = now - feedbackTimerStartedAt;
      const progress = Math.min(elapsed / feedbackClientDuration, 1);
      const activePortrait = feedbackClientPortraits[feedbackActiveClient];
      const activeMobilePortrait = feedbackMobilePortraits[feedbackActiveClient];

      if (activePortrait) {
        activePortrait.style.setProperty(
          "--timer-progress",
          `${Math.round(progress * 360)}deg`
        );
      }
      if (activeMobilePortrait) {
        activeMobilePortrait.style.setProperty(
          "--timer-progress",
          `${Math.round(progress * 360)}deg`
        );
      }

      if (progress >= 1) {
        feedbackTimerStartedAt = now;
        setFeedbackActiveClient(feedbackActiveClient + 1);
      }

      feedbackTimerRaf = requestAnimationFrame(runFeedbackClientTimer);
    }

    function startFeedbackClientTimer() {
      if (!feedbackClientPortraits.length || feedbackTimerRaf) {
        return;
      }

      setFeedbackActiveClient(feedbackActiveClient);
      feedbackTimerRaf = requestAnimationFrame(runFeedbackClientTimer);
    }

    function updateFeedbackCurtain(progress) {
      if (!feedbackFinalSlide || !feedbackClientPortraits.length) {
        return;
      }

      feedbackFinalSlide.classList.toggle("is-curtain-closed", progress <= 0);
      const dashFadeProgress = Math.max(0, Math.min((progress - 0.45) / 0.15, 1));
      feedbackFinalSlide.style.setProperty(
        "--feedback-final-dash-opacity",
        `${1 - dashFadeProgress}`
      );
      if (feedbackFinalConnector) {
        feedbackFinalConnector.style.opacity = `${1 - dashFadeProgress}`;
      }

      const firstPortrait = feedbackClientPortraits[0];
      if (!firstPortrait) {
        return;
      }

      const screenRect = feedbackFinalSlide.getBoundingClientRect();
      const firstPortraitRect = firstPortrait.getBoundingClientRect();
      const curtainX = firstPortraitRect.left + (firstPortraitRect.width / 2) - screenRect.left;
      const curtainY = firstPortraitRect.top + (firstPortraitRect.height / 2) - screenRect.top;
      const maxRadius = Math.max(
        Math.hypot(curtainX, curtainY),
        Math.hypot(screenRect.width - curtainX, curtainY),
        Math.hypot(curtainX, screenRect.height - curtainY),
        Math.hypot(screenRect.width - curtainX, screenRect.height - curtainY)
      ) + 24;

      feedbackFinalSlide.style.setProperty("--feedback-curtain-x", `${curtainX}px`);
      feedbackFinalSlide.style.setProperty("--feedback-curtain-y", `${curtainY}px`);
      feedbackFinalSlide.style.setProperty(
        "--feedback-curtain-radius",
        `${Math.max(0, progress) * maxRadius}px`
      );
    }

    function setFeedbackHeight() {
      if (!feedbackDesktopViewport.matches) {
        fbMaxTranslate = 0;
        feedbackRevealScrollDistance = 0;
        feedbackEdgeFadeScrollDistance = 0;
        feedbackSection.style.removeProperty("height");
        feedbackSlidesEl.style.removeProperty("transform");
        return;
      }

      fbMaxTranslate = feedbackFinalSlide
        ? Math.max(
          0,
          feedbackFinalSlide.offsetLeft + feedbackFinalSlide.offsetWidth - window.innerWidth
        )
        : Math.max(0, feedbackSlidesEl.scrollWidth - window.innerWidth);
      feedbackRevealScrollDistance = Math.max(window.innerHeight * 0.9, 720);
      feedbackEdgeFadeScrollDistance = Math.max(window.innerHeight * 0.35, 280);
      feedbackSection.style.height = `${
        window.innerHeight +
        fbMaxTranslate +
        feedbackRevealScrollDistance +
        feedbackEdgeFadeScrollDistance
      }px`;
    }

    function updateFeedbackScroll() {
      if (!feedbackDesktopViewport.matches) {
        return;
      }

      const sectionRect = feedbackSection.getBoundingClientRect();
      const sectionTop = sectionRect.top;
      const totalScrollableProgress = Math.max(
        0,
        Math.min(
          -sectionTop,
          fbMaxTranslate + feedbackRevealScrollDistance + feedbackEdgeFadeScrollDistance
        )
      );
      const totalProgress = Math.min(totalScrollableProgress, fbMaxTranslate);
      const hasReachedFinalSlide = totalScrollableProgress >= fbMaxTranslate;
      if (!hasReachedFinalSlide) {
        feedbackRevealStartScrollY = null;
      } else if (feedbackRevealStartScrollY === null) {
        feedbackRevealStartScrollY = window.scrollY;
      }
      const finalSlideRect = feedbackFinalSlide
        ? feedbackFinalSlide.getBoundingClientRect()
        : null;
      const finalRevealProgress = feedbackRevealScrollDistance && feedbackRevealStartScrollY !== null
        ? Math.max(
          0,
          Math.min(
            (window.scrollY - feedbackRevealStartScrollY) / feedbackRevealScrollDistance,
            1
          )
        )
        : 0;
      const finalEdgeFadeProgress = feedbackEdgeFadeScrollDistance && feedbackRevealStartScrollY !== null
        ? Math.max(
          0,
          Math.min(
            (window.scrollY - feedbackRevealStartScrollY - feedbackRevealScrollDistance) /
              feedbackEdgeFadeScrollDistance,
            1
          )
        )
        : 0;
      const isFinalSlideVisible = finalSlideRect
        ? finalSlideRect.left < window.innerWidth && finalSlideRect.right > 0
        : false;

      feedbackSlidesEl.style.transform = `translateX(-${totalProgress}px)`;
      updateFeedbackCurtain(finalRevealProgress);
      if (feedbackFinalSlide) {
        const edgeColor = Math.round(18 + (237 * finalEdgeFadeProgress));
        feedbackFinalSlide.style.backgroundColor = `rgb(${edgeColor}, ${edgeColor}, ${edgeColor})`;
      }

      if (isFinalSlideVisible && finalRevealProgress >= feedbackTimerStartThreshold) {
        startFeedbackClientTimer();
      } else {
        stopFeedbackClientTimer();
      }
    }

    function updateFeedbackMobileTimer() {
      if (!feedbackMobileViewport.matches) {
        return;
      }

      const sectionRect = feedbackSection.getBoundingClientRect();
      const isVisible = sectionRect.top < window.innerHeight && sectionRect.bottom > 0;
      if (isVisible) {
        startFeedbackClientTimer();
      } else {
        stopFeedbackClientTimer();
      }
    }

    setFeedbackActiveClient(0);
    feedbackMobilePortraits.forEach((portrait, index) => {
      portrait.addEventListener("click", () => {
        feedbackTimerStartedAt = 0;
        setFeedbackActiveClient(index);
      });
    });
    setFeedbackHeight();
    window.addEventListener("resize", () => {
      feedbackRevealStartScrollY = null;
      setFeedbackHeight();
      updateFeedbackScroll();
      updateFeedbackMobileTimer();
    });
    feedbackDesktopViewport.addEventListener("change", () => {
      feedbackRevealStartScrollY = null;
      stopFeedbackClientTimer();
      setFeedbackHeight();
      updateFeedbackScroll();
      updateFeedbackMobileTimer();
    });
    feedbackMobileViewport.addEventListener("change", updateFeedbackMobileTimer);
    window.addEventListener("scroll", () => {
      updateFeedbackScroll();
      updateFeedbackMobileTimer();
    }, { passive: true });
    updateFeedbackScroll();
    updateFeedbackMobileTimer();
  }

  // ── Cheatcode call card: discovery animation ────────────────
  const cheatcodeCallCard = document.querySelector(".cheatcode-card-call");
  if (cheatcodeCallCard) {
    const CALL_ANIM_DURATION = 1100;
    const CALL_HOLD_MS = 0;
    let callRewindTimer;

    function scheduleCallRewind() {
      clearTimeout(callRewindTimer);
      callRewindTimer = setTimeout(() => {
        cheatcodeCallCard.classList.remove("discovery-active");
      }, CALL_ANIM_DURATION + CALL_HOLD_MS);
    }

    function triggerCallAnimation() {
      cheatcodeCallCard.classList.add("discovery-active");
      scheduleCallRewind();
    }

    cheatcodeCallCard.addEventListener("mouseenter", () => {
      if (mqProcessViewport.matches) return;
      triggerCallAnimation();
    });

    cheatcodeCallCard.addEventListener("mouseleave", () => {
      if (mqProcessViewport.matches) return;
      scheduleCallRewind();
    });
  }

  // ── Cheatcode plan card carousel ────────────────────────────
  const cheatcodePlanCard = document.querySelector(".cheatcode-card-plan");
  if (cheatcodePlanCard) {
    let cycleState = 0;
    let cycleTimer = null;

    function advanceCycle() {
      cycleState = (cycleState + 1) % 3;
      if (cycleState === 0) {
        cheatcodePlanCard.removeAttribute("data-cycle");
      } else {
        cheatcodePlanCard.dataset.cycle = String(cycleState);
      }
    }

    cheatcodePlanCard.addEventListener("mouseenter", () => {
      advanceCycle();
      cycleTimer = setInterval(advanceCycle, 650);
    });

    cheatcodePlanCard.addEventListener("mouseleave", () => {
      clearInterval(cycleTimer);
      cycleTimer = null;
    });
  }

})();

// ─── Newsletter Form ──────────────────────────────────────────────────────

function initNewsletterForm(formId, inputId, btnId, type, source) {
  const form = document.getElementById(formId);
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (!form || !input || !btn) return;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function submitEmail(emailType) {
    const email = input.value.trim();

    if (!email || !emailRegex.test(email)) {
      input.style.outline = '2px solid #ff4444';
      setTimeout(() => input.style.outline = '', 2000);
      return;
    }

    btn.disabled = true;
    const originalContent = btn.innerHTML;
    btn.innerHTML = '...';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch('https://n8n.clockwrk.io/webhook/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: emailType || type, source }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await res.json();

      if (data.success) {
        input.value = '';
        input.placeholder = data.message === 'already_subscribed'
          ? 'Already subscribed'
          : "You're in ✓";
        btn.innerHTML = originalContent;
        btn.disabled = false;
      } else {
        throw new Error('failed');
      }
    } catch {
      btn.innerHTML = originalContent;
      btn.disabled = false;
      input.value = '';
      input.style.outline = '2px solid #ff4444';
      input.placeholder = 'Something went wrong, try again';
      setTimeout(() => {
        input.style.outline = '';
        input.placeholder = 'Your email';
      }, 3000);
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitEmail(type);
  });

  btn.addEventListener('click', () => submitEmail(type));
}

initNewsletterForm('footerNewsletterForm', 'footerEmailInput', 'footerEmailBtn', 'marketing', 'footer-index');
