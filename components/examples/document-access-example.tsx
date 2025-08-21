'use client';

import { useState } from 'react';
import AccessDeniedModal from '@/components/ui/access-denied-modal';
import { useDocumentAccess } from '@/hooks/use-document-access';

export default function DocumentAccessExample() {
  const { accessDeniedState, showAccessDenied, hideAccessDenied } = useDocumentAccess();

  const simulatePrivateDocumentAccess = () => {
    // Simulate trying to access a private document
    showAccessDenied(
      'sample-doc-123',
      'access-denied',
      {
        title: 'Private Research Document',
        isPublic: false,
        owner: {
          name: 'John Doe',
          email: 'john.doe@example.com'
        }
      }
    );
  };

  const simulateLoginRequired = () => {
    // Simulate trying to access a document without being logged in
    showAccessDenied(
      'sample-doc-456',
      'login-required',
      {
        title: 'Team Meeting Notes',
        isPublic: false,
        owner: {
          name: 'Jane Smith',
          email: 'jane.smith@example.com'
        }
      }
    );
  };

  const simulateNotFound = () => {
    // Simulate trying to access a non-existent document
    showAccessDenied('non-existent-doc', 'not-found');
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Document Access Control Examples
      </h2>
      
      <div className="space-y-3">
        <button
          onClick={simulatePrivateDocumentAccess}
          className="block w-full py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Simulate Private Document Access (Access Denied)
        </button>
        
        <button
          onClick={simulateLoginRequired}
          className="block w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Simulate Login Required
        </button>
        
        <button
          onClick={simulateNotFound}
          className="block w-full py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          Simulate Document Not Found
        </button>
      </div>

      <AccessDeniedModal
        isOpen={accessDeniedState.isOpen}
        onClose={hideAccessDenied}
        documentInfo={accessDeniedState.documentInfo}
        reason={accessDeniedState.reason}
        documentId={accessDeniedState.documentId}
      />
    </div>
  );
}