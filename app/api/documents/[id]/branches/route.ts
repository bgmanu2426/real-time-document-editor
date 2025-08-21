import { NextRequest, NextResponse } from 'next/server';
import { withDocumentPermission } from '@/lib/auth/permissions';
import { 
  getDocumentBranches, 
  createDocumentBranch,
  mergeBranch 
} from '@/lib/db/document-queries';
import { DocumentPermission } from '@/lib/db/schema';
import { z } from 'zod';

const CreateBranchSchema = z.object({
  name: z.string().min(1).max(100),
  parentBranch: z.string().optional().default('main'),
});

const MergeBranchSchema = z.object({
  sourceBranch: z.string().min(1).max(100),
  targetBranch: z.string().min(1).max(100),
});

// GET /api/documents/[id]/branches - Get document branches
export const GET = withDocumentPermission(
  DocumentPermission.READ,
  async (req, user, documentId) => {
    try {
      const branches = await getDocumentBranches(documentId);
      
      return NextResponse.json({
        success: true,
        data: branches,
      });
    } catch (error) {
      console.error('Error fetching document branches:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch branches' },
        { status: 500 }
      );
    }
  }
);

// POST /api/documents/[id]/branches - Create new branch
export const POST = withDocumentPermission(
  DocumentPermission.WRITE,
  async (req, user, documentId) => {
    try {
      const body = await req.json();
      const validatedData = CreateBranchSchema.parse(body);
      
      const branch = await createDocumentBranch({
        documentId,
        name: validatedData.name,
        createdById: user.id,
        parentBranch: validatedData.parentBranch,
        isDefault: false,
        isProtected: false,
      });
      
      return NextResponse.json({
        success: true,
        data: branch,
      }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Invalid input', details: error.errors },
          { status: 400 }
        );
      }
      
      console.error('Error creating document branch:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create branch' },
        { status: 500 }
      );
    }
  }
);