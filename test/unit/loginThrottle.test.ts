import { beforeEach, describe, expect, it, vi } from 'vitest'

type Throttle = typeof import('../../server/utils/loginThrottle')
let throttle: Throttle

// The throttle keeps module-level state, so load a fresh copy for every test
beforeEach(async () => {
  vi.resetModules()
  throttle = await import('../../server/utils/loginThrottle')
})

describe('loginThrottle', () => {
  it('allows three free attempts, then backs off exponentially', () => {
    const now = 1_000_000
    expect(throttle.recordLoginFailure('a', now)).toEqual({ wait: 0, attemptsLeft: 2 })
    expect(throttle.recordLoginFailure('a', now)).toEqual({ wait: 0, attemptsLeft: 1 })
    expect(throttle.recordLoginFailure('a', now)).toEqual({ wait: 0, attemptsLeft: 0 })
    expect(throttle.recordLoginFailure('a', now).wait).toBe(1)
    expect(throttle.recordLoginFailure('a', now).wait).toBe(2)
    expect(throttle.recordLoginFailure('a', now).wait).toBe(4)
  })

  it('caps the delay at five minutes', () => {
    let wait = 0
    for (let i = 0; i < 20; i++) wait = throttle.recordLoginFailure('a', i).wait
    expect(wait).toBeLessThanOrEqual(5 * 60)
  })

  it('does not block other clients', () => {
    for (let i = 0; i < 6; i++) throttle.recordLoginFailure('attacker', 0)
    expect(throttle.getLoginWait('attacker', 0)).toBeGreaterThan(0)
    expect(throttle.getLoginWait('owner', 0)).toBe(0)
  })

  it('applies a global ceiling when failures come from many addresses', () => {
    for (let i = 0; i < 30; i++) throttle.recordLoginFailure(`client-${i}`, 0)
    expect(throttle.getLoginWait('owner', 0)).toBeGreaterThan(0)
    expect(throttle.getLoginWait('owner', 11 * 60 * 1000)).toBe(0)
  })

  it('clears a client after a successful login', () => {
    for (let i = 0; i < 5; i++) throttle.recordLoginFailure('a', 0)
    throttle.recordLoginSuccess('a')
    expect(throttle.getLoginWait('a', 0)).toBe(0)
  })
})
