'use client'

import { useCallback, useEffect } from 'react'
import { useRouter } from '~/i18n/navigation'
import { getLinkHref } from '~/configs/buildLink'
import { markToolLandingRedirect } from './uploadRedirectBridge'

/** Client transition to home editor (shared layout) — faster than full reload + deferred assign. */
export function useToolLandingNavigation(locale: string) {
  const router = useRouter()

  useEffect(() => {
    try {
      router.prefetch(getLinkHref(locale, ''))
    } catch {
      /* ignore */
    }
  }, [locale, router])

  return useCallback(
    (href: string) => {
      markToolLandingRedirect()
      router.push(href)
    },
    [router]
  )
}
