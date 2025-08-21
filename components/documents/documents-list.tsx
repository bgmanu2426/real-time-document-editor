'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistance } from 'date-fns';
import type { Document } from '@/lib/db/schema';

interface DocumentsListProps {
  ownedDocuments: Document[];
  collaboratedDocuments: any[];
}

export default function DocumentsList({ 
  ownedDocuments, 
  collaboratedDocuments 
}: DocumentsListProps) {
  const [activeTab, setActiveTab] = useState<'owned' | 'collaborated'>('owned');

  const currentDocuments = activeTab === 'owned' ? ownedDocuments : collaboratedDocuments;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('owned')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'owned'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            My Documents ({ownedDocuments.length})
          </button>
          <button
            onClick={() => setActiveTab('collaborated')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'collaborated'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Shared with Me ({collaboratedDocuments.length})
          </button>
        </nav>
      </div>

      {/* Documents Grid */}
      {currentDocuments.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {currentDocuments.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      ) : (
        <EmptyState activeTab={activeTab} />
      )}
    </div>
  );
}

function DocumentCard({ document }: { document: any }) {
  return (
    <Link href={`/documents/${document.id}`}>
      <div className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 p-6 cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {document.title}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Updated {formatDistance(new Date(document.updatedAt), new Date(), { addSuffix: true })}
            </p>
          </div>
          {document.isPublic && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Public
            </span>
          )}
        </div>

        <div className="text-sm text-gray-500 mb-4">
          Version {document.currentVersion}
          {document.permission && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              {document.permission}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {document.content?.length > 0 
              ? `${Math.ceil(document.content.length / 250)} min read`
              : 'Empty document'
            }
          </span>
          <div className="flex items-center space-x-2">
            {/* Collaboration indicators could go here */}
            <span className="w-2 h-2 bg-green-400 rounded-full" title="Online"></span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ activeTab }: { activeTab: 'owned' | 'collaborated' }) {
  return (
    <div className="text-center py-12">
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-gray-900">
        {activeTab === 'owned' ? 'No documents yet' : 'No shared documents'}
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        {activeTab === 'owned' 
          ? 'Get started by creating your first document.'
          : 'Documents shared with you will appear here.'
        }
      </p>
    </div>
  );
}