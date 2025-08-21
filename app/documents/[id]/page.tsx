import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import DocumentEditor from '@/components/documents/document-editor';
import { getUser } from '@/lib/db/queries';
import { getDocumentWithDetails } from '@/lib/db/document-queries';

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  
  const document = await getDocumentWithDetails(id, user?.id);
  
  if (!document) {
    redirect('/documents');
  }

  // Check permissions - allow public documents for anonymous users
  if (!document.isPublic) {
    if (!user) {
      redirect('/sign-in');
    }
    if (document.ownerId !== user.id && !document.permission) {
      redirect('/documents');
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Suspense fallback={<DocumentEditorSkeleton />}>
        <DocumentEditor 
          document={document}
          user={user}
        />
      </Suspense>
    </div>
  );
}

function DocumentEditorSkeleton() {
  return (
    <div className="h-screen flex flex-col">
      {/* Header skeleton */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
      
      {/* Editor skeleton */}
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    </div>
  );
}