'use client'

import { useEffect } from 'react'

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://social-network-backend-helbadao.fly.dev').replace(/\/+$/, '')
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss://social-network-backend-helbadao.fly.dev/ws'

function rewriteUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return rawUrl

  if (rawUrl.startsWith('http://localhost:8080')) {
    return rawUrl.replace('http://localhost:8080', API_BASE_URL)
  }

  if (rawUrl.startsWith('ws://localhost:8080/ws')) {
    return rawUrl.replace('ws://localhost:8080/ws', WS_URL)
  }

  return rawUrl
}

export function EndpointRuntimePatch() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!window.__endpointRuntimePatched) {
      const originalFetch = window.fetch.bind(window)

      window.fetch = (input, init) => {
        if (typeof input === 'string') {
          return originalFetch(rewriteUrl(input), init)
        }

        if (input instanceof Request) {
          const nextUrl = rewriteUrl(input.url)
          if (nextUrl !== input.url) {
            const cloned = new Request(nextUrl, input)
            return originalFetch(cloned, init)
          }
        }

        return originalFetch(input, init)
      }

      const OriginalWebSocket = window.WebSocket
      class PatchedWebSocket extends OriginalWebSocket {
        constructor(url, protocols) {
          const nextUrl = rewriteUrl(typeof url === 'string' ? url : String(url))
          super(nextUrl, protocols)
        }
      }
      window.WebSocket = PatchedWebSocket

      window.__endpointRuntimePatched = true
    }
  }, [])

  return null
}
