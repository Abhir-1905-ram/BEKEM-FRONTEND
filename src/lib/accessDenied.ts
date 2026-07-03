const ACCESS_DENIED_KEY = 'bekem-access-denied';

export function markAccessDenied() {
  sessionStorage.setItem(ACCESS_DENIED_KEY, '1');
}

export function consumeAccessDenied(): boolean {
  const flagged = sessionStorage.getItem(ACCESS_DENIED_KEY) === '1';
  if (flagged) sessionStorage.removeItem(ACCESS_DENIED_KEY);
  return flagged;
}
