'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { getSocketClient } from '@/lib/socket/client';
import type { DocumentOperation } from '@/lib/socket/client';

interface CollaborativeEditorProps {
  documentId: string;
  initialContent: string;
  userId: number;
  username: string;
  onContentChange?: (content: string) => void;
  readOnly?: boolean;
}

interface EditorOperation {
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, any>;
}

export default function CollaborativeEditor({
  documentId,
  initialContent,
  userId,
  username,
  onContentChange,
  readOnly = false,
}: CollaborativeEditorProps) {
  console.log('🔥 EDITOR: CollaborativeEditor component rendered with props:', {
    documentId,
    userId,
    username,
    readOnly,
    initialContentLength: initialContent.length
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [isApplyingRemoteOperation, setIsApplyingRemoteOperation] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Create stable references that won't change between renders
  const socketClient = useMemo(() => {
    console.log('📋 EDITOR: Creating socket client instance...');
    const client = getSocketClient();
    console.log('📋 EDITOR: Socket client created:', !!client);
    return client;
  }, []);
  const userIdString = useMemo(() => userId.toString(), [userId]);
  const stableDocumentId = useMemo(() => documentId, [documentId]);
  const stableUsername = useMemo(() => username, [username]);

  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: initialContent,
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      onContentChange?.(content);
      
      // Only send operations if this is a user edit, not a remote operation being applied
      if (!readOnly && isConnected && !isApplyingRemoteOperation) {
        // Clear any existing debounce timer
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        
        // Debounce the operation sending to prevent excessive API calls
        const newTimer = setTimeout(() => {
          const operation: DocumentOperation = {
            type: 'retain',
            position: 0,
            content: content,
          };
          
          console.log('📝 Sending debounced document operation from user edit:', operation);
          socketClient.sendDocumentOperation(stableDocumentId, operation, currentVersion);
        }, 300); // 300ms debounce
        
        setDebounceTimer(newTimer);
      } else if (isApplyingRemoteOperation) {
        console.log('🚫 Skipping operation send - applying remote operation');
      }
    },
    onSelectionUpdate: ({ editor }) => {
      if (!readOnly && isConnected) {
        const { from, to } = editor.state.selection;
        socketClient.updateCursor(stableDocumentId, {
          position: from,
          selection: from !== to ? { start: from, end: to } : undefined,
        });
      }
    },
  });

  // Socket connection and authentication
  useEffect(() => {
    console.log('🔌 EDITOR: Starting authentication effect...');
    const connect = async () => {
      try {
        console.log('🔌 EDITOR: Starting socket authentication for:', { userId: userIdString, username: stableUsername, documentId: stableDocumentId });
        console.log('🔌 EDITOR: Socket client available:', !!socketClient);
        console.log('🔌 EDITOR: Socket client connected:', socketClient?.isConnected());
        
        // Add delay to ensure socket connection is ready
        console.log('🔌 EDITOR: Waiting 1 second for socket connection...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('🔌 EDITOR: Now attempting authentication...');
        const authenticated = await socketClient.authenticate(userIdString, stableUsername);
        console.log('🔌 EDITOR: Socket authentication result:', authenticated);
        
        // Update connection state immediately based on authentication result
        if (authenticated) {
          console.log('✅ EDITOR: Authentication successful, setting connected state');
          setIsConnected(true);
          console.log('Joining document:', stableDocumentId);
          socketClient.joinDocument(stableDocumentId);
        } else {
          console.warn('⚠️ Socket authentication failed - will retry in 3 seconds');
          // Retry authentication after a delay
          setTimeout(async () => {
            try {
              console.log('🔄 Retrying socket authentication...');
              const retryAuthenticated = await socketClient.authenticate(userIdString, stableUsername);
              if (retryAuthenticated) {
                console.log('✅ Retry authentication successful');
                socketClient.joinDocument(stableDocumentId);
              } else {
                console.error('❌ Retry authentication also failed');
              }
            } catch (retryError) {
              console.error('❌ Retry authentication error:', retryError);
            }
          }, 3000);
        }
      } catch (error) {
        console.error('Failed to authenticate with socket:', error);
      }
    };

    connect();

    // Backup polling mechanism to check authentication status
    const pollInterval = setInterval(() => {
      const isAuth = socketClient.isAuth();
      const isConnectedSocket = socketClient.isConnected();
      console.log('🔍 EDITOR POLL: Checking status - Auth:', isAuth, 'Connected:', isConnectedSocket);
      
      if (isAuth && isConnectedSocket && !isConnected) {
        console.log('✅ EDITOR POLL: Setting connected state to true via polling');
        setIsConnected(true);
      } else if ((!isAuth || !isConnectedSocket) && isConnected) {
        console.log('❌ EDITOR POLL: Setting connected state to false via polling');
        setIsConnected(false);
      }
    }, 2000); // Check every 2 seconds

    return () => {
      clearInterval(pollInterval);
      if (socketClient.isConnected()) {
        console.log('Leaving document:', stableDocumentId);
        socketClient.leaveDocument(stableDocumentId);
      }
    };
  }, [socketClient, stableDocumentId, userIdString, stableUsername, isConnected]);

  // Monitor connection state
  useEffect(() => {
    const handleAuthenticated = (data: { success: boolean }) => {
      console.log('🚀 UI EVENT: Authentication event received!', data);
      console.log('🚀 UI EVENT: Current isConnected state:', isConnected);
      if (data.success) {
        console.log('✅ UI EVENT: Setting connection state to CONNECTED');
        setIsConnected(true);
        console.log('✅ UI EVENT: isConnected state should now be true');
      } else {
        console.log('❌ UI EVENT: Setting connection state to DISCONNECTED');
        setIsConnected(false);
      }
    };

    const handleConnect = () => {
      console.log('📋 Socket.IO connected event');
      // Don't set connected state here, wait for authentication
    };

    const handleDisconnect = () => {
      console.log('📄 Socket.IO disconnected event');
      setIsConnected(false);
    };

    const handleError = (error: any) => {
      console.log('❌ Socket.IO error:', error);
      setIsConnected(false);
    };

    // Listen to socket events
    socketClient.on('authenticated', handleAuthenticated);
    socketClient.on('connect', handleConnect);
    socketClient.on('disconnect', handleDisconnect);
    socketClient.on('error', handleError);

    return () => {
      socketClient.off('authenticated', handleAuthenticated);
      socketClient.off('connect', handleConnect);
      socketClient.off('disconnect', handleDisconnect);
      socketClient.off('error', handleError);
    };
  }, [socketClient]);

  // Socket event listeners
  useEffect(() => {
    if (!isConnected) return;

    const handleDocumentUsers = (users: any[]) => {
      setActiveUsers(users.filter(user => user.userId !== userIdString));
    };

    const handleUserJoined = (user: any) => {
      if (user.userId !== userIdString) {
        setActiveUsers(prev => [...prev.filter(u => u.userId !== user.userId), user]);
      }
    };

    const handleUserLeft = (data: { userId: string }) => {
      if (data.userId !== userIdString) {
        setActiveUsers(prev => prev.filter(u => u.userId !== data.userId));
      }
    };

    const handleDocumentOperation = (data: {
      operation: DocumentOperation;
      userId: string;
      timestamp: number;
    }) => {
      if (data.userId !== userIdString && editor) {
        console.log('📥 Received document operation from user:', data.userId, data.operation);
        
        // Set flag to prevent onUpdate from sending operations while applying remote changes
        setIsApplyingRemoteOperation(true);
        
        try {
          // Apply the operation to the editor
          // This is simplified - in production you'd use proper operational transform
          if (data.operation.type === 'retain' && data.operation.content) {
            console.log('✏️ Applying remote operation to editor');
            editor.commands.setContent(data.operation.content);
          }
          setCurrentVersion(prev => prev + 1);
        } finally {
          // Always reset the flag, even if there's an error
          setTimeout(() => {
            setIsApplyingRemoteOperation(false);
            console.log('✅ Remote operation applied, re-enabling local operations');
          }, 100); // Small delay to ensure the operation is fully processed
        }
      }
    };

    const handleCursorUpdate = (data: {
      userId: string;
      username: string;
      cursor: {
        position: number;
        selection?: { start: number; end: number };
      };
    }) => {
      // Update cursor visualization for other users
      setActiveUsers(prev => 
        prev.map(user => 
          user.userId === data.userId 
            ? { ...user, cursor: data.cursor }
            : user
        )
      );
    };

    socketClient.on('document-users', handleDocumentUsers);
    socketClient.on('user-joined', handleUserJoined);
    socketClient.on('user-left', handleUserLeft);
    socketClient.on('document-operation', handleDocumentOperation);
    socketClient.on('cursor-update', handleCursorUpdate);

    return () => {
      socketClient.off('document-users', handleDocumentUsers);
      socketClient.off('user-joined', handleUserJoined);
      socketClient.off('user-left', handleUserLeft);
      socketClient.off('document-operation', handleDocumentOperation);
      socketClient.off('cursor-update', handleCursorUpdate);
    };
  }, [isConnected, editor, socketClient, userIdString, isApplyingRemoteOperation]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  const formatText = useCallback((format: string) => {
    if (!editor || readOnly) return;

    switch (format) {
      case 'bold':
        editor.chain().focus().toggleBold().run();
        break;
      case 'italic':
        editor.chain().focus().toggleItalic().run();
        break;
      case 'underline':
        editor.chain().focus().toggleUnderline().run();
        break;
      case 'heading1':
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'heading2':
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'bullet-list':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'ordered-list':
        editor.chain().focus().toggleOrderedList().run();
        break;
    }
  }, [editor, readOnly]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="w-full border border-gray-200 rounded-lg overflow-hidden">
      {/* Connection Status & Active Users */}
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        {activeUsers.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-600 mr-2">Active users:</span>
            {activeUsers.map((user, index) => (
              <div
                key={user.userId}
                className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center"
                title={user.username}
              >
                {user.username?.[0]?.toUpperCase() || 'U'}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toolbar */}
      {!readOnly && (
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center gap-1">
          <button
            onClick={() => formatText('bold')}
            className={`px-2 py-1 rounded text-sm font-medium ${
              editor.isActive('bold') 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            B
          </button>
          <button
            onClick={() => formatText('italic')}
            className={`px-2 py-1 rounded text-sm italic ${
              editor.isActive('italic') 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            I
          </button>
          <div className="w-px h-4 bg-gray-300 mx-2" />
          <button
            onClick={() => formatText('heading1')}
            className={`px-2 py-1 rounded text-sm font-bold ${
              editor.isActive('heading', { level: 1 }) 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            H1
          </button>
          <button
            onClick={() => formatText('heading2')}
            className={`px-2 py-1 rounded text-sm font-semibold ${
              editor.isActive('heading', { level: 2 }) 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            H2
          </button>
          <div className="w-px h-4 bg-gray-300 mx-2" />
          <button
            onClick={() => formatText('bullet-list')}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('bulletList') 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            • List
          </button>
          <button
            onClick={() => formatText('ordered-list')}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('orderedList') 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            1. List
          </button>
        </div>
      )}

      {/* Editor Content */}
      <div className="relative">
        <EditorContent 
          editor={editor} 
          className="prose max-w-none p-4 min-h-[400px] focus:outline-none"
        />
        
        {/* Cursor indicators for other users */}
        {activeUsers.map((user) => (
          user.cursor && (
            <div
              key={user.userId}
              className="absolute w-px h-5 bg-blue-500 pointer-events-none"
              style={{
                // This is simplified positioning - in production you'd need proper cursor positioning
                top: '100px',
                left: '20px',
              }}
            >
              <div className="absolute -top-6 -left-1 px-1 py-0.5 bg-blue-500 text-white text-xs rounded whitespace-nowrap">
                {user.username}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}