// In-memory brute-force protection for the single-user login (resets on restart).
//
// Each client gets an exponentially growing delay after failed attempts, so one attacker
// only slows themselves down. A global ceiling bounds guessing even if an attacker rotates
// addresses; it only applies while failures keep arriving and expires on its own.

const BASE_DELAY_SECONDS = 1
const MAX_DELAY_SECONDS = 5 * 60
const FREE_ATTEMPTS = 3
const GLOBAL_WINDOW_MS = 10 * 60 * 1000
const GLOBAL_MAX_FAILURES = 30
const MAX_TRACKED_CLIENTS = 1000

interface ClientState {
  failures: number
  blockedUntil: number
}

const clients = new Map<string, ClientState>()
let globalFailures: number[] = []

function pruneGlobal(now: number) {
  globalFailures = globalFailures.filter((t) => now - t < GLOBAL_WINDOW_MS)
}

/** Seconds the client must wait before trying again, or 0 if it may try now. */
export function getLoginWait(clientKey: string, now = Date.now()): number {
  pruneGlobal(now)
  const client = clients.get(clientKey)
  const clientWait = client ? client.blockedUntil - now : 0
  const globalWait = globalFailures.length >= GLOBAL_MAX_FAILURES
    ? globalFailures[0]! + GLOBAL_WINDOW_MS - now
    : 0
  return Math.max(0, Math.ceil(Math.max(clientWait, globalWait) / 1000))
}

/** Record a failed attempt; returns the wait (seconds) before the next try and the free attempts left. */
export function recordLoginFailure(clientKey: string, now = Date.now()): { wait: number; attemptsLeft: number } {
  globalFailures.push(now)
  if (!clients.has(clientKey) && clients.size >= MAX_TRACKED_CLIENTS) {
    clients.delete(clients.keys().next().value!)
  }
  const client = clients.get(clientKey) ?? { failures: 0, blockedUntil: 0 }
  client.failures++
  const over = client.failures - FREE_ATTEMPTS
  const delay = over > 0 ? Math.min(BASE_DELAY_SECONDS * 2 ** (over - 1), MAX_DELAY_SECONDS) : 0
  client.blockedUntil = now + delay * 1000
  clients.set(clientKey, client)
  return { wait: getLoginWait(clientKey, now), attemptsLeft: Math.max(0, -over) }
}

export function recordLoginSuccess(clientKey: string) {
  clients.delete(clientKey)
}
