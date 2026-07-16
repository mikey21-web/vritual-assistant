import { useCallback } from 'react'
import { capture, identify, reset, group } from './posthog'

export function useAnalytics() {
  const track = useCallback((event: string, properties?: Record<string, unknown>) => {
    capture(event, properties)
  }, [])

  const identifyUser = useCallback((userId: string, traits?: Record<string, unknown>) => {
    identify(userId, traits)
  }, [])

  const logout = useCallback(() => {
    reset()
  }, [])

  const setGroup = useCallback((type: string, key: string, properties?: Record<string, unknown>) => {
    group(type, key, properties)
  }, [])

  return { track, identifyUser, logout, setGroup }
}
