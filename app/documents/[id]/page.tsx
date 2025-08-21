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
    redirect(`/documents/${id}/access-denied?reason=not-found`);
  }

  // Check permissions - allow public documents for anonymous users
  if (!document.isPublic) {
    if (!user) {
      redirect(`/documents/${id}/access-denied?reason=login-required`);
    }
    if (document.ownerId !== user.id && !document.permission) {
      redirect(`/documents/${id}/access-denied?reason=access-denied`);
    }
  }

  return (
    <div className="min-h-screen bg-background">
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
    <div className="h-screen flex flex-col bg-background">
      {/* Header skeleton */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/4"></div>
        </div>
      </div>
      
      {/* Editor skeleton */}
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-5/6"></div>
          <div className="h-4 bg-muted rounded w-4/6"></div>
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
        </div>
      </div>
    </div>
  );
}