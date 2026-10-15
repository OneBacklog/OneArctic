/** Matches Tailwind's `md` breakpoint: below this the sidebar becomes an overlay. */
export const MOBILE_BREAKPOINT_PX = 768

export const SNACKBAR_DURATION_MS = 3500

export const isMobileViewport = () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT_PX
