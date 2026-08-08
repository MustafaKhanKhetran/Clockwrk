export function isIOS(userAgent = navigator.userAgent) {
  return /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isInAppBrowser(userAgent = navigator.userAgent) {
  return /FBAN|FBAV|Instagram|Line|WhatsApp|LinkedIn|Twitter|GSA|CriOS.*GSA|Gmail/i.test(userAgent) || (isIOS(userAgent) && !/Safari/i.test(userAgent));
}

export function isSafari(userAgent = navigator.userAgent) {
  return /Safari/i.test(userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS|OPiOS|Instagram|FBAN|FBAV|Line|WhatsApp|LinkedIn|Twitter|GSA|Gmail/i.test(userAgent);
}

export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
