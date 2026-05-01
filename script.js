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
  const sections = links
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  // Smooth scroll on link click
  links.forEach((link) => {
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

    // Auto-expand navbar when scrolled past logo (Desktop only)
    if (logoStage) {
      const logoObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
              // User scrolled past the logo - expand navbar
              isScrolledPastLogo = true;
              if (!mqMobile.matches) {
                navPill.classList.add("is-expanded");
              }
            } else if (entry.isIntersecting) {
              // Logo is visible again - collapse navbar
              isScrolledPastLogo = false;
              if (!mqMobile.matches) {
                navPill.classList.remove("is-expanded");
              }
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
      const currentScroll = window.pageYOffset;

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
    const summaryTotals = Array.from(pricingShell.querySelectorAll("[data-pricing-summary-total]"));

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

    syncPricingUI();

    // Mobile bottom summary — services-style popup behavior
    const mobileSummary = pricingShell.querySelector(".pricing-mobile-summary");
    const pricingSection = document.getElementById("pricing");
    if (mobileSummary && pricingSection) {
      const mobileSummaryLearn = mobileSummary.querySelector(".pricing-mobile-summary-learn");
      const mobileSummaryClose = mobileSummary.querySelector(".pricing-mobile-summary-close");
      const mobileSummaryDetails = mobileSummary.querySelector(".pricing-mobile-summary-details");
      const mqPricingViewport = window.matchMedia("(max-width: 860px)");
      let pricingMobileActivated = false;
      let pricingMobileShown = false;
      let pricingMobileExpanded = false;
      let pendingPricingExpandAfterScroll = false;
      let pendingPricingExpandTarget = 0;
      let pricingMobileTransitionLockUntil = 0;
      let lastPricingScrollY = window.scrollY;

      const isMobilePricingLayout = () => mqPricingViewport.matches;

      const updatePricingMobileSummaryPosition = () => {
        if (!mobileSummary || !pricingSection || !pricingShell) return;

        if (!isMobilePricingLayout()) {
          mobileSummary.classList.remove("is-visible", "is-docked", "is-expanded");
          mobileSummary.setAttribute("aria-hidden", "true");
          if (mobileSummaryDetails) mobileSummaryDetails.setAttribute("aria-hidden", "true");
          pricingShell.style.setProperty("--pricing-mobile-summary-space", "0px");
          mobileSummary.style.removeProperty("left");
          mobileSummary.style.removeProperty("width");
          mobileSummary.style.removeProperty("top");
          mobileSummary.style.removeProperty("bottom");
          pricingMobileShown = false;
          pricingMobileActivated = false;
          pricingMobileExpanded = false;
          lastPricingScrollY = window.scrollY;
          return;
        }

        const currentScrollY = window.scrollY;
        const scrollingDown = currentScrollY > lastPricingScrollY + 1;
        lastPricingScrollY = currentScrollY;

        if (pendingPricingExpandAfterScroll && Math.abs(currentScrollY - pendingPricingExpandTarget) <= 2) {
          pendingPricingExpandAfterScroll = false;
          pricingMobileExpanded = true;
          mobileSummary.classList.add("is-expanded");
          setTimeout(updatePricingMobileSummaryPosition, 880);
        }

        const sectionRect = pricingSection.getBoundingClientRect();
        const sectionHeight = Math.max(pricingSection.offsetHeight, 1);
        const sectionTop = window.scrollY + sectionRect.top;
        const shellRect = pricingShell.getBoundingClientRect();
        const sectionProgress = ((window.scrollY + window.innerHeight) - sectionTop) / sectionHeight;
        const isAbovePricingSection = sectionRect.top >= window.innerHeight * 0.82;
        const isInPricingViewport = sectionRect.top < window.innerHeight && sectionRect.bottom > 0;

        if (isAbovePricingSection) {
          mobileSummary.classList.remove("is-visible", "is-docked", "is-expanded");
          mobileSummary.setAttribute("aria-hidden", "true");
          if (mobileSummaryDetails) mobileSummaryDetails.setAttribute("aria-hidden", "true");
          pricingShell.style.setProperty("--pricing-mobile-summary-space", "0px");
          mobileSummary.style.left = "0px";
          mobileSummary.style.width = `${window.innerWidth}px`;
          mobileSummary.style.top = "auto";
          mobileSummary.style.bottom = "0px";
          pricingMobileShown = false;
          pricingMobileActivated = false;
          pricingMobileExpanded = false;
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
          mobileSummary.classList.remove("is-visible", "is-docked", "is-expanded");
          mobileSummary.setAttribute("aria-hidden", "true");
          if (mobileSummaryDetails) mobileSummaryDetails.setAttribute("aria-hidden", "true");
          pricingShell.style.setProperty("--pricing-mobile-summary-space", "0px");
          mobileSummary.style.left = "0px";
          mobileSummary.style.width = `${window.innerWidth}px`;
          mobileSummary.style.top = "auto";
          mobileSummary.style.bottom = "0px";
          pricingMobileShown = false;
          pricingMobileExpanded = false;
          pendingPricingExpandAfterScroll = false;
          return;
        }

        mobileSummary.classList.add("is-visible");
        mobileSummary.classList.toggle("is-expanded", pricingMobileExpanded);
        mobileSummary.setAttribute("aria-hidden", "false");
        if (mobileSummaryDetails) {
          mobileSummaryDetails.setAttribute("aria-hidden", String(!pricingMobileExpanded));
        }
        pricingMobileShown = true;

        const summaryHeight = mobileSummary.offsetHeight;
        const reservedSpace = summaryHeight;
        const bottomOffset = 0;
        const floatingTop = window.innerHeight - bottomOffset - summaryHeight;
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

      function animateSummaryExpand() {
        const doExpand = () => {
          pricingMobileTransitionLockUntil = Date.now() + 1100;
          pricingMobileActivated = true;
          pricingMobileExpanded = true;
          mobileSummary.classList.add("is-expanded");
          updatePricingMobileSummaryPosition();
          setTimeout(updatePricingMobileSummaryPosition, 880);
        };

        const sectionRect = pricingSection.getBoundingClientRect();
        const sectionTop = window.scrollY + sectionRect.top;
        const sectionBottom = sectionTop + pricingSection.offsetHeight;
        const dockScrollTarget = Math.max(0, sectionBottom - window.innerHeight - 318);
        const isPastSectionEnd = window.scrollY > dockScrollTarget + 1;

        if (isPastSectionEnd) {
          pendingPricingExpandAfterScroll = true;
          pendingPricingExpandTarget = dockScrollTarget;
          window.scrollTo({ top: dockScrollTarget, behavior: "smooth" });
        } else {
          doExpand();
        }
      }

      function animateSummaryCollapse() {
        pricingMobileTransitionLockUntil = Date.now() + 1100;
        pricingMobileActivated = true;
        pricingMobileExpanded = false;
        mobileSummary.classList.remove("is-expanded");
        requestAnimationFrame(updatePricingMobileSummaryPosition);
        setTimeout(updatePricingMobileSummaryPosition, 880);
      }

      if (mobileSummaryLearn) {
        mobileSummaryLearn.addEventListener("click", animateSummaryExpand);
      }

      if (mobileSummaryClose) {
        mobileSummaryClose.addEventListener("click", animateSummaryCollapse);
      }

      updatePricingMobileSummaryPosition();
    }
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
      const desc = btn.dataset.tooltipDesc || "";
      if (!desc) return;
      serviceInfoTooltip.querySelector(".services-drop-tooltip-desc").textContent = desc;
      serviceInfoTooltip.classList.add("is-visible");
      _tooltipActiveBtn = btn;
      positionServiceInfoTooltip(btn);
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
  // 8) Discovery Card — complete animation cycle on hover
  //    Panels slide + green circle + ring draw = ~1.1s total.
  //    Class stays active until full cycle finishes so mouse-out
  //    mid-animation doesn't cut it short.
  // ---------------------------------------------------------
  const discoveryCard = document.querySelector(".process-visual-people")
    ?.closest(".process-card");

  if (discoveryCard) {
    const ANIM_DURATION = 1600; // ms — covers full forward animation (ring 0.45+0.65s + checkmark 1.1+0.45s = ~1.55s)
    const HOLD_AFTER_COMPLETE_MS = 500;
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
  const feedbackClientPortraits = feedbackSection
    ? Array.from(feedbackSection.querySelectorAll(".feedback-reveal-avatar"))
    : [];

  if (feedbackSection && feedbackSlidesEl) {
    let fbMaxTranslate = 0;

    function setFeedbackActiveClient(index) {
      if (!feedbackClientPortraits.length) {
        return;
      }

      const activeIndex = index % feedbackClientPortraits.length;
      feedbackClientPortraits.forEach((portrait, portraitIndex) => {
        const isActive = portraitIndex === activeIndex;
        portrait.classList.toggle("is-active", isActive);
        portrait.style.setProperty("--timer-progress", "0deg");
      });
    }

    function setFeedbackHeight() {
      fbMaxTranslate = Math.max(0, feedbackSlidesEl.scrollWidth - window.innerWidth);
      feedbackSection.style.height = `${window.innerHeight + fbMaxTranslate}px`;
    }

    function updateFeedbackScroll() {
      const sectionRect = feedbackSection.getBoundingClientRect();
      const sectionTop = sectionRect.top;
      const totalProgress = Math.max(0, Math.min(-sectionTop, fbMaxTranslate));

      feedbackSlidesEl.style.transform = `translateX(-${totalProgress}px)`;
    }

    setFeedbackActiveClient(0);
    setFeedbackHeight();
    window.addEventListener("resize", () => {
      setFeedbackHeight();
      updateFeedbackScroll();
    });
    window.addEventListener("scroll", updateFeedbackScroll, { passive: true });
    updateFeedbackScroll();
  }

})();
