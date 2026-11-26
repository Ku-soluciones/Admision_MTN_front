/**
 * A bootstrap refresh may finish after Firebase has already restored a valid
 * BFF session. Only the request that still owns the original state snapshot
 * may clear it after failing.
 */
export function shouldClearAfterBootstrapFailure(
  stateAtStart: object,
  currentState: object,
): boolean {
  return stateAtStart === currentState;
}

export function shouldApplyBootstrapResult(
  stateAtStart: object,
  currentState: object,
): boolean {
  return stateAtStart === currentState;
}
