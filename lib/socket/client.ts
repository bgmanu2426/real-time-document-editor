'use client';

import { io, Socket } from 'socket.io-client';

export interface DocumentUser {
  userId: string;
  username: string;
  cursor?: {
    position: number;
    selection?: {
      start: number;
      end: number;
    };
  };
}

export interface DocumentOperation {
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, any>;
}

export interface SocketEvents {
  // Connection events
  connect: () => void;
  disconnect: (reason: string) => void;
  
  // Authentication
  authenticated: (data: { success: boolean }) => void;
  
  // Document collaboration
  'document-users': (users: DocumentUser[]) => void;
  'user-joined': (user: DocumentUser) => void;
  'user-left': (data: { userId: string }) => void;
  
  // Real-time operations
  'document-operation': (data: {
    operation: DocumentOperation;
    userId: string;
    timestamp: number;
  }) => void;
  
  // Cursor tracking
  'cursor-update': (data: {
    userId: string;
    username: string;
    cursor: {
      position: number;
      selection?: { start: number; end: number };
      domPosition?: { top: number; left: number; height: number };
      relativePosition?: { top: number; left: number; height: number; contentOffsetTop?: number; contentOffsetLeft?: number; scrollTop?: number; scrollLeft?: number };
    };
  }) => void;
  
  // Version control
  'branch-created': (branch: any) => void;
  'branch-merged': (result: any) => void;
  'merge-conflict': (data: { error: string; conflicts: any[] }) => void;
  
  // Title updates
  'title-updated': (data: { title: string; userId: string; timestamp: number }) => void;
  'title-update-error': (data: { error: string }) => void;
  
  // Errors
  error: (data: { message: string }) => void;
}

