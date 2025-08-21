import { NextRequest, NextResponse } from 'next/server';
import { withDocumentPermission } from '@/lib/auth/permissions';
import { mergeBranch } from '@/lib/db/document-queries';
import { DocumentPermission } from '@/lib/db/schema';
import { z } from 'zod';

const MergeBranchSchema = z.object({
  sourceBranch: z.string().min(1).max(100),
  targetBranch: z.string().min(1).max(100),
});

// POST /api/documents/[id]/branches/merge - Merge branches
export const POST = withDocumentPermission(
  DocumentPermission.WRITE,
  async (req, user, documentId) => {
    try {
      const body = await req.json();
      const validatedData = MergeBranchSchema.parse(body);
      
      const mergeResult = await mergeBranch(
        documentId,
        validatedData.sourceBranch,
        validatedData.targetBranch,
        user.id
      );
      
      return NextResponse.json({
        success: true,
        data: mergeResult,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Invalid input', details: error.errors },
          { status: 400 }
        );
      }
      
      console.error('Error merging branches:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to merge branches' },
        { status: 500 }
      );
    }
  }
);