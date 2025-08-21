'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AccessDeniedModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentInfo?: {
    title: string;
    isPublic: boolean;
    owner?: {
      name: string | null;
      email: string | null;
    } | null;
  } | null;
  reason?: 'not-found' | 'login-required' | 'access-denied';
  documentId?: string;
}

export default function AccessDeniedModal({ 
  isOpen, 
  onClose, 
  documentInfo, 
  reason = 'access-denied',
  documentId 
}: AccessDeniedModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  const getModalContent = () => {
    switch (reason) {
      case 'not-found':
        return {
          title: 'Document Not Found',
          message: 'The document you are looking for does not exist or has been deleted.',
          icon: '📄',
          color: 'red'
        };
      case 'login-required':
        return {
          title: 'Sign In Required',
          message: 'You need to sign in to view this private document.',
          icon: '🔐',
          color: 'blue'
        };
      default:
        return {
          title: 'Access Denied',
          message: 'This document is private and you do not have permission to view it.',
          icon: '🚫',
          color: 'red'
        };
    }
  };

  const { title, message, icon, color } = getModalContent();

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      <div className={`bg-white rounded-lg p-6 w-full max-w-md mx-4 transform transition-all duration-300 ${
        isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">{icon}</span>
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-600 mb-4">{message}</p>
          
          {documentInfo && (
            <div className={`bg-${color}-50 border border-${color}-200 rounded-md p-4 mb-4`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className={`h-5 w-5 text-${color}-400`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 text-left">
                  <h4 className={`text-sm font-medium text-${color}-800`}>
                    Document Information
                  </h4>
                  <div className={`mt-2 text-sm text-${color}-700`}>
                    <p><strong>Title:</strong> {documentInfo.title}</p>
                    {documentInfo.owner?.name && (
                      <p><strong>Owner:</strong> {documentInfo.owner.name}</p>
                    )}
                    {documentInfo.owner?.email && (
                      <p><strong>Contact:</strong> {documentInfo.owner.email}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {reason === 'login-required' && (
            <Link
              href={`/sign-in${documentId ? `?callbackUrl=${encodeURIComponent(`/documents/${documentId}`)}` : ''}`}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              onClick={onClose}
            >
              Sign In to View Document
            </Link>
          )}
          
          {documentInfo?.owner?.email && reason !== 'login-required' && (
            <a
              href={`mailto:${documentInfo.owner.email}?subject=Request Access to Document: ${encodeURIComponent(documentInfo.title)}&body=Hi, I would like to request access to the document "${encodeURIComponent(documentInfo.title)}". Please let me know if you can share it with me.`}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              onClick={onClose}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Request Access from Owner
            </a>
          )}
          
          <div className="flex space-x-3">
            <Link
              href="/documents"
              className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              onClick={onClose}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              My Documents
            </Link>
            
            <button
              onClick={onClose}
              className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}