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
    if (mqMobile.addEventListener) {
      mqMobile.addEventListener("change", setViewportMode);
    } else {
      // Safari fallback
      mqMobile.addListener(setViewportMode);
    }

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

  if (mobileMenuBtn && mobileMenu) {
    // Toggle menu on button click
    mobileMenuBtn.addEventListener("click", () => {
      const isOpen = mobileMenuBtn.classList.contains("is-open");

      if (isOpen) {
        // Close menu
        mobileMenuBtn.classList.remove("is-open");
        mobileMenu.classList.remove("is-open");
        mobileMenuBtn.setAttribute("aria-label", "Open menu");
      } else {
        // Open menu
        mobileMenuBtn.classList.add("is-open");
        mobileMenu.classList.add("is-open");
        mobileMenuBtn.setAttribute("aria-label", "Close menu");
      }
    });

    // Close menu when a link is clicked
    mobileMenuLinks.forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenuBtn.classList.remove("is-open");
        mobileMenu.classList.remove("is-open");
        mobileMenuBtn.setAttribute("aria-label", "Open menu");
      });
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (
        !mobileMenu.contains(e.target) &&
        !mobileMenuBtn.contains(e.target) &&
        mobileMenu.classList.contains("is-open")
      ) {
        mobileMenuBtn.classList.remove("is-open");
        mobileMenu.classList.remove("is-open");
        mobileMenuBtn.setAttribute("aria-label", "Open menu");
      }
    });
  }

  // ---------------------------------------------------------
  // 5) Scroll-based Navbar Shadow (Optional Enhancement)
  // ---------------------------------------------------------
  let lastScroll = 0;

  window.addEventListener(
    "scroll",
    () => {
      const currentScroll = window.pageYOffset;

      if (navPill) {
        // Add extra shadow when scrolled
        if (currentScroll > 100) {
          navPill.style.boxShadow = "0 18px 55px rgba(0, 0, 0, 0.15)";
        } else {
          navPill.style.boxShadow = "";
        }
      }

      lastScroll = currentScroll;
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
})();
