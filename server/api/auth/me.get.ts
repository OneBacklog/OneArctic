// Reaching this handler means the auth middleware accepted the session
export default defineEventHandler((event) => sendNoContent(event))
