import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'

export function initPostHog() {
  if (typeof window === 'undefined') return
  if (!POSTHOG_KEY || POSTHOG_KEY === 'phc_placeholder') return

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: true,
    session_recording: { maskAllInputs: false },
    autocapture: true,
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.opt_out_capturing()
    },
  })
}

export function capture(event: string, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY || POSTHOG_KEY === 'phc_placeholder') return
  posthog.capture(event, properties)
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  if (!POSTHOG_KEY || POSTHOG_KEY === 'phc_placeholder') return
  posthog.identify(userId, traits)
}

export function reset() {
  if (!POSTHOG_KEY || POSTHOG_KEY === 'phc_placeholder') return
  posthog.reset()
}

export function group(type: string, key: string, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY || POSTHOG_KEY === 'phc_placeholder') return
  posthog.group(type, key, properties)
}

export default posthog
