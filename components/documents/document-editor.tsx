'use client';

import { useState, useEffect } from 'react';
import CollaborativeEditor from '@/components/editor/collaborative-editor';
import DocumentHeader from './document-header';
import DocumentSidebar from './document-sidebar';
import type { User } from '@/lib/db/schema';
import { DocumentPermission } from '@/lib/db/schema';


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
  const [showSidebar, setShowSidebar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);

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
    
    // Debounce the save operation
    const newTimer = setTimeout(() => {
      console.log('💾 Auto-saving document after debounce...');
      saveDocumentContent(newContent);
    }, 1000); // 1 second debounce for document saving
    
    setSaveTimer(newTimer);
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
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle }),
      });

      if (response.ok) {
        setLastSaved(new Date());
        // Update document title in local state if needed
      } else {
        console.error('Failed to update document title');
      }
    } catch (error) {
      console.error('Error updating document title:', error);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Document Header */}
      <DocumentHeader
        document={document}
        user={user}
        permissions={permissions}
        isSaving={isSaving}
        lastSaved={lastSaved}
        onTitleChange={handleTitleChange}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
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