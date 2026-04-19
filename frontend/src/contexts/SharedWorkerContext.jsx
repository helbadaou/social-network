// src/contexts/SharedWorkerContext.jsx
'use client'
import { createContext, useContext, useState, useEffect, useRef } from 'react'

const SharedWorkerContext = createContext()

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'

export function SharedWorkerProvider({ children }) {
  const workerRef = useRef(null)
  const [workerMessages, setWorkerMessages] = useState([])

  useEffect(() => {
    workerRef.current = new SharedWorker(`/sharedWorker.jsx?apiBase=${encodeURIComponent(apiBaseUrl)}`)
    const { port } = workerRef.current
    port.start()

    const handleMessage = (event) => {
      //console.log("event hhhhh", event.data);
      
      setWorkerMessages(prev => [...prev, event.data])
    }

    port.addEventListener('message', handleMessage)
    
    return () => {
      port.removeEventListener('message', handleMessage)
      port.close()
    }
  }, [])

  const sendWorkerMessage = (payload) => {
    workerRef.current?.port.postMessage(payload)
  }

  return (
    <SharedWorkerContext.Provider value={{
      worker: workerRef.current,
      workerMessages,
      sendWorkerMessage
    }}>
      {children}
    </SharedWorkerContext.Provider>
  )
}

export function useSharedWorker() {
  return useContext(SharedWorkerContext)
}