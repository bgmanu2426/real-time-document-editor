'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export default function SocketTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `${timestamp}: ${message}`;
    setLogs(prev => [...prev, logMessage]);
    console.log(logMessage);
  };

  useEffect(() => {
    addLog('🚀 Socket test page loaded');
    addLog('🌐 Connecting to: ' + window.location.origin);

    const socketInstance = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });

    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      addLog('✅ Connected! Socket ID: ' + socketInstance.id);
      setConnected(true);
      
      // Test authentication
      socketInstance.emit('authenticate', { userId: '999', username: 'test-user' });
      addLog('📤 Authentication request sent');
    });

    socketInstance.on('authenticated', (data: any) => {
      addLog('🔐 Authentication response: ' + JSON.stringify(data));
    });

    socketInstance.on('disconnect', (reason: string) => {
      addLog('❌ Disconnected: ' + reason);
      setConnected(false);
    });

    socketInstance.on('connect_error', (error: any) => {
      addLog('🚨 Connection Error: ' + error.message);
      setConnected(false);
    });

    addLog('📡 Socket instance created');

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Socket.IO Connection Test</h1>
      
      <div className="mb-4">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
          connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          {connected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg h-96 overflow-y-auto">
        <h2 className="font-semibold mb-2">Debug Logs:</h2>
        {logs.map((log, index) => (
          <div key={index} className="text-sm font-mono mb-1">
            {log}
          </div>
        ))}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>This page tests the Socket.IO connection directly without the collaborative editor complexity.</p>
        <p>Open browser console for additional debug information.</p>
      </div>
    </div>
  );
}