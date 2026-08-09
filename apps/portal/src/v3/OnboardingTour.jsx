import { useCallback, useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { store, useStore } from '../store';

export const ONBOARDING_VERSION = 1;
export const RESTART_ONBOARDING_EVENT = 'clockwrk:restart-onboarding';

function navTarget(name) {
  const mobile = window.matchMedia('(max-width: 760px)').matches;
  return `[data-tour="${mobile ? 'mobile-' : ''}${name}"]`;
}

export default function OnboardingTour() {
  const { account, dataSource, projects } = useStore();
  const tour = useRef(null);
  const startedAutomatically = useRef(false);
  const completing = useRef(false);

  const complete = useCallback(async () => {
    if (completing.current) return;
    completing.current = true;
    try { await store.completeOnboarding(ONBOARDING_VERSION); } catch { /* tour never blocks the portal */ }
    completing.current = false;
  }, []);

  const start = useCallback(() => {
    tour.current?.destroy();
    const hasProjects = projects.length > 0;
    const steps = [
      {
        element: '[data-tour="workspace-home"]',
        popover: {
          title: hasProjects ? 'Your workspace, at a glance' : 'Start with one workspace',
          description: hasProjects
            ? 'See what is moving, what needs your decision, and what starts next.'
            : 'Create your first project to keep its requests, files, and conversations together.',
          side: 'bottom', align: 'start',
        },
      },
      {
        element: window.matchMedia('(max-width: 760px)').matches ? '[data-tour="mobile-create"]' : '[data-tour="create-primary"]',
        popover: {
          title: hasProjects ? 'Send work when you are ready' : 'Create your first project',
          description: hasProjects
            ? 'Create a request or open another project from this menu.'
            : 'This is the first useful step. You can add a request as soon as the project exists.',
          side: 'bottom', align: 'end',
        },
      },
      {
        element: navTarget('requests'),
        popover: {
          title: 'The production board',
          description: 'Follow building, review, queue, and shipped work. Queue order is shared with the team.',
          side: 'bottom', align: 'center',
        },
      },
      {
        element: navTarget('projects'),
        popover: {
          title: 'Everything stays connected',
          description: 'Each project holds its context, requests, conversations, links, and delivered files.',
          side: 'bottom', align: 'center',
        },
      },
      {
        element: navTarget('deliverables'),
        popover: {
          title: 'Final work, easy to find',
          description: 'Browse every delivery with its project, request, version, and date attached.',
          side: 'bottom', align: 'center',
        },
      },
      {
        element: window.matchMedia('(max-width: 760px)').matches ? '[data-tour="mobile-account"]' : '[data-tour="account-primary"]',
        popover: {
          title: 'Billing, help, and settings',
          description: 'Manage your account, restart this guide, or contact the team at any time.',
          side: 'bottom', align: 'end', doneBtnText: 'Enter workspace',
        },
      },
    ];

    tour.current = driver({
      steps,
      animate: true,
      duration: 360,
      smoothScroll: true,
      allowClose: true,
      allowScroll: true,
      allowKeyboardControl: true,
      skipMissingElement: true,
      waitForElement: 1200,
      disableActiveInteraction: false,
      overlayColor: '#10110f',
      overlayOpacity: 0.36,
      stagePadding: 7,
      stageRadius: 18,
      showProgress: true,
      progressText: '{{current}} of {{total}}',
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Enter workspace',
      popoverClass: 'clockwrk-tour',
      onDestroyed: complete,
    });
    tour.current.drive();
  }, [complete, projects.length]);

  useEffect(() => {
    if (dataSource !== 'server' || !account || startedAutomatically.current) return;
    if (Number(account.portal_onboarding_version || 0) >= ONBOARDING_VERSION) return;
    startedAutomatically.current = true;
    const timer = window.setTimeout(start, 500);
    return () => window.clearTimeout(timer);
  }, [account, dataSource, start]);

  useEffect(() => {
    const restart = () => start();
    window.addEventListener(RESTART_ONBOARDING_EVENT, restart);
    return () => {
      window.removeEventListener(RESTART_ONBOARDING_EVENT, restart);
      tour.current?.destroy();
    };
  }, [start]);

  return null;
}
