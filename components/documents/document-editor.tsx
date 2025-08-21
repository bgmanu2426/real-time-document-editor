'use client';

import { useState, useEffect, useMemo } from 'react';
import CollaborativeEditor from '@/components/editor/collaborative-editor';
import DocumentHeader from './document-header';
import DocumentSidebar from './document-sidebar';
import type { User } from '@/lib/db/schema';
import { DocumentPermission } from '@/lib/db/schema';
import { getSocketClient } from '@/lib/socket/client';


interface DocumentEditorProps {
  document: {
    id: string;
    title: string;
    content: string;
    ownerId: number;
    currentVersion: number;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
    owner: {
      id: number | null;
      name: string | null;
      email: string | null;
    } | null;
    permission: DocumentPermission | null;
  };
  user: User | null;
}

export default function DocumentEditor({ document, user }: DocumentEditorProps) {
  console.log('🔴 DOCUMENT EDITOR: Component rendered!');
  console.log('🔴 DOCUMENT EDITOR: User info:', user ? { id: user.id, name: user.name, email: user.email } : 'No user (anonymous)');
  console.log('🔴 DOCUMENT EDITOR: Document info:', { id: document.id, title: document.title, isPublic: document.isPublic });
  
  const [content, setContent] = useState(document.content);
  const [documentTitle, setDocumentTitle] = useState(document.title);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  // Create socket client instance
  const socketClient = useMemo(() => getSocketClient(), []);

  // Determine user permissions (client-side)
  const isOwner = user ? document.ownerId === user.id : false;
  const permissions = {
    canRead: true,
    canWrite: user ? (isOwner || document.permission === DocumentPermission.WRITE || document.permission === DocumentPermission.ADMIN) : false,
    canAdmin: user ? (isOwner || document.permission === DocumentPermission.ADMIN) : false,
    canComment: user ? true : false,
    canCreateBranch: user ? (isOwner || document.permission === DocumentPermission.WRITE || document.permission === DocumentPermission.ADMIN) : false,
    canMergeBranch: user ? (isOwner || document.permission === DocumentPermission.WRITE || document.permission === DocumentPermission.ADMIN) : false,
    canManageCollaborators: user ? (isOwner || document.permission === DocumentPermission.ADMIN) : false,
    canDeleteDocument: isOwner, // Only owner can delete
  };

  const saveDocumentContent = async (content: string) => {
    setIsSaving(true);
    
    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        setLastSaved(new Date());
        console.log('📄 Document saved successfully');
      } else {
        const errorData = await response.text();
        console.error('Failed to save document:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
      }
    } catch (error) {
      console.error('Error saving document:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    
    // Clear existing timer
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    
    // Only auto-save if autosave is enabled
    if (autoSaveEnabled) {
      // Debounce the save operation
      const newTimer = setTimeout(() => {
        console.log('💾 Auto-saving document after debounce...');
        saveDocumentContent(newContent);
      }, 1000); // 1 second debounce for document saving
      
      setSaveTimer(newTimer);
    }
  };
  
  const handleManualSave = async () => {
    console.log('💾 Manual save triggered...');
    await saveDocumentContent(content);
  };
  
  const handleAutoSaveToggle = (enabled: boolean) => {
    setAutoSaveEnabled(enabled);
    console.log(`🔄 Auto-save ${enabled ? 'enabled' : 'disabled'}`);
    
    if (enabled) {
      // If enabling autosave and there are unsaved changes, save immediately
      if (content !== document.content) {
        console.log('💾 Auto-save enabled - saving current changes...');
        saveDocumentContent(content);
      }
    } else {
      // Clear any pending autosave timer
      if (saveTimer) {
        clearTimeout(saveTimer);
        setSaveTimer(null);
      }
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
  }, [saveTimer]);

  const handleTitleChange = async (newTitle: string) => {
    if (!permissions.canWrite) return;

    try {
      console.log('📝 Updating document title:', newTitle);
      
      // Update local state immediately for responsive UI
      setDocumentTitle(newTitle);
      
      // Always persist to database via API for data integrity
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle }),
      });

      if (response.ok) {
        setLastSaved(new Date());
        console.log('✅ Title persisted to database');
        
        // Send title update through Socket.IO for real-time sync to other users
        if (socketClient.isConnected() && socketClient.isAuth()) {
          socketClient.updateDocumentTitle(document.id, newTitle);
          console.log('✨ Title update broadcasted via Socket.IO');
        } else {
          console.warn('⚠️ Socket not connected - title updated locally only');
        }
      } else {
        console.error('❌ Failed to update document title');
        // Revert local state on failure
        setDocumentTitle(document.title);
      }
    } catch (error) {
      console.error('❌ Error updating document title:', error);
      // Revert local state on error
      setDocumentTitle(document.title);
    }
  };

  // Handle title updates from other collaborators
  const handleTitleUpdateFromCollaborator = (newTitle: string) => {
    console.log('🔄 Received title update from collaborator:', newTitle);
    setDocumentTitle(newTitle);
  };

  const handleSaveVersion = async (commitMessage?: string) => {
    if (!permissions.canWrite) {
      throw new Error('You do not have permission to save versions');
    }

    console.log('📦 Attempting to save version:', {
      documentId: document.id,
      contentLength: content.length,
      commitMessage,
      user: user ? { id: user.id, email: user.email } : 'No user',
    });

    try {
      const response = await fetch(`/api/documents/${document.id}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          commitMessage: commitMessage || `Manual save by ${user?.name || user?.email || 'Anonymous'}`,
          branchName: 'main',
        }),
        credentials: 'same-origin', // Ensure cookies are sent for same-origin requests
      });

      console.log('📜 API Response status:', response.status);
      
      const responseText = await response.text();
      console.log('📜 API Response text:', responseText);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText };
        }
        throw new Error(errorData.error || 'Failed to save version');
      }

      const data = JSON.parse(responseText);
      console.log('✅ Version saved successfully:', data.data);
      return data.data;
    } catch (error) {
      console.error('❌ Error saving version:', error);
      throw error;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Document Header */}
      <DocumentHeader
        document={{ ...document, title: documentTitle }}
        user={user}
        permissions={permissions}
        isSaving={isSaving}
        lastSaved={lastSaved}
        onTitleChange={handleTitleChange}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onSaveVersion={handleSaveVersion}
        currentContent={content}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Main Editor */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <CollaborativeEditor
                documentId={document.id}
                initialContent={content}
                userId={user?.id || 999999} // Use high number for anonymous users instead of 0
                username={user?.name || user?.email || 'Anonymous'}
                onContentChange={handleContentChange}
                readOnly={!permissions.canWrite}
                autoSaveEnabled={autoSaveEnabled}
                onAutoSaveToggle={handleAutoSaveToggle}
                onManualSave={handleManualSave}
                onTitleUpdate={handleTitleUpdateFromCollaborator}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <DocumentSidebar
            document={document}
            user={user}
            permissions={permissions}
            onClose={() => setShowSidebar(false)}
          />
        )}
      </div>
    </div>
  );
}