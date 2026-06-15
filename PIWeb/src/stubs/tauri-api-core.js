// Stub — never called in web context. isTauri() is always false in browser.
export function invoke() {
  throw new Error('invoke() called in web context — should never happen');
}
