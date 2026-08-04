import { useEffect, useMemo, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Icon } from './ui';
import { isIOS, isInAppBrowser, isSafari, isStandalone } from '../utils/platform';

const VISITS_KEY = 'clockwrk_pwa_visits';
const COUNTED_KEY = 'clockwrk_pwa_visit_counted';
const DISMISS_KEY = 'clockwrk_pwa_install_dismissed_until';
const SESSION_KEY = 'clockwrk_pwa_prompt_seen';
const DISMISS_DAYS = 14;

function shouldShowPrompt() {
  if (isStandalone()) return false;
  if (sessionStorage.getItem(SESSION_KEY)) return false;
  const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
  if (dismissedUntil > Date.now()) return false;
  return Number(localStorage.getItem(VISITS_KEY) || 0) >= 2;
}

function dismissForNow() {
  localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000));
  sessionStorage.setItem(SESSION_KEY, '1');
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const platform = useMemo(() => {
    const inApp = isInAppBrowser();
    const ios = isIOS();
    return {
      inApp,
      ios,
      iosSafari: ios && isSafari() && !inApp,
      standalone: isStandalone(),
    };
  }, []);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });

  useEffect(() => {
    if (!sessionStorage.getItem(COUNTED_KEY)) {
      localStorage.setItem(VISITS_KEY, String(Number(localStorage.getItem(VISITS_KEY) || 0) + 1));
      sessionStorage.setItem(COUNTED_KEY, '1');
    }

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      if (shouldShowPrompt()) {
        sessionStorage.setItem(SESSION_KEY, '1');
        setVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    if ((platform.inApp || platform.iosSafari) && shouldShowPrompt()) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setVisible(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, [platform.inApp, platform.iosSafari]);

  const close = () => {
    dismissForNow();
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  const copyLink = async () => {
    await navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
  };

  return (
    <>
      {needRefresh && (
        <div className="pwa-update-toast anim-pop">
          <span><Icon.spark /></span>
          <strong>New version available.</strong>
          <button onClick={() => updateServiceWorker(true)}>Reload</button>
        </div>
      )}

      {visible && !platform.standalone && platform.inApp && (
        <section className="install-sheet install-sheet-compact anim-rise">
          <button className="install-close" onClick={close} aria-label="Dismiss install prompt"><Icon.x /></button>
          <span className="install-mark"><Icon.bolt /></span>
          <div>
            <h2>Open in Safari to install</h2>
            <p>Tap <strong>...</strong> in the corner and choose <strong>Open in Safari</strong>. Add to Home Screen is not available inside this browser.</p>
          </div>
          <button onClick={copyLink}>{copied ? 'Copied' : 'Copy link'}</button>
        </section>
      )}

      {visible && !platform.standalone && !platform.inApp && platform.iosSafari && (
        <section className="install-sheet anim-rise">
          <button className="install-close" onClick={close} aria-label="Dismiss install prompt"><Icon.x /></button>
          <span className="install-mark"><Icon.bolt /></span>
          <div>
            <h2>Add Clockwrk to your home screen</h2>
            <ol>
              <li><b>1</b><span>Tap the <strong>Share</strong> button at the bottom of Safari.</span></li>
              <li><b>2</b><span>Scroll down and tap <strong>Add to Home Screen</strong>.</span></li>
              <li><b>3</b><span>Tap <strong>Add</strong>.</span></li>
            </ol>
          </div>
          <span className="install-pointer" aria-hidden="true"><i />Share</span>
          <button onClick={close}>Not now</button>
        </section>
      )}

      {visible && !platform.standalone && !platform.inApp && !platform.iosSafari && deferredPrompt && (
        <section className="install-bar anim-rise">
          <span><Icon.bolt /></span>
          <div><strong>Install Clockwrk</strong><p>Add it to your home screen for one-tap access.</p></div>
          <button onClick={install}>Install</button>
          <button onClick={close}>Not now</button>
        </section>
      )}
    </>
  );
}
