// Thin wrapper around otpauth so route handlers don't repeat the config.
// SHA1/6 digits/30s is what all authenticator apps assume by default.

import { TOTP, Secret } from 'otpauth';

const ISSUER = 'Clockwrk';

export function totpFor(email: string, base32Secret: string) {
  return new TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(base32Secret),
  });
}

export function generateSecret() {
  return new Secret({ size: 20 });
}

export function provisioningUri(email: string, secret: Secret) {
  return new TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  }).toString();
}
