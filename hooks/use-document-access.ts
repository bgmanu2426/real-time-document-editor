'use client';

import { useState, useCallback } from 'react';

interface DocumentInfo {
  title: string;
  isPublic: boolean;
  owner?: {
    name: string | null;
    email: string | null;
  } | null;
}

interface AccessDeniedState {
  isOpen: boolean;
  documentInfo: DocumentInfo | null;
  reason: 'not-found' | 'login-required' | 'access-denied';
  documentId: string | null;
}

export function useDocumentAccess() {
  const [accessDeniedState, setAccessDeniedState] = useState<AccessDeniedState>({
    isOpen: false,
    documentInfo: null,
    reason: 'access-denied',
    documentId: null,
  });

  const showAccessDenied = useCallback((
    documentId: string,
    reason: 'not-found' | 'login-required' | 'access-denied' = 'access-denied',
    documentInfo: DocumentInfo | null = null
  ) => {
    setAccessDeniedState({
      isOpen: true,
      documentInfo,
      reason,
      documentId,
    });
  }, []);

  const hideAccessDenied = useCallback(() => {
    setAccessDeniedState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const handleApiError = useCallback((error: any, documentId: string) => {
    if (error?.status === 403) {
      const errorData = error?.data;
      const reason = errorData?.error?.includes('sign in') ? 'login-required' : 'access-denied';
      showAccessDenied(documentId, reason, errorData?.documentInfo || null);
      return true; // Handled
    }
    
    if (error?.status === 404) {
      showAccessDenied(documentId, 'not-found');
      return true; // Handled
    }
    
    return false; // Not handled
  }, [showAccessDenied]);

  const fetchDocument = useCallback(async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`);
      const data = await response.json();
      
      if (!response.ok) {
        const handled = handleApiError({ status: response.status, data }, documentId);
        if (handled) {
          return null;
        }
        throw new Error(data.error || 'Failed to fetch document');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error fetching document:', error);
      throw error;
    }
  }, [handleApiError]);

  return {
    accessDeniedState,
    showAccessDenied,
    hideAccessDenied,
    handleApiError,
    fetchDocument,
  };
}