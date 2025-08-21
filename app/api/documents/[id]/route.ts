import { NextRequest, NextResponse } from 'next/server';
import { withDocumentPermission, withAuth } from '@/lib/auth/permissions';
import { 
  getDocumentWithDetails, 
  updateDocument, 
  deleteDocument 
} from '@/lib/db/document-queries';
import { DocumentPermission } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { z } from 'zod';

const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  isPublic: z.boolean().optional(),
});

// GET /api/documents/[id] - Get specific document
export const GET = async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const params = await context.params;
    const documentId = params.id;
    
    // Try to get user info, but allow anonymous access for public docs
    let user = null;
    try {
      user = await getUser();
    } catch (error) {
      // Allow anonymous access
      user = null;
    }
    const userId = user?.id;
    
    const document = await getDocumentWithDetails(documentId, userId);
    
    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }
    
    // Check if user can access this document
    if (!document.isPublic && (!userId || (document.ownerId !== userId && !document.permission))) {
      const errorMessage = !userId 
        ? 'This document is private. Please sign in to view it.'
        : 'This document is private and you do not have permission to view it. Please contact the document owner to request access.';
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          documentInfo: {
            title: document.title,
            isPublic: document.isPublic,
            owner: document.owner ? {
              name: document.owner.name,
              email: document.owner.email
            } : null
          }
        },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
};

// PATCH /api/documents/[id] - Update document (partial updates)
export const PATCH = withDocumentPermission(
  DocumentPermission.WRITE,
  async (req, user, documentId) => {
    try {
      const body = await req.json();
      const validatedData = UpdateDocumentSchema.parse(body);
      
      const document = await updateDocument(documentId, validatedData);
      
      if (!document) {
        return NextResponse.json(
          { success: false, error: 'Document not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: document,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Invalid input', details: error.errors },
          { status: 400 }
        );
      }
      
      console.error('Error updating document:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update document' },
        { status: 500 }
      );
    }
  }
);

// PUT /api/documents/[id] - Update document (full updates)
export const PUT = withDocumentPermission(
  DocumentPermission.WRITE,
  async (req, user, documentId) => {
    try {
      const body = await req.json();
      const validatedData = UpdateDocumentSchema.parse(body);
      
      const document = await updateDocument(documentId, validatedData);
      
      if (!document) {
        return NextResponse.json(
          { success: false, error: 'Document not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: document,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Invalid input', details: error.errors },
          { status: 400 }
        );
      }
      
      console.error('Error updating document:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update document' },
        { status: 500 }
      );
    }
  }
);

// DELETE /api/documents/[id] - Delete document
export const DELETE = async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const params = await context.params;
    const documentId = params.id;
    console.log('🗑️ [API] DELETE request received for document:', documentId);
    
    const user = await getUser();
    console.log('👤 [API] User authentication result:', { userId: user?.id, userEmail: user?.email });
    
    if (!user) {
      console.log('❌ [API] Unauthorized - no user found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get document details to check ownership
    console.log('📄 [API] Fetching document details for ownership check...');
    const document = await getDocumentWithDetails(documentId, user.id);
    
    if (!document) {
      console.log('❌ [API] Document not found:', documentId);
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }
    
    console.log('📋 [API] Document details:', { 
      documentId: document.id, 
      documentTitle: document.title, 
      ownerId: document.ownerId, 
      userId: user.id,
      isOwner: document.ownerId === user.id 
    });
    
    // Only the owner can delete the document
    if (document.ownerId !== user.id) {
      console.log('❌ [API] Permission denied - user is not the owner');
      return NextResponse.json(
        { success: false, error: 'Only the document owner can delete this document' },
        { status: 403 }
      );
    }
    
    console.log('🔥 [API] Proceeding with document deletion...');
    await deleteDocument(documentId);
    console.log('✅ [API] Document deleted successfully from database');
    
    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('💥 [API] Error deleting document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete document' },
      { status: 500 }
    );
  }
};