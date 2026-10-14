import { useEffect, useRef } from "react"
import { useAuthStore } from "./auth.store"
import { refreshApi } from "./auth.api"

// Restores the session on app start; call once at the root
export function useSilentRefresh() {
  const { setAuth, clearAuth, setLoading } = useAuthStore()
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    setLoading(true)
    refreshApi()
      .then(({ accessToken, user }) => {
        setAuth(accessToken, user)
      })
      .catch(() => {
        clearAuth() // no session: stay signed out
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])
}