export class CollaborativeSocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private isAuthenticated = false;
  private currentDocumentId: string | null = null;

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    if (typeof window === 'undefined') return; // Server-side check

    // Use the current window location origin for Clacky environment compatibility
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
    
    console.log('🚀 SOCKET INIT: Connecting to:', baseUrl);
    console.log('🚀 SOCKET INIT: Environment details:', {
      isClient: typeof window !== 'undefined',
      windowOrigin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
      envUrl: process.env.NEXT_PUBLIC_BASE_URL
    });
    
    this.socket = io(baseUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 5,
      withCredentials: true,
      autoConnect: true
    });

    console.log('✅ SOCKET INIT: Socket instance created successfully');
    console.log('✅ SOCKET INIT: Socket connected status:', this.socket?.connected);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connected to collaborative server');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from collaborative server:', reason);
      this.isAuthenticated = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔥 Socket.IO connection error:', error.message);
      console.error('🔥 Error details:', {
        description: error.description,
        context: error.context,
        type: error.type
      });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected to server after', attemptNumber, 'attempts');
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Attempting to reconnect... attempt #', attemptNumber);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Reconnection failed:', error.message);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect after maximum attempts');
    });

    this.socket.on('authenticated', (data: { success: boolean }) => {
      this.isAuthenticated = data.success;
      console.log('🔐 Authentication:', this.isAuthenticated ? 'success' : 'failed');
    });

    // Set up dynamic event listeners
    const eventTypes: (keyof SocketEvents)[] = [
      'authenticated',
      'document-users',
      'user-joined', 
      'user-left',
      'document-operation',
      'cursor-update',
      'branch-created',
      'branch-merged',
      'merge-conflict',
      'title-updated',
      'title-update-error',
      'error'
    ];

    eventTypes.forEach(eventType => {
      this.socket!.on(eventType, (...args: any[]) => {
        const listeners = this.listeners.get(eventType) || [];
        listeners.forEach(listener => listener(...args));
      });
    });
  }

  // Authentication
  authenticate(userId: string, username: string): Promise<boolean> {
    return new Promise((resolve) => {
      console.log('🔐 AUTHENTICATE: Starting authentication...');
      console.log('🔐 AUTHENTICATE: User details:', { userId, username });
      console.log('🔐 AUTHENTICATE: Socket available:', !!this.socket);
      console.log('🔐 AUTHENTICATE: Socket connected:', this.socket?.connected);
      
      if (!this.socket) {
        console.log('❌ AUTHENTICATE: No socket available');
        resolve(false);
        return;
      }

      const attemptAuthentication = () => {
        this.socket!.emit('authenticate', { userId, username });
        
        const timeout = setTimeout(() => {
          console.log('⏰ Authentication timeout');
          this.socket!.off('authenticated', handleAuth);
          resolve(false);
        }, 5000);

        // Use direct socket listener for one-time authentication
        const handleAuth = (data: { success: boolean }) => {
          console.log('✅ Authentication successful');
          clearTimeout(timeout);
          this.socket!.off('authenticated', handleAuth);
          this.isAuthenticated = data.success;
          resolve(data.success);
        };

        this.socket!.on('authenticated', handleAuth);
      };

      if (this.socket.connected) {
        attemptAuthentication();
      } else {
        console.log('🔄 Waiting for connection...');
        const connectHandler = () => {
          console.log('✅ Socket connected');
          this.socket!.off('connect', connectHandler);
          attemptAuthentication();
        };
        
        const errorHandler = (error: any) => {
          console.log('❌ Connection error:', error);
          this.socket!.off('connect', connectHandler);
          this.socket!.off('error', errorHandler);
          resolve(false);
        };
        
        this.socket.on('connect', connectHandler);
        this.socket.on('error', errorHandler);
        
        // Also set a timeout for connection
        setTimeout(() => {
          if (!this.socket?.connected) {
            console.log('⏰ Connection timeout');
            this.socket?.off('connect', connectHandler);
            this.socket?.off('error', errorHandler);
            resolve(false);
          }
        }, 10000);
      }
    });
  }

  // Document collaboration
  joinDocument(documentId: string) {
    if (!this.socket || !this.isAuthenticated) {
      throw new Error('Socket not connected or not authenticated');
    }

    this.currentDocumentId = documentId;
    this.socket.emit('join-document', documentId);
  }

  leaveDocument(documentId: string) {
    if (!this.socket) return;

    this.socket.emit('leave-document', documentId);
    this.currentDocumentId = null;
  }

  // Real-time operations
  sendDocumentOperation(documentId: string, operation: DocumentOperation, version: number) {
    if (!this.socket || !this.isAuthenticated) return;

    this.socket.emit('document-operation', {
      documentId,
      operation,
      version
    });
  }

  // Cursor tracking
  updateCursor(documentId: string, cursor: {
    position: number;
    selection?: { start: number; end: number };
    domPosition?: { top: number; left: number; height: number };
    relativePosition?: { top: number; left: number; height: number; contentOffsetTop?: number; contentOffsetLeft?: number; scrollTop?: number; scrollLeft?: number };
  }) {
    if (!this.socket || !this.isAuthenticated) return;

    this.socket.emit('cursor-update', {
      documentId,
      cursor
    });
  }

  // Version control
  createBranch(documentId: string, branchName: string, fromVersion?: number) {
    if (!this.socket || !this.isAuthenticated) return;

    this.socket.emit('create-branch', {
      documentId,
      branchName,
      fromVersion
    });
  }

  mergeBranch(documentId: string, sourceBranch: string, targetBranch: string) {
    if (!this.socket || !this.isAuthenticated) return;

    this.socket.emit('merge-branch', {
      documentId,
      sourceBranch,
      targetBranch
    });
  }

  // Document title updates
  updateDocumentTitle(documentId: string, title: string) {
    if (!this.socket || !this.isAuthenticated) {
      console.warn('Cannot update title: Socket not connected or not authenticated');
      return;
    }

    this.socket.emit('title-update', {
      documentId,
      title
    });
  }

  // Event listeners
  on<K extends keyof SocketEvents>(event: K, listener: SocketEvents[K]) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener as Function);
  }

  off<K extends keyof SocketEvents>(event: K, listener: SocketEvents[K]) {
    const listeners = this.listeners.get(event) || [];
    const index = listeners.indexOf(listener as Function);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  isAuth(): boolean {
    return this.isAuthenticated;
  }

  getCurrentDocumentId(): string | null {
    return this.currentDocumentId;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isAuthenticated = false;
    this.currentDocumentId = null;
    this.listeners.clear();
  }
}

// Singleton instance
let socketClient: CollaborativeSocketClient | null = null;

export function getSocketClient(): CollaborativeSocketClient {
  if (!socketClient) {
    socketClient = new CollaborativeSocketClient();
  }
  return socketClient;
}

export default CollaborativeSocketClient;