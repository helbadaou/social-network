'use client'
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

// 1. Create the context
const SharedWorkerContext = createContext(null);

// 2. Provider component to wrap your app
export function SharedWorkerProvider({ children }) {
  const workerRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Initialize the SharedWorker
    workerRef.current = new SharedWorker('/sharedWorker.js');
    const { port } = workerRef.current;
    port.start();

    // Listen for incoming messages
    const handleMessage = event => {
      setMessages(prev => [...prev, event.data]);
    };
    port.addEventListener('message', handleMessage);

    // Optional: handle errors
    port.addEventListener('error', err => {
      console.error('SharedWorker port error:', err);
    });

    // Optionally send an init handshake
    port.postMessage({ type: 'INIT' });
    setIsConnected(true);

    return () => {
      port.removeEventListener('message', handleMessage);
      port.close();
      setIsConnected(false);
    };
  }, []);

  // Function for components to send data
  const sendMessage = payload => {
    if (!workerRef.current) {
      console.error('Worker not initialized');
      return;
    }
    workerRef.current.port.postMessage(payload);
  };

  return (
    <SharedWorkerContext.Provider value={{ isConnected, messages, sendMessage }}>
      {children}
    </SharedWorkerContext.Provider>
  );
}

// 3. Hook to consume context
export function useSharedWorker() {
  const ctx = useContext(SharedWorkerContext);
  if (!ctx) {
    throw new Error('useSharedWorker must be inside SharedWorkerProvider');
  }
  return ctx;
}
