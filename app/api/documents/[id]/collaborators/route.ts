import { NextRequest, NextResponse } from 'next/server';
import { withDocumentPermission } from '@/lib/auth/permissions';
import { 
  getDocumentCollaborators, 
  addCollaborator,
  updateCollaboratorPermission,
  removeCollaborator 
} from '@/lib/db/document-queries';
import { DocumentPermission } from '@/lib/db/schema';
import { getUserByEmail } from '@/lib/db/queries';
import { z } from 'zod';

const AddCollaboratorSchema = z.object({
  email: z.string().email(),
  permission: z.enum(['read', 'write', 'admin']),
});

const UpdatePermissionSchema = z.object({
  userId: z.number(),
  permission: z.enum(['read', 'write', 'admin']),
});

// GET /api/documents/[id]/collaborators - Get document collaborators
export const GET = withDocumentPermission(
  DocumentPermission.READ,
  async (req, user, documentId) => {
    try {
      const collaborators = await getDocumentCollaborators(documentId);
      
      return NextResponse.json({
        success: true,
        data: collaborators,
      });
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch collaborators' },
        { status: 500 }
      );
    }
  }
);

// POST /api/documents/[id]/collaborators - Add collaborator
export const POST = withDocumentPermission(
  DocumentPermission.ADMIN,
  async (req, user, documentId) => {
    try {
      const body = await req.json();
      const validatedData = AddCollaboratorSchema.parse(body);
      
      // Find user by email
      const targetUser = await getUserByEmail(validatedData.email);
      if (!targetUser) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }
      
      const collaborator = await addCollaborator({
        documentId,
        userId: targetUser.id,
        permission: validatedData.permission,
        invitedById: user.id,
        acceptedAt: new Date(), // Auto-accept for now
      });
      
      return NextResponse.json({
        success: true,
        data: collaborator,
      }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Invalid input', details: error.errors },
          { status: 400 }
        );
      }
      
      console.error('Error adding collaborator:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to add collaborator' },
        { status: 500 }
      );
    }
  }
);

// PUT /api/documents/[id]/collaborators - Update collaborator permission
export const PUT = withDocumentPermission(
  DocumentPermission.ADMIN,
  async (req, user, documentId) => {
    try {
      const body = await req.json();
      const validatedData = UpdatePermissionSchema.parse(body);
      
      const collaborator = await updateCollaboratorPermission(
        documentId,
        validatedData.userId,
        validatedData.permission as DocumentPermission
      );
      
      return NextResponse.json({
        success: true,
        data: collaborator,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Invalid input', details: error.errors },
          { status: 400 }
        );
      }
      
      console.error('Error updating collaborator permission:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update permission' },
        { status: 500 }
      );
    }
  }
);

// DELETE /api/documents/[id]/collaborators?userId=123 - Remove collaborator
export const DELETE = withDocumentPermission(
  DocumentPermission.ADMIN,
  async (req, user, documentId) => {
    try {
      const url = new URL(req.url);
      const userId = url.searchParams.get('userId');
      
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'userId parameter required' },
          { status: 400 }
        );
      }
      
      await removeCollaborator(documentId, parseInt(userId));
      
      return NextResponse.json({
        success: true,
        message: 'Collaborator removed successfully',
      });
    } catch (error) {
      console.error('Error removing collaborator:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to remove collaborator' },
        { status: 500 }
      );
    }
  }
);