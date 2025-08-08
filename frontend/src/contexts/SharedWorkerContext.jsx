// src/contexts/SharedWorkerContext.jsx
'use client'
import { createContext, useContext, useState, useEffect, useRef } from 'react'

const SharedWorkerContext = createContext()

export function SharedWorkerProvider({ children }) {
  const workerRef = useRef(null)
  const [workerMessages, setWorkerMessages] = useState([])

  useEffect(() => {
    workerRef.current = new SharedWorker('/sharedWorker.js')
    const { port } = workerRef.current
    port.start()

    const handleMessage = (event) => {
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