import Link from 'next/link';
import { getDocumentWithDetails } from '@/lib/db/document-queries';
import { getUser } from '@/lib/db/queries';

interface AccessDeniedPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reason?: string }>;
}

export default async function AccessDeniedPage({ params, searchParams }: AccessDeniedPageProps) {
  const { id } = await params;
  const { reason } = await searchParams;
  const user = await getUser();
  
  // Try to get basic document info (for public documents or if user has some access)
  let document = null;
  let documentOwner = null;
  
  try {
    document = await getDocumentWithDetails(id, user?.id);
    if (document?.owner) {
      documentOwner = document.owner;
    }
  } catch (error) {
    // Document might not exist or user has no access at all
    console.log('Could not fetch document details for access denied page:', error);
  }

  const getAccessDeniedMessage = () => {
    if (reason === 'not-found') {
      return {
        title: 'Document Not Found',
        message: 'The document you are looking for does not exist or has been deleted.',
        icon: '📄',
      };
    }
    
    if (reason === 'login-required') {
      return {
        title: 'Sign In Required',
        message: 'You need to sign in to view this private document.',
        icon: '🔐',
      };
    }
    
    return {
      title: 'Access Denied',
      message: 'This document is private and you do not have permission to view it.',
      icon: '🚫',
    };
  };

  const { title, message, icon } = getAccessDeniedMessage();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="text-6xl mb-4">{icon}</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            
            {document && documentOwner && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 text-left">
                    <h3 className="text-sm font-medium text-blue-800">
                      Document Information
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p><strong>Title:</strong> {document.title}</p>
                      {documentOwner.name && (
                        <p><strong>Owner:</strong> {documentOwner.name}</p>
                      )}
                      {documentOwner.email && (
                        <p><strong>Contact:</strong> {documentOwner.email}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {reason === 'login-required' && (
                <div>
                  <Link
                    href={`/sign-in?callbackUrl=${encodeURIComponent(`/documents/${id}`)}`}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Sign In to View Document
                  </Link>
                </div>
              )}
              
              {document && documentOwner?.email && reason !== 'login-required' && (
                <div>
                  <a
                    href={`mailto:${documentOwner.email}?subject=Request Access to Document: ${encodeURIComponent(document.title)}&body=Hi, I would like to request access to the document "${encodeURIComponent(document.title)}". Please let me know if you can share it with me.`}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Request Access from Owner
                  </a>
                </div>
              )}
              
              <div>
                <Link
                  href="/documents"
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to My Documents
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}