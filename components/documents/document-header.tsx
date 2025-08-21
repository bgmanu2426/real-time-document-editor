
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatDistance } from 'date-fns';
import type { User } from '@/lib/db/schema';
import { DocumentPermission } from '@/lib/db/schema';
import VersionHistory from './version-history';
import Popup from '../ui/popup';
import { usePopup } from '../../hooks/use-popup';


interface DocumentHeaderProps {
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
  permissions: {
    canRead: boolean;
    canWrite: boolean;
    canAdmin: boolean;
    canComment: boolean;
    canCreateBranch: boolean;
    canMergeBranch: boolean;
    canManageCollaborators: boolean;
    canDeleteDocument: boolean;
  };
  isSaving: boolean;
  lastSaved: Date | null;
  onTitleChange: (title: string) => void;
  onToggleSidebar: () => void;
  onSaveVersion?: (commitMessage?: string) => Promise<void>;
  currentContent?: string;
}

export default function DocumentHeader({
  document,
  user,
  permissions,
  isSaving,
  lastSaved,
  onTitleChange,
  onToggleSidebar,
  onSaveVersion,
  currentContent,
}: DocumentHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(document.title);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [collaboratorPermission, setCollaboratorPermission] = useState('write');
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { popup, hidePopup, showAlert, showConfirm } = usePopup();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdownMenu(false);
      }
    };

    if (showDropdownMenu) {
      window.document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      window.document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdownMenu]);

  useEffect(() => {
    if (showShareModal) {
      fetchCollaborators();
    }
  }, [showShareModal]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (title.trim() && title !== document.title) {
      onTitleChange(title.trim());
    } else {
      setTitle(document.title);
    }
  };

  const handleRestoreVersion = async (versionId: number, content: string) => {
    try {
      // Update the document content
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
        }),
      });
      
      if (response.ok) {
        showAlert('Version restored successfully! The page will reload.', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const errorData = await response.json();
        showAlert(errorData.error || 'Failed to restore version', 'error');
      }
    } catch (error) {
      console.error('Error restoring version:', error);
      showAlert('Failed to restore version', 'error');
    }
  };

  const handleSaveVersion = async () => {
    if (!onSaveVersion || !currentContent) {
      showAlert('Save version functionality is not available.', 'warning');
      return;
    }

    setIsSavingVersion(true);
    try {
      await onSaveVersion(commitMessage.trim() || undefined);
      setCommitMessage('');
      setShowSaveModal(false);
      showAlert('Version saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving version:', error);
      showAlert('Failed to save version. Please try again.', 'error');
    } finally {
      setIsSavingVersion(false);
    }
  };

  const handleSaveModalOpen = () => {
    setCommitMessage('');
    setShowSaveModal(true);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setTitle(document.title);
      setIsEditingTitle(false);
    }
  };

  const handleShareClick = () => {
    setShowShareModal(true);
  };

  const handleDropdownToggle = () => {
    setShowDropdownMenu(!showDropdownMenu);
  };

  const handleDeleteDocument = () => {
    console.log('🖱️ Delete button clicked for document:', { documentId: document.id, documentTitle: document.title });
    setShowDeleteConfirmation(true);
    setShowDropdownMenu(false);
  };

  const confirmDeleteDocument = async () => {
    console.log('🗑️ Starting document deletion process...', { documentId: document.id, documentTitle: document.title });
    setIsDeleting(true);
    try {
      console.log('📡 Sending DELETE request to API...');
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📨 Received API response:', { status: response.status, statusText: response.statusText });
      const data = await response.json();
      console.log('📄 API response data:', data);
      
      if (response.ok) {
        console.log('✅ Document deleted successfully! Redirecting to documents page...');
        // Redirect to documents page
        window.location.href = '/documents';
      } else {
        console.error('❌ Delete failed with response:', { status: response.status, data });
        // Show specific error message from server
        showAlert(data.error || 'Failed to delete document', 'error');
      }
    } catch (error) {
      console.error('💥 Network or other error during delete:', error);
      showAlert('Failed to delete document. Please check your connection and try again.', 'error');
    } finally {
      console.log('🏁 Delete process completed, cleaning up state...');
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
    }
  };

  const fetchCollaborators = async () => {
    if (!showShareModal) return;
    
    setIsLoadingCollaborators(true);
    try {
      const response = await fetch(`/api/documents/${document.id}/collaborators`);
      if (response.ok) {
        const data = await response.json();
        setCollaborators(data.data || []);
      } else {
        console.error('Failed to fetch collaborators');
      }
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    } finally {
      setIsLoadingCollaborators(false);
    }
  };

  const handleAddCollaborator = async () => {
    if (!collaboratorEmail.trim()) return;
    
    setIsAddingCollaborator(true);
    try {
      const response = await fetch(`/api/documents/${document.id}/collaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: collaboratorEmail,
          permission: collaboratorPermission,
        }),
      });
      
      if (response.ok) {
        setCollaboratorEmail('');
        await fetchCollaborators(); // Refresh the list
        showAlert('Collaborator added successfully!', 'success');
      } else {
        const errorData = await response.json();
        showAlert(errorData.error || 'Failed to add collaborator', 'error');
      }
    } catch (error) {
      console.error('Error adding collaborator:', error);
      showAlert('Failed to add collaborator', 'error');
    } finally {
      setIsAddingCollaborator(false);
    }
  };

  const handleUpdateCollaborator = async (userId: number, permission: string) => {
    try {
      const response = await fetch(`/api/documents/${document.id}/collaborators`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          permission,
        }),
      });
      
      if (response.ok) {
        await fetchCollaborators(); // Refresh the list
        showAlert('Collaborator permission updated successfully!', 'success');
      } else {
        const errorData = await response.json();
        showAlert(errorData.error || 'Failed to update collaborator', 'error');
      }
    } catch (error) {
      console.error('Error updating collaborator:', error);
      showAlert('Failed to update collaborator', 'error');
    }
  };

  const handleRemoveCollaborator = async (userId: number, userName: string) => {
    showConfirm(
      `Are you sure you want to remove ${userName} as a collaborator?`,
      async () => {
        try {
          const response = await fetch(`/api/documents/${document.id}/collaborators?userId=${userId}`, {
            method: 'DELETE',
          });
          
          if (response.ok) {
            await fetchCollaborators(); // Refresh the list
            showAlert('Collaborator removed successfully!', 'success');
          } else {
            const errorData = await response.json();
            showAlert(errorData.error || 'Failed to remove collaborator', 'error');
          }
        } catch (error) {
          console.error('Error removing collaborator:', error);
          showAlert('Failed to remove collaborator', 'error');
        }
      },
      {
        title: 'Remove Collaborator',
        confirmLabel: 'Remove',
        cancelLabel: 'Cancel',
        type: 'warning'
      }
    );
  };

  const handleExportDocument = async (format: 'text' | 'pdf' | 'docx') => {
    try {
      const { exportDocument, ExportFormat } = await import('@/lib/utils/document-export');
      
      let exportFormat: typeof ExportFormat[keyof typeof ExportFormat];
      switch (format) {
        case 'text':
          exportFormat = ExportFormat.TEXT;
          break;
        case 'pdf':
          exportFormat = ExportFormat.PDF;
          break;
        case 'docx':
          exportFormat = ExportFormat.DOCX;
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
      
      await exportDocument(document.content, document.title, exportFormat);
    } catch (error) {
      console.error('Export failed:', error);
      showAlert(`Failed to export document as ${format.toUpperCase()}. Please try again.`, 'error');
    } finally {
      setShowDropdownMenu(false);
    }
  };

  const handleDuplicateDocument = async () => {
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `${document.title} (Copy)`,
          content: document.content,
          isPublic: document.isPublic,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        window.location.href = `/documents/${data.data.id}`;
      } else {
        showAlert('Failed to duplicate document', 'error');
      }
    } catch (error) {
      console.error('Error duplicating document:', error);
      showAlert('Failed to duplicate document', 'error');
    }
    setShowDropdownMenu(false);
  };

  return (
    <div className="bg-background border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/documents"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          <div className="flex items-center space-x-3">
            {isEditingTitle && permissions.canWrite ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={handleTitleKeyDown}
                className="text-lg font-semibold text-foreground bg-transparent border-none outline-none focus:bg-background focus:border focus:border-primary focus:rounded px-2 py-1"
                autoFocus
              />
            ) : (
              <h1
                className={`text-lg font-semibold text-foreground ${
                  permissions.canWrite ? 'cursor-pointer hover:bg-muted px-2 py-1 rounded' : ''
                }`}
                onClick={() => permissions.canWrite && setIsEditingTitle(true)}
              >
                {document.title}
              </h1>
            )}

            <div className="flex items-center space-x-2">
              {document.isPublic && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  Public
                </span>
              )}
              {document.permission && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {document.permission}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            {isSaving ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : lastSaved ? (
              `Saved ${formatDistance(lastSaved, new Date(), { addSuffix: true })}`
            ) : (
              'All changes saved'
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            v{document.currentVersion}
          </div>

          <div className="flex items-center space-x-2">
            {permissions.canAdmin && (
              <button
                onClick={handleShareClick}
                className="inline-flex items-center px-3 py-1.5 border border-input text-sm font-medium rounded-md text-foreground bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Share
              </button>
            )}

            <button
              onClick={onToggleSidebar}
              className="inline-flex items-center px-3 py-1.5 border border-input text-sm font-medium rounded-md text-foreground bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Comments
            </button>

            <button
              onClick={() => setShowVersionHistory(true)}
              className="inline-flex items-center px-3 py-1.5 border border-input text-sm font-medium rounded-md text-foreground bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History
            </button>

            {permissions.canWrite && onSaveVersion && (
              <button
                onClick={handleSaveModalOpen}
                className="inline-flex items-center px-3 py-1.5 border border-primary text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                title="Save current changes as a new version"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2-4h2a2 2 0 002-2V9a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v2M7 19h10a2 2 0 002-2v-8a2 2 0 00-2-2H7a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Save Version
              </button>
            )}

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={handleDropdownToggle}
                className="inline-flex items-center px-2 py-1.5 border border-input text-sm font-medium rounded-md text-foreground bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              
              {showDropdownMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-background rounded-md shadow-lg border border-border z-50">
                  <div className="py-1">
                    <button
                      onClick={handleDuplicateDocument}
                      className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent"
                    >
                      <svg className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Duplicate
                    </button>
                    {/* Export Options */}
                    <div className="border-t border-border my-1"></div>
                    <div className="px-4 py-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Export Options</span>
                    </div>
                    <button
                      onClick={() => handleExportDocument('text')}
                      className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent"
                    >
                      <svg className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export as Text (.txt)
                    </button>
                    <button
                      onClick={() => handleExportDocument('pdf')}
                      className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent"
                    >
                      <svg className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Export as PDF (.pdf)
                    </button>
                    <button
                      onClick={() => handleExportDocument('docx')}
                      className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent"
                    >
                      <svg className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export as Word (.docx)
                    </button>
                    {permissions.canDeleteDocument && (
                      <>
                        <div className="border-t border-border my-1"></div>
                        <button
                          onClick={handleDeleteDocument}
                          className="block w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                        >
                          <svg className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete Document
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-foreground">Share Document</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Share Link
                </label>
                <div className="flex">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/documents/${document.id}`}
                    className="flex-1 px-3 py-2 border border-input rounded-l-md bg-muted text-sm text-foreground"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/documents/${document.id}`);
                      showAlert('Link copied to clipboard!', 'success');
                    }}
                    className="px-3 py-2 bg-primary text-primary-foreground text-sm rounded-r-md hover:bg-primary/90"
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={document.isPublic}
                    onChange={async (e) => {
                      try {
                        const response = await fetch(`/api/documents/${document.id}`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ isPublic: e.target.checked }),
                        });
                        if (response.ok) {
                          // Update local state if needed
                          window.location.reload();
                        }
                      } catch (error) {
                        console.error('Error updating document visibility:', error);
                      }
                    }}
                    className="h-4 w-4 text-primary border-input rounded"
                  />
                  <span className="ml-2 text-sm text-foreground">
                    Make this document public
                  </span>
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Public documents can be viewed by anyone with the link
                </p>
              </div>
              
              {/* Current Collaborators */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Current Collaborators
                </label>
                {isLoadingCollaborators ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2 text-sm text-muted-foreground">Loading collaborators...</span>
                  </div>
                ) : collaborators.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-border rounded-md p-2">
                    {collaborators.map((collaborator) => (
                      <div key={collaborator.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {collaborator.user?.name || collaborator.user?.email || 'Unknown User'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {collaborator.user?.email}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <select
                            value={collaborator.permission}
                            onChange={(e) => handleUpdateCollaborator(collaborator.user?.id, e.target.value)}
                            className="px-2 py-1 text-xs border border-input rounded bg-background text-foreground"
                          >
                            <option value="read">View only</option>
                            <option value="write">Can edit</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() => handleRemoveCollaborator(collaborator.user?.id, collaborator.user?.name || collaborator.user?.email)}
                            className="p-1 text-destructive hover:bg-destructive/10 rounded"
                            title="Remove collaborator"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">No collaborators yet. Add someone below to start collaborating!</p>
                )}
              </div>

              {/* Add New Collaborator */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Add Collaborator
                </label>
                <div className="flex space-x-2">
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={collaboratorEmail}
                    onChange={(e) => setCollaboratorEmail(e.target.value)}
                    className="flex-1 px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground"
                  />
                  <select
                    value={collaboratorPermission}
                    onChange={(e) => setCollaboratorPermission(e.target.value)}
                    className="px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground"
                  >
                    <option value="read">View only</option>
                    <option value="write">Can edit</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={handleAddCollaborator}
                    disabled={isAddingCollaborator || !collaboratorEmail.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingCollaborator ? 'Adding...' : 'Add'}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Collaborators will receive access based on the permission level you select
                </p>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-md hover:bg-muted/80"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-foreground">Delete Document</h3>
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="text-muted-foreground hover:text-foreground"
                disabled={isDeleting}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Are you sure you want to delete this document?</p>
                  <p className="text-sm text-muted-foreground mt-1">This action cannot be undone. The document and all its content will be permanently deleted.</p>
                </div>
              </div>
              
              <div className="bg-muted rounded-md p-3">
                <p className="text-sm font-medium text-foreground">Document: {document.title}</p>
                <p className="text-xs text-muted-foreground mt-1">Created {new Date(document.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-md hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteDocument}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive rounded-md hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-destructive-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete Document'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Save Version Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-foreground">Save Version</h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-muted-foreground hover:text-foreground"
                disabled={isSavingVersion}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="commitMessage" className="block text-sm font-medium text-foreground mb-2">
                  Version Description (Optional)
                </label>
                <textarea
                  id="commitMessage"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Describe the changes made in this version..."
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  rows={3}
                  maxLength={500}
                  disabled={isSavingVersion}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {commitMessage.length}/500 characters
                </p>
              </div>
              
              <div className="p-3 bg-muted/50 border border-border rounded-md">
                <h4 className="text-sm font-medium text-foreground mb-2">What happens when you save a version?</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Creates a permanent snapshot of your current document</li>
                  <li>• Allows you to track changes made by collaborators</li>
                  <li>• Enables you to restore to this version later if needed</li>
                  <li>• Shows up in the version history for all collaborators</li>
                </ul>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4 mt-4 border-t border-border">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 border border-input rounded-md text-foreground bg-background hover:bg-accent"
                disabled={isSavingVersion}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVersion}
                disabled={isSavingVersion}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSavingVersion ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2-4h2a2 2 0 002-2V9a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v2M7 19h10a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Save Version
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      <VersionHistory
        documentId={document.id}
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        onRestore={(content) => handleRestoreVersion(0, content)}
      />
      
      {/* Popup Component */}
      <Popup
        isOpen={popup.isOpen}
        onClose={hidePopup}
        title={popup.title}
        message={popup.message}
        type={popup.type}
        actions={popup.actions}
      />
    </div>
  );
}