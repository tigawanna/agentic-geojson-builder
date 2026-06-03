let tokenInvalid = false;
const listeners = new Set<() => void>();

export function getMapboxTokenInvalid(): boolean {
  return tokenInvalid;
}

export function setMapboxTokenInvalid(invalid: boolean): void {
  if (tokenInvalid === invalid) {
    return;
  }
  tokenInvalid = invalid;
  for (const listener of listeners) {
    listener();
  }
}

export function clearMapboxTokenInvalid(): void {
  setMapboxTokenInvalid(false);
}

export function subscribeMapboxTokenInvalid(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
