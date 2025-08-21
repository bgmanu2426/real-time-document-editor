'use client';

import { useState, useEffect } from 'react';
import { formatDistance } from 'date-fns';
import type { User } from '@/lib/db/schema';
import { DocumentPermission } from '@/lib/db/schema';

interface Comment {
  id: string;
  content: string;
  author: {
    id: number;
    name: string | null;
    email: string;
  };
  createdAt: string;
}

interface Collaborator {
  id: number;
  user: {
    id: number;
    name: string | null;
    email: string;
  };
  permission: string;
  addedAt: string;
}

interface DocumentSidebarProps {
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
    canComment?: boolean;
    canManageCollaborators?: boolean;
  };
  onClose: () => void;
}

export default function DocumentSidebar({
  document,
  user,
  permissions,
  onClose,
}: DocumentSidebarProps) {
  const [activeTab, setActiveTab] = useState<'comments' | 'history' | 'collaborators'>('comments');
  const [comments, setComments] = useState<Comment[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);

  // Load comments
  useEffect(() => {
    if (activeTab === 'comments') {
      loadComments();
    }
  }, [activeTab, document.id]);

  // Load collaborators
  useEffect(() => {
    if (activeTab === 'collaborators') {
      loadCollaborators();
    }
  }, [activeTab, document.id]);

  const loadComments = async () => {
    setIsLoadingComments(true);
    try {
      const response = await fetch(`/api/documents/${document.id}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const loadCollaborators = async () => {
    setIsLoadingCollaborators(true);
    try {
      const response = await fetch(`/api/documents/${document.id}/collaborators`);
      if (response.ok) {
        const data = await response.json();
        setCollaborators(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load collaborators:', error);
    } finally {
      setIsLoadingCollaborators(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`/api/documents/${document.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim(),
        }),
      });

      if (response.ok) {
        setNewComment('');
        loadComments(); // Reload comments
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Document Info</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 border-b border-gray-200">
        <nav className="flex space-x-4">
          {(['comments', 'history', 'collaborators'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-sm font-medium capitalize ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              } pb-2`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'comments' && (
          <CommentsTab
            comments={comments}
            newComment={newComment}
            setNewComment={setNewComment}
            onAddComment={handleAddComment}
            isLoading={isLoadingComments}
            canComment={permissions.canComment || permissions.canWrite}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab document={document} />
        )}

        {activeTab === 'collaborators' && (
          <CollaboratorsTab
            collaborators={collaborators}
            isLoading={isLoadingCollaborators}
            canManage={permissions.canManageCollaborators || permissions.canAdmin}
            document={document}
          />
        )}
      </div>
    </div>
  );
}

function CommentsTab({
  comments,
  newComment,
  setNewComment,
  onAddComment,
  isLoading,
  canComment,
}: {
  comments: Comment[];
  newComment: string;
  setNewComment: (value: string) => void;
  onAddComment: () => void;
  isLoading: boolean;
  canComment: boolean;
}) {
  return (
    <div className="p-4 space-y-4">
      {/* Add comment */}
      {canComment && (
        <div className="space-y-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={onAddComment}
            disabled={!newComment.trim()}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Comment
          </button>
        </div>
      )}

      {/* Comments list */}
      {isLoading ? (
        <div className="text-center py-4 text-gray-500">Loading comments...</div>
      ) : comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="border-b border-gray-100 pb-3">
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                  {comment.author.name?.[0] || comment.author.email[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {comment.author.name || comment.author.email}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistance(new Date(comment.createdAt), new Date(), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{comment.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p>No comments yet</p>
        </div>
      )}
    </div>
  );
}

function HistoryTab({ document }: { document: any }) {
  return (
    <div className="p-4">
      <div className="space-y-3">
        <div className="text-sm">
          <p className="font-medium text-gray-900">Current Version</p>
          <p className="text-gray-600">v{document.currentVersion || 1}</p>
        </div>
        <div className="text-sm">
          <p className="font-medium text-gray-900">Created</p>
          <p className="text-gray-600">
            {formatDistance(new Date(document.createdAt), new Date(), { addSuffix: true })}
          </p>
        </div>
        <div className="text-sm">
          <p className="font-medium text-gray-900">Last Modified</p>
          <p className="text-gray-600">
            {formatDistance(new Date(document.updatedAt), new Date(), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );
}

function CollaboratorsTab({
  collaborators,
  isLoading,
  canManage,
  document,
}: {
  collaborators: Collaborator[];
  isLoading: boolean;
  canManage: boolean;
  document: any;
}) {
  return (
    <div className="p-4">
      {isLoading ? (
        <div className="text-center py-4 text-gray-500">Loading collaborators...</div>
      ) : (
        <div className="space-y-3">
          {collaborators.map((collaborator) => (
            <div key={collaborator.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {collaborator.user.name?.[0] || collaborator.user.email[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {collaborator.user.name || collaborator.user.email}
                  </p>
                  <p className="text-xs text-gray-500">{collaborator.permission}</p>
                </div>
              </div>
              {canManage && (
                <button className="text-xs text-red-600 hover:text-red-800">
                  Remove
                </button>
              )}
            </div>
          ))}
          
          {collaborators.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No collaborators yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}