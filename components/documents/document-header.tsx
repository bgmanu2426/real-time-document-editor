'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatDistance } from 'date-fns';
import type { User } from '@/lib/db/schema';
import { DocumentPermission } from '@/lib/db/schema';


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
}

export default function DocumentHeader({
  document,
  user,
  permissions,
  isSaving,
  lastSaved,
  onTitleChange,
  onToggleSidebar,
}: DocumentHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(document.title);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [collaboratorPermission, setCollaboratorPermission] = useState('write');
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (title.trim() && title !== document.title) {
      onTitleChange(title.trim());
    } else {
      setTitle(document.title);
    }
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
        alert(data.error || 'Failed to delete document');
      }
    } catch (error) {
      console.error('💥 Network or other error during delete:', error);
      alert('Failed to delete document. Please check your connection and try again.');
    } finally {
      console.log('🏁 Delete process completed, cleaning up state...');
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
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
        alert('Collaborator added successfully!');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to add collaborator');
      }
    } catch (error) {
      console.error('Error adding collaborator:', error);
      alert('Failed to add collaborator');
    } finally {
      setIsAddingCollaborator(false);
    }
  };

  const handleExportDocument = () => {
    const blob = new Blob([document.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.title}.txt`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowDropdownMenu(false);
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
        alert('Failed to duplicate document');
      }
    } catch (error) {
      console.error('Error duplicating document:', error);
      alert('Failed to duplicate document');
    }
    setShowDropdownMenu(false);
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/documents"
            className="text-gray-400 hover:text-gray-600 transition-colors"
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
                className="text-lg font-semibold text-gray-900 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-500 focus:rounded px-2 py-1"
                autoFocus
              />
            ) : (
              <h1
                className={`text-lg font-semibold text-gray-900 ${
                  permissions.canWrite ? 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded' : ''
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
          <div className="text-sm text-gray-500">
            {isSaving ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24">
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

          <div className="text-sm text-gray-500">
            v{document.currentVersion}
          </div>

          <div className="flex items-center space-x-2">
            {permissions.canAdmin && (
              <button
                onClick={handleShareClick}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Share
              </button>
            )}

            <button
              onClick={onToggleSidebar}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Comments
            </button>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={handleDropdownToggle}
                className="inline-flex items-center px-2 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              
              {showDropdownMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                  <div className="py-1">
                    <button
                      onClick={handleDuplicateDocument}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <svg className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Duplicate
                    </button>
                    <button
                      onClick={handleExportDocument}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <svg className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export as Text
                    </button>
                    {permissions.canDeleteDocument && (
                      <>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button
                          onClick={handleDeleteDocument}
                          className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Share Document</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share Link
                </label>
                <div className="flex">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/documents/${document.id}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/documents/${document.id}`);
                      alert('Link copied to clipboard!');
                    }}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-r-md hover:bg-blue-700"
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
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Make this document public
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Public documents can be viewed by anyone with the link
                </p>
              </div>
              
              {/* Collaborator Management */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Collaborator
                </label>
                <div className="flex space-x-2">
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={collaboratorEmail}
                    onChange={(e) => setCollaboratorEmail(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <select
                    value={collaboratorPermission}
                    onChange={(e) => setCollaboratorPermission(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="read">View only</option>
                    <option value="write">Can edit</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={handleAddCollaborator}
                    disabled={isAddingCollaborator || !collaboratorEmail.trim()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingCollaborator ? 'Adding...' : 'Add'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Collaborators will receive access based on the permission level you select
                </p>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Delete Document</h3>
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="text-gray-400 hover:text-gray-600"
                disabled={isDeleting}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Are you sure you want to delete this document?</p>
                  <p className="text-sm text-gray-500 mt-1">This action cannot be undone. The document and all its content will be permanently deleted.</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-sm font-medium text-gray-700">Document: {document.title}</p>
                <p className="text-xs text-gray-500 mt-1">Created {new Date(document.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteDocument}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
    </div>
  );
}