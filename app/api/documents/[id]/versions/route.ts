import { NextRequest, NextResponse } from 'next/server';
import { withDocumentPermission } from '@/lib/auth/permissions';
import { 
  getDocumentVersions, 
  createDocumentVersion,
  getDocumentById 
} from '@/lib/db/document-queries';
import { DocumentPermission } from '@/lib/db/schema';
import { z } from 'zod';

const CreateVersionSchema = z.object({
  content: z.string(),
  branchName: z.string().min(1).max(100).optional().default('main'),
  commitMessage: z.string().optional(),
  parentVersionId: z.number().optional(),
});

// GET /api/documents/[id]/versions - Get document versions
export const GET = withDocumentPermission(
  DocumentPermission.READ,
  async (req, user, documentId) => {
    try {
      const url = new URL(req.url);
      const branchName = url.searchParams.get('branch') || 'main';
      
      const versions = await getDocumentVersions(documentId, branchName);
      
      return NextResponse.json({
        success: true,
        data: versions,
      });
    } catch (error) {
      console.error('Error fetching document versions:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch versions' },
        { status: 500 }
      );
    }
  }
);

// POST /api/documents/[id]/versions - Create new version
export const POST = withDocumentPermission(
  DocumentPermission.WRITE,
  async (req, user, documentId) => {
    try {
      const body = await req.json();
      const validatedData = CreateVersionSchema.parse(body);
      
      // Get current document to determine next version number
      const document = await getDocumentById(documentId);
      if (!document) {
        return NextResponse.json(
          { success: false, error: 'Document not found' },
          { status: 404 }
        );
      }
      
      const newVersion = document.currentVersion + 1;
      
      const version = await createDocumentVersion({
        documentId,
        version: newVersion,
        content: validatedData.content,
        branchName: validatedData.branchName,
        authorId: user.id,
        commitMessage: validatedData.commitMessage,
        parentVersionId: validatedData.parentVersionId,
      });
      
      return NextResponse.json({
        success: true,
        data: version,
      }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Invalid input', details: error.errors },
          { status: 400 }
        );
      }
      
      console.error('Error creating document version:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create version' },
        { status: 500 }
      );
    }
  }
);