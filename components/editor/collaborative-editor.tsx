'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { FontSize } from '@tiptap/extension-font-size';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import Strike from '@tiptap/extension-strike';
import Link from '@tiptap/extension-link';
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
  autoSaveEnabled?: boolean;
  onAutoSaveToggle?: (enabled: boolean) => void;
  onManualSave?: () => void;
  onTitleUpdate?: (title: string) => void;
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
  autoSaveEnabled = true,
  onAutoSaveToggle,
  onManualSave,
  onTitleUpdate,
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
  const [lastLocalContent, setLastLocalContent] = useState(initialContent);
  const [cursorThrottleTimer, setCursorThrottleTimer] = useState<NodeJS.Timeout | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('Inter');
  

  
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
      StarterKit.configure({
        // Disable built-in list extensions to avoid conflicts
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      Underline,
      Strike,
      Superscript,
      Subscript,
      TextStyle,
      Color.configure({ types: [TextStyle.name] }),
      FontFamily.configure({
        types: [TextStyle.name],
      }),
      FontSize.configure({
        types: [TextStyle.name],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: 'my-bullet-list',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'my-ordered-list',
        },
      }),
      ListItem.configure({
        HTMLAttributes: {
          class: 'my-list-item',
        },
      }),
    ],
    content: initialContent,
    editable: !readOnly,
    immediatelyRender: false,
    onCreate: ({ editor }) => {
      console.log('🎉 EDITOR: Editor created successfully');
      console.log('🔧 EDITOR: Available commands:', Object.keys(editor.commands));
      console.log('🧩 EDITOR: Loaded extensions:', editor.extensionManager.extensions.map(ext => ext.name));
    },
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      onContentChange?.(content);
      
      // Only send operations if this is a user edit, not a remote operation being applied
      if (!readOnly && isConnected && !isApplyingRemoteOperation) {
        // Check if content actually changed from last known local content
        if (content !== lastLocalContent) {
          setLastLocalContent(content);
          setHasUnsavedChanges(true);
          
          // Clear any existing debounce timer
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }
          
          // Only auto-save if autosave is enabled
          if (autoSaveEnabled) {
            // Debounce the operation sending to prevent excessive API calls
            const newTimer = setTimeout(() => {
              const operation: DocumentOperation = {
                type: 'retain',
                position: 0,
                content: content,
              };
              
              console.log('📝 Sending debounced document operation from user edit:', operation);
              socketClient.sendDocumentOperation(stableDocumentId, operation, currentVersion);
              setHasUnsavedChanges(false);
            }, 150); // Reduced debounce for better responsiveness
            
            setDebounceTimer(newTimer);
          }
        }
      } else if (isApplyingRemoteOperation) {
        console.log('🚫 Skipping operation send - applying remote operation');
        setHasUnsavedChanges(false);
      }
    },
    onSelectionUpdate: ({ editor }) => {
      if (!readOnly && isConnected && !isApplyingRemoteOperation) {
        const { from, to } = editor.state.selection;
        
        // Throttle cursor updates to reduce network overhead
        if (cursorThrottleTimer) {
          clearTimeout(cursorThrottleTimer);
        }
        
        const throttleTimer = setTimeout(() => {
          try {
            // Get the ProseMirror content area for accurate positioning
            const editorView = editor.view;
            const prosemirrorContent = editorView.dom.querySelector('.ProseMirror');
            const coords = editorView.coordsAtPos(from);
            
            let relativePosition = null;
            
            if (coords && prosemirrorContent) {
              const contentRect = prosemirrorContent.getBoundingClientRect();
              const editorRect = editorView.dom.getBoundingClientRect();
              
              // Calculate position relative to the actual content area, accounting for scroll
              const scrollTop = prosemirrorContent.scrollTop || 0;
              const scrollLeft = prosemirrorContent.scrollLeft || 0;
              
              relativePosition = {
                top: (coords.top - contentRect.top) + scrollTop,
                left: (coords.left - contentRect.left) + scrollLeft,
                height: Math.max(coords.bottom - coords.top, 18), // Minimum height for visibility
                // Store content area offset for display calculation
                contentOffsetTop: contentRect.top - editorRect.top,
                contentOffsetLeft: contentRect.left - editorRect.left,
                scrollTop: scrollTop,
                scrollLeft: scrollLeft
              };
              
              console.log('📍 Cursor coords calculation:', {
                from,
                coords: { top: coords.top, left: coords.left, height: coords.bottom - coords.top },
                contentRect: { top: contentRect.top, left: contentRect.left },
                editorRect: { top: editorRect.top, left: editorRect.left },
                relativePosition
              });
            }
            
            const cursorData = {
              position: from,
              selection: from !== to ? { start: from, end: to } : undefined,
              relativePosition: relativePosition || undefined
            };
            
            console.log('📍 Sending cursor update:', cursorData);
            socketClient.updateCursor(stableDocumentId, cursorData);
          } catch (error) {
            console.warn('Failed to calculate cursor position for update:', error);
            // Fallback to position-only update
            socketClient.updateCursor(stableDocumentId, {
              position: from,
              selection: from !== to ? { start: from, end: to } : undefined
            });
          }
        }, 50); // Reduced throttle to 50ms for better responsiveness
        
        setCursorThrottleTimer(throttleTimer);
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
          // Apply the operation to the editor with cursor preservation
          // This is simplified - in production you'd use proper operational transform
          if (data.operation.type === 'retain' && data.operation.content) {
            console.log('✏️ Applying remote operation to editor');
            
            // Store current selection to preserve cursor position
            const currentSelection = editor.state.selection;
            
            // Only apply if content is different to prevent unnecessary updates
            const currentContent = editor.getHTML();
            if (currentContent !== data.operation.content) {
              // Apply the content change
              editor.commands.setContent(data.operation.content, { emitUpdate: false });
              
              // Update our local content tracking
              setLastLocalContent(data.operation.content);
              
              // Try to restore cursor position if it's still valid
              setTimeout(() => {
                const docSize = editor.state.doc.content.size;
                if (currentSelection.from <= docSize && currentSelection.to <= docSize) {
                  editor.commands.setTextSelection({
                    from: currentSelection.from,
                    to: currentSelection.to
                  });
                }
              }, 10); // Small delay to ensure DOM is updated
            }
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
        domPosition?: { top: number; left: number; height: number };
        relativePosition?: { top: number; left: number; height: number; contentOffsetTop?: number; contentOffsetLeft?: number; scrollTop?: number; scrollLeft?: number };
      };
    }) => {
      console.log('📍 Received cursor update:', data);
      // Update cursor visualization for other users
      setActiveUsers(prev => 
        prev.map(user => 
          user.userId === data.userId 
            ? { ...user, cursor: data.cursor }
            : user
        )
      );
    };

    const handleTitleUpdated = (data: { title: string; userId: string; timestamp: number }) => {
      console.log('📝 EDITOR: Received title update:', data.title, 'from user:', data.userId);
      if (onTitleUpdate) {
        onTitleUpdate(data.title);
      }
    };

    const handleTitleUpdateError = (data: { error: string }) => {
      console.error('❌ EDITOR: Title update error:', data.error);
    };

    socketClient.on('document-users', handleDocumentUsers);
    socketClient.on('user-joined', handleUserJoined);
    socketClient.on('user-left', handleUserLeft);
    socketClient.on('document-operation', handleDocumentOperation);
    socketClient.on('cursor-update', handleCursorUpdate);
    socketClient.on('title-updated', handleTitleUpdated);
    socketClient.on('title-update-error', handleTitleUpdateError);

    return () => {
      socketClient.off('document-users', handleDocumentUsers);
      socketClient.off('user-joined', handleUserJoined);
      socketClient.off('user-left', handleUserLeft);
      socketClient.off('document-operation', handleDocumentOperation);
      socketClient.off('cursor-update', handleCursorUpdate);
      socketClient.off('title-updated', handleTitleUpdated);
      socketClient.off('title-update-error', handleTitleUpdateError);
    };
  }, [isConnected, editor, socketClient, userIdString, isApplyingRemoteOperation, onTitleUpdate]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      if (cursorThrottleTimer) {
        clearTimeout(cursorThrottleTimer);
      }
    };
  }, [debounceTimer, cursorThrottleTimer]);

  // Track current font size from editor selection
  useEffect(() => {
    if (editor) {
      const updateFontSize = () => {
        try {
          const attributes = editor.getAttributes('textStyle');
          if (attributes.fontSize) {
            const size = parseInt(attributes.fontSize.replace('px', ''));
            if (size && size !== fontSize) {
              setFontSize(size);
            }
          }
        } catch (error) {
          console.log('Error getting font size:', error);
        }
      };
      
      editor.on('selectionUpdate', updateFontSize);
      editor.on('transaction', updateFontSize);
      
      return () => {
        editor.off('selectionUpdate', updateFontSize);
        editor.off('transaction', updateFontSize);
      };
    }
  }, [editor, fontSize]);

  // Manual save function
  const handleManualSave = useCallback(async () => {
    if (!editor || !hasUnsavedChanges || isSaving) {
      console.log('🚫 EDITOR: Manual save skipped - no changes or already saving');
      return;
    }
    
    setIsSaving(true);
    try {
      const content = editor.getHTML();
      
      // Send operation through socket for real-time sync
      const operation: DocumentOperation = {
        type: 'retain',
        position: 0,
        content: content,
      };
      
      console.log('💾 EDITOR: Manual save - sending operation:', operation);
      socketClient.sendDocumentOperation(stableDocumentId, operation, currentVersion);
      
      // Call the manual save callback if provided
      if (onManualSave) {
        await onManualSave();
      }
      
      setHasUnsavedChanges(false);
      console.log('✅ EDITOR: Manual save completed successfully');
    } catch (error) {
      console.error('❌ EDITOR: Manual save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [editor, hasUnsavedChanges, isSaving, socketClient, stableDocumentId, currentVersion, onManualSave]);

  const formatText = useCallback((format: string, value?: any) => {
    console.log('🎨 FORMAT: Applying format:', format, { editorExists: !!editor, readOnly, value });
    if (!editor || readOnly) {
      console.log('❌ FORMAT: Cannot format - editor missing or read-only');
      return;
    }

    switch (format) {
      case 'bold':
        console.log('🎨 FORMAT: Toggling bold');
        editor.chain().focus().toggleBold().run();
        break;
      case 'italic':
        console.log('🎨 FORMAT: Toggling italic');
        editor.chain().focus().toggleItalic().run();
        break;
      case 'underline':
        console.log('🎨 FORMAT: Toggling underline');
        editor.chain().focus().toggleUnderline().run();
        break;
      case 'strike':
        console.log('🎨 FORMAT: Toggling strikethrough');
        editor.chain().focus().toggleStrike().run();
        break;
      case 'superscript':
        console.log('🎨 FORMAT: Toggling superscript');
        editor.chain().focus().toggleSuperscript().run();
        break;
      case 'subscript':
        console.log('🎨 FORMAT: Toggling subscript');
        editor.chain().focus().toggleSubscript().run();
        break;
      case 'heading1':
        console.log('🎨 FORMAT: Toggling H1');
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'heading2':
        console.log('🎨 FORMAT: Toggling H2');
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'heading3':
        console.log('🎨 FORMAT: Toggling H3');
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'heading4':
        console.log('🎨 FORMAT: Toggling H4');
        editor.chain().focus().toggleHeading({ level: 4 }).run();
        break;
      case 'paragraph':
        console.log('🎨 FORMAT: Setting paragraph');
        editor.chain().focus().setParagraph().run();
        break;
      case 'code':
        console.log('🎨 FORMAT: Toggling inline code');
        editor.chain().focus().toggleCode().run();
        break;
      case 'bullet-list':
        console.log('🎨 FORMAT: Toggling bullet list');
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'ordered-list':
        console.log('🎨 FORMAT: Toggling ordered list');
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'align-left':
        console.log('🎨 FORMAT: Setting left alignment');
        editor.chain().focus().setTextAlign('left').run();
        break;
      case 'align-center':
        console.log('🎨 FORMAT: Setting center alignment');
        editor.chain().focus().setTextAlign('center').run();
        break;
      case 'align-right':
        console.log('🎨 FORMAT: Setting right alignment');
        editor.chain().focus().setTextAlign('right').run();
        break;
      case 'align-justify':
        console.log('🎨 FORMAT: Setting justify alignment');
        editor.chain().focus().setTextAlign('justify').run();
        break;
      case 'color':
        if (value) {
          console.log('🎨 FORMAT: Setting text color to:', value);
          editor.chain().focus().setColor(value).run();
        }
        break;
      case 'font-family':
        if (value) {
          console.log('🎨 FORMAT: Setting font family to:', value);
          editor.chain().focus().setFontFamily(value).run();
          setFontFamily(value);
        }
        break;
      case 'font-size':
        if (value) {
          console.log('🎨 FORMAT: Setting font size to:', value);
          editor.chain().focus().setFontSize(value).run();
          setFontSize(parseInt(value.replace('px', '')));
        }
        break;
      default:
        console.log('❌ FORMAT: Unknown format:', format);
    }
    
    // Log current editor state after format attempt
    setTimeout(() => {
      console.log('📊 FORMAT: Editor state after formatting:', {
        format,
        isBold: editor.isActive('bold'),
        isItalic: editor.isActive('italic'),
        isH1: editor.isActive('heading', { level: 1 }),
        isH2: editor.isActive('heading', { level: 2 }),
        isBulletList: editor.isActive('bulletList'),
        isOrderedList: editor.isActive('orderedList'),
        content: editor.getHTML().substring(0, 200) + '...',
      });
    }, 100);
  }, [editor, readOnly]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm dark:bg-gray-800">
      {/* Connection Status & Active Users & Autosave Controls */}
      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {isApplyingRemoteOperation && (
              <span className="text-xs text-blue-600 animate-pulse">Syncing...</span>
            )}
          </div>
          
          {/* Autosave Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Auto-save</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => onAutoSaveToggle?.(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${
                  autoSaveEnabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    autoSaveEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  } mt-0.5`} />
                </div>
              </label>
            </div>
            
            {/* Manual Save Button */}
            {!autoSaveEnabled && (
              <button
                onClick={handleManualSave}
                disabled={!hasUnsavedChanges || isSaving}
                className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${
                  hasUnsavedChanges && !isSaving
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save' : 'Saved'}
              </button>
            )}
            
            {/* Unsaved changes indicator */}
            {!autoSaveEnabled && hasUnsavedChanges && (
              <span className="text-xs text-orange-600 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                Unsaved changes
              </span>
            )}
          </div>
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

      {/* Ribbon-Style Toolbar */}
      {!readOnly && (
        <div className="bg-white dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-600 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {/* Undo/Redo */}
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6-6m6 6l-6 6" />
              </svg>
            </button>
            
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
            
            {/* Heading Dropdown */}
            <div className="relative">
              <select
                value={
                  editor.isActive('heading', { level: 1 }) ? 'heading1' :
                  editor.isActive('heading', { level: 2 }) ? 'heading2' :
                  editor.isActive('heading', { level: 3 }) ? 'heading3' :
                  editor.isActive('heading', { level: 4 }) ? 'heading4' :
                  'paragraph'
                }
                onChange={(e) => formatText(e.target.value)}
                className="px-3 py-1.5 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[140px]"
                title="Text Format"
              >
                <option value="paragraph">Normal text</option>
                <option value="heading1">H₁ Heading 1</option>
                <option value="heading2">H₂ Heading 2</option>
                <option value="heading3">H₃ Heading 3</option>
                <option value="heading4">H₄ Heading 4</option>
              </select>
            </div>
            
            {/* Font Family Dropdown */}
            <div className="relative">
              <select
                value={fontFamily}
                onChange={(e) => formatText('font-family', e.target.value)}
                className="px-3 py-1.5 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[120px]"
                title="Font Family"
              >
                <option value="Inter">Inter</option>
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Courier New">Courier New</option>
                <option value="Comic Sans MS">Comic Sans MS</option>
                <option value="Roboto">Roboto</option>
                <option value="Open Sans">Open Sans</option>
                <option value="Lato">Lato</option>
                <option value="Montserrat">Montserrat</option>
              </select>
            </div>
            
            {/* Font Size Dropdown */}
            <div className="relative">
              <select
                value={`${fontSize}px`}
                onChange={(e) => formatText('font-size', e.target.value)}
                className="px-3 py-1.5 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[70px]"
                title="Font Size"
              >
                <option value="8px">8</option>
                <option value="9px">9</option>
                <option value="10px">10</option>
                <option value="11px">11</option>
                <option value="12px">12</option>
                <option value="14px">14</option>
                <option value="16px">16</option>
                <option value="18px">18</option>
                <option value="20px">20</option>
                <option value="22px">22</option>
                <option value="24px">24</option>
                <option value="26px">26</option>
                <option value="28px">28</option>
                <option value="32px">32</option>
                <option value="36px">36</option>
                <option value="40px">40</option>
                <option value="44px">44</option>
                <option value="48px">48</option>
                <option value="54px">54</option>
                <option value="60px">60</option>
                <option value="66px">66</option>
                <option value="72px">72</option>
              </select>
            </div>
            
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
            
            {/* List Controls */}
            <button
              onClick={() => formatText('bullet-list')}
              className={`p-2 rounded transition-colors ${
                editor.isActive('bulletList') 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Bullet List"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => formatText('ordered-list')}
              className={`p-2 rounded transition-colors ${
                editor.isActive('orderedList') 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Numbered List"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
            
            {/* Indentation */}
            <button
              onClick={() => editor.chain().focus().lift('listItem').run()}
              disabled={!editor.can().lift('listItem')}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
              title="Decrease Indent"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
            </button>
            
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
            
            {/* Basic Formatting */}
            <button
              onClick={() => formatText('bold')}
              className={`px-2.5 py-1.5 rounded text-sm font-bold transition-colors ${
                editor.isActive('bold') 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Bold (Ctrl+B)"
            >
              B
            </button>
            <button
              onClick={() => formatText('italic')}
              className={`px-2.5 py-1.5 rounded text-sm italic transition-colors ${
                editor.isActive('italic') 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Italic (Ctrl+I)"
            >
              I
            </button>
            <button
              onClick={() => formatText('underline')}
              className={`px-2.5 py-1.5 rounded text-sm underline transition-colors ${
                editor.isActive('underline') 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Underline (Ctrl+U)"
            >
              U
            </button>
            <button
              onClick={() => formatText('strike')}
              className={`px-2.5 py-1.5 rounded text-sm line-through transition-colors ${
                editor.isActive('strike') 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Strikethrough"
            >
              S
            </button>
            
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
            
            {/* Link */}
            <button
              onClick={() => {
                const url = window.prompt('Enter URL:');
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                }
              }}
              className={`p-2 rounded transition-colors ${
                editor.isActive('link') 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Add Link"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
            
            {/* Code */}
            <button
              onClick={() => formatText('code')}
              className={`px-2.5 py-1.5 rounded text-sm font-mono transition-colors ${
                editor.isActive('code') 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Code"
            >
              &lt;/&gt;
            </button>
            
            {/* Superscript & Subscript */}
            <button
              onClick={() => formatText('superscript')}
              className={`px-2 py-1.5 rounded text-xs transition-colors ${
                editor.isActive('superscript') 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Superscript"
            >
              x<sup>2</sup>
            </button>
            <button
              onClick={() => formatText('subscript')}
              className={`px-2 py-1.5 rounded text-xs transition-colors ${
                editor.isActive('subscript') 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Subscript"
            >
              x<sub>2</sub>
            </button>
            
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
            
            {/* Text Alignment */}
            <button
              onClick={() => formatText('align-left')}
              className={`p-2 rounded transition-colors ${
                editor.isActive({ textAlign: 'left' }) || (!editor.isActive({ textAlign: 'center' }) && !editor.isActive({ textAlign: 'right' }) && !editor.isActive({ textAlign: 'justify' }))
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Align Left"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h10M4 12h8M4 18h10" />
              </svg>
            </button>
            <button
              onClick={() => formatText('align-center')}
              className={`p-2 rounded transition-colors ${
                editor.isActive({ textAlign: 'center' }) 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Align Center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h10M4 12h16M7 18h10" />
              </svg>
            </button>
            <button
              onClick={() => formatText('align-right')}
              className={`p-2 rounded transition-colors ${
                editor.isActive({ textAlign: 'right' }) 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Align Right"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 6h6M10 12h10M14 18h6" />
              </svg>
            </button>
            <button
              onClick={() => formatText('align-justify')}
              className={`p-2 rounded transition-colors ${
                editor.isActive({ textAlign: 'justify' }) 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Justify"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
            
            {/* Add Button */}
            <button
              onClick={() => {
                // Add functionality - could open a menu for inserting images, tables, etc.
                console.log('Add button clicked');
              }}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500 rounded border border-gray-300 dark:border-gray-500 transition-colors flex items-center gap-1"
              title="Add Content"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add
            </button>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div className="relative">
        <div className="relative">
          <EditorContent 
            editor={editor} 
            className="prose prose-slate max-w-none p-4 min-h-[400px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[400px] [&_.ProseMirror]:cursor-text [&_.ProseMirror]:break-words [&_.ProseMirror]:leading-relaxed [&_.ProseMirror]:resize-none [&_.ProseMirror]:focus:ring-0 [&_.ProseMirror]:border-0 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h1]:mt-6 [&_.ProseMirror_h1]:text-gray-900 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h2]:mt-5 [&_.ProseMirror_h2]:text-gray-800 [&_.ProseMirror_.my-bullet-list]:list-disc [&_.ProseMirror_.my-bullet-list]:ml-6 [&_.ProseMirror_.my-bullet-list]:pl-4 [&_.ProseMirror_.my-ordered-list]:list-decimal [&_.ProseMirror_.my-ordered-list]:ml-6 [&_.ProseMirror_.my-ordered-list]:pl-4 [&_.ProseMirror_.my-list-item]:mb-1 [&_.ProseMirror_.my-list-item]:leading-relaxed"
          />
        </div>
        
        {/* Cursor indicators for other users */}
        {activeUsers.map((user) => {
          if (!user.cursor || !editor) return null;
          
          // Calculate proper cursor position with multiple fallback strategies
          let cursorStyle: React.CSSProperties = {
            display: 'none'
          };
          
          // Try to use the relative position data first (most accurate)
          if (user.cursor.relativePosition) {
            // Find the ProseMirror content element for positioning
            const prosemirrorContent = editor.view.dom.querySelector('.ProseMirror');
            const editorRect = editor.view.dom.getBoundingClientRect();
            
            if (prosemirrorContent) {
              const contentRect = prosemirrorContent.getBoundingClientRect();
              const currentScrollTop = prosemirrorContent.scrollTop || 0;
              const currentScrollLeft = prosemirrorContent.scrollLeft || 0;
              
              // Account for scroll position changes since cursor was sent
              const scrollTopDiff = currentScrollTop - (user.cursor.relativePosition.scrollTop || 0);
              const scrollLeftDiff = currentScrollLeft - (user.cursor.relativePosition.scrollLeft || 0);
              
              cursorStyle = {
                position: 'absolute',
                // Add content offset and adjust for scroll changes
                top: user.cursor.relativePosition.top + (contentRect.top - editorRect.top) - scrollTopDiff,
                left: user.cursor.relativePosition.left + (contentRect.left - editorRect.left) - scrollLeftDiff,
                height: user.cursor.relativePosition.height,
                pointerEvents: 'none',
                zIndex: 10
              };
              
              console.log('📍 Displaying cursor with relativePosition:', {
                userId: user.userId,
                relativePos: user.cursor.relativePosition,
                contentOffset: {
                  top: contentRect.top - editorRect.top,
                  left: contentRect.left - editorRect.left
                },
                finalStyle: {
                  top: cursorStyle.top,
                  left: cursorStyle.left
                }
              });
            } else {
              // Fallback if no content element found
              cursorStyle = {
                position: 'absolute',
                top: user.cursor.relativePosition.top,
                left: user.cursor.relativePosition.left,
                height: user.cursor.relativePosition.height,
                pointerEvents: 'none',
                zIndex: 10
              };
            }
          } else {
            // Fallback to real-time calculation using TipTap's coordsAtPos
            try {
              const coords = editor.view.coordsAtPos(user.cursor.position);
              const prosemirrorContent = editor.view.dom.querySelector('.ProseMirror');
              
              if (coords && prosemirrorContent) {
                const contentRect = prosemirrorContent.getBoundingClientRect();
                const editorRect = editor.view.dom.getBoundingClientRect();
                
                cursorStyle = {
                  position: 'absolute',
                  // Use the same logic as sending: relative to content area
                  top: (coords.top - contentRect.top) + (contentRect.top - editorRect.top),
                  left: (coords.left - contentRect.left) + (contentRect.left - editorRect.left),
                  height: Math.max(coords.bottom - coords.top, 18),
                  pointerEvents: 'none',
                  zIndex: 10
                };
                
                console.log('📍 Fallback cursor calculation:', {
                  userId: user.userId,
                  coords: { top: coords.top, left: coords.left },
                  contentRect: { top: contentRect.top, left: contentRect.left },
                  editorRect: { top: editorRect.top, left: editorRect.left },
                  finalPosition: { top: cursorStyle.top, left: cursorStyle.left }
                });
              } else if (coords) {
                // Final fallback with plain editor positioning
                const editorRect = editor.view.dom.getBoundingClientRect();
                cursorStyle = {
                  position: 'absolute',
                  top: coords.top - editorRect.top,
                  left: coords.left - editorRect.left,
                  height: coords.bottom - coords.top || 18,
                  pointerEvents: 'none',
                  zIndex: 10
                };
              }
            } catch (error) {
              console.warn('Failed to calculate cursor position:', error);
              // Final fallback to stored DOM position if available
              if (user.cursor.domPosition) {
                const editorRect = editor.view.dom.getBoundingClientRect();
                cursorStyle = {
                  position: 'absolute',
                  top: user.cursor.domPosition.top - editorRect.top,
                  left: user.cursor.domPosition.left - editorRect.left,
                  height: user.cursor.domPosition.height,
                  pointerEvents: 'none',
                  zIndex: 10
                };
              }
            }
          }
          
          return (
            <div
              key={user.userId}
              className="absolute w-0.5 bg-blue-500 pointer-events-none transition-all duration-75"
              style={cursorStyle}
            >
              <div className="absolute -top-6 -left-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-md whitespace-nowrap shadow-md animate-in fade-in duration-200">
                {user.username}
              </div>
              {user.cursor.selection && (
                <div className="absolute bg-blue-200 opacity-30 pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}