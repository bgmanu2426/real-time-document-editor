import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/permissions';
import { createDocument, getUserDocuments } from '@/lib/db/document-queries';
import { z } from 'zod';

const CreateDocumentSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().optional().default(''),
  isPublic: z.boolean().optional().default(false),
});

// GET /api/documents - Get user's documents
export const GET = withAuth(async (req, user) => {
  try {
    const documents = await getUserDocuments(user.id);
    
    return NextResponse.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
});

// POST /api/documents - Create new document
export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json();
    const validatedData = CreateDocumentSchema.parse(body);
    
    const document = await createDocument({
      title: validatedData.title,
      content: validatedData.content,
      ownerId: user.id,
      isPublic: validatedData.isPublic,
    });
    
    return NextResponse.json({
      success: true,
      data: document,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create document' },
      { status: 500 }
    );
  }
});