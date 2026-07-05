export function newIdempotencyKey(scope: string): string {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${scope}-${id}`;
}

export function idempotencyHeaders(key: string): Record<string, string> {
  return { 'Idempotency-Key': key };
}
