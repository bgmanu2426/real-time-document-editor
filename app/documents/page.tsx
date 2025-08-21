import { Suspense } from 'react';
import { getUser } from '@/lib/db/queries';
import { getUserDocuments } from '@/lib/db/document-queries';
import { redirect } from 'next/navigation';
import DocumentsList from '@/components/documents/documents-list';
import CreateDocumentButton from '@/components/documents/create-document-button';

export default async function DocumentsPage() {
  const user = await getUser();
  
  if (!user) {
    redirect('/sign-in');
  }

  const documents = await getUserDocuments(user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
            <p className="text-gray-600 mt-2">
              Create and collaborate on documents with your team
            </p>
          </div>
          <CreateDocumentButton />
        </div>

        <Suspense fallback={<DocumentsListSkeleton />}>
          <DocumentsList 
            ownedDocuments={documents.owned}
            collaboratedDocuments={documents.collaborated}
          />
        </Suspense>
      </div>
    </div>
  );
}

function DocumentsListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}