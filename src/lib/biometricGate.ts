/**
 * Client-side biometric confirmation before sensitive mobile actions.
 * Uses WebAuthn platform authenticator when available; falls back to confirm dialog.
 */
export async function requireBiometricConfirm(actionLabel: string): Promise<boolean> {
  if (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  ) {
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (available) {
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);
        await navigator.credentials.get({
          publicKey: {
            challenge,
            rpId: window.location.hostname,
            allowCredentials: [],
            userVerification: 'required',
            timeout: 60000,
          },
        });
        return true;
      }
    } catch {
      return false;
    }
  }

  return window.confirm(`${actionLabel}\n\nConfirm this action?`);
}
