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
      return NextResponse.json(
        { success: false, error: 'Access denied' },
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
export const DELETE = withDocumentPermission(
  DocumentPermission.ADMIN,
  async (req, user, documentId) => {
    try {
      await deleteDocument(documentId);
      
      return NextResponse.json({
        success: true,
        message: 'Document deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete document' },
        { status: 500 }
      );
    }
  }
);