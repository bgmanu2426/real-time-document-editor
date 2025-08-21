import { desc, eq, and, or, asc, count, sql } from 'drizzle-orm';
import { db } from './drizzle';
import {
  documents,
  documentVersions,
  documentBranches,
  documentCollaborators,
  documentComments,
  documentWorkflows,
  documentOperations,
  documentMerges,
  users,
  type Document,
  type NewDocument,
  type DocumentVersion,
  type NewDocumentVersion,
  type DocumentBranch,
  type NewDocumentBranch,
  type DocumentCollaborator,
  type NewDocumentCollaborator,
  type NewDocumentComment,
  type NewDocumentOperation,
  DocumentPermission,
} from './schema';

// Document CRUD operations
export async function createDocument(data: NewDocument) {
  const [document] = await db.insert(documents).values(data).returning();
  
  // Create initial version
  await createDocumentVersion({
    documentId: document.id,
    version: 1,
    content: data.content || '',
    branchName: 'main',
    authorId: data.ownerId,
    commitMessage: 'Initial commit',
  });

  // Create main branch
  await createDocumentBranch({
    documentId: document.id,
    name: 'main',
    createdById: data.ownerId,
    isDefault: true,
  });

  return document;
}

export async function getDocumentById(id: string) {
  const [document] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), sql`${documents.deletedAt} IS NULL`))
    .limit(1);
  
  return document;
}

export async function getDocumentWithDetails(id: string, userId?: number) {
  const document = await db
    .select({
      id: documents.id,
      title: documents.title,
      content: documents.content,
      ownerId: documents.ownerId,
      currentVersion: documents.currentVersion,
      isPublic: documents.isPublic,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      owner: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(documents)
    .leftJoin(users, eq(documents.ownerId, users.id))
    .where(and(eq(documents.id, id), sql`${documents.deletedAt} IS NULL`))
    .limit(1);

  if (!document[0]) return null;

  // Check user permissions
  let permission: DocumentPermission | null = null;
  if (userId) {
    if (document[0].ownerId === userId) {
      permission = DocumentPermission.ADMIN;
    } else {
      const [collaborator] = await db
        .select()
        .from(documentCollaborators)
        .where(
          and(
            eq(documentCollaborators.documentId, id),
            eq(documentCollaborators.userId, userId)
          )
        )
        .limit(1);
      
      permission = collaborator?.permission as DocumentPermission || null;
    }
  }

  return {
    ...document[0],
    permission,
  };
}

export async function getUserDocuments(userId: number) {
  // Get owned documents
  const ownedDocs = await db
    .select()
    .from(documents)
    .where(and(eq(documents.ownerId, userId), sql`${documents.deletedAt} IS NULL`))
    .orderBy(desc(documents.updatedAt));

  // Get collaborated documents
  const collaboratedDocs = await db
    .select({
      id: documents.id,
      title: documents.title,
      content: documents.content,
      ownerId: documents.ownerId,
      currentVersion: documents.currentVersion,
      isPublic: documents.isPublic,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      permission: documentCollaborators.permission,
    })
    .from(documentCollaborators)
    .leftJoin(documents, eq(documentCollaborators.documentId, documents.id))
    .where(and(eq(documentCollaborators.userId, userId), sql`${documents.deletedAt} IS NULL`))
    .orderBy(desc(documents.updatedAt));

  return {
    owned: ownedDocs,
    collaborated: collaboratedDocs,
  };
}

export async function updateDocument(id: string, updates: Partial<Document>) {
  const [document] = await db
    .update(documents)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(documents.id, id))
    .returning();
  
  return document;
}

export async function deleteDocument(id: string) {
  console.log('🗄️ [DB] Starting soft delete for document:', id);
  const deletedAt = new Date();
  console.log('⏰ [DB] Setting deletedAt timestamp:', deletedAt.toISOString());
  
  await db
    .update(documents)
    .set({ deletedAt })
    .where(eq(documents.id, id));
    
  console.log('✅ [DB] Document soft delete completed for:', id);
}

// Version control operations
export async function createDocumentVersion(data: NewDocumentVersion) {
  const [version] = await db.insert(documentVersions).values(data).returning();
  
  // Update document's current version
  await db
    .update(documents)
    .set({ 
      currentVersion: data.version,
      content: data.content,
      updatedAt: new Date() 
    })
    .where(eq(documents.id, data.documentId));
  
  return version;
}

export async function getDocumentVersions(documentId: string, branchName = 'main') {
  const versions = await db
    .select({
      id: documentVersions.id,
      version: documentVersions.version,
      content: documentVersions.content,
      branchName: documentVersions.branchName,
      commitMessage: documentVersions.commitMessage,
      createdAt: documentVersions.createdAt,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(documentVersions)
    .leftJoin(users, eq(documentVersions.authorId, users.id))
    .where(
      and(
        eq(documentVersions.documentId, documentId),
        eq(documentVersions.branchName, branchName)
      )
    )
    .orderBy(desc(documentVersions.version));

  return versions;
}

export async function getDocumentVersion(documentId: string, version: number) {
  const [docVersion] = await db
    .select()
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.documentId, documentId),
        eq(documentVersions.version, version)
      )
    )
    .limit(1);

  return docVersion;
}

// Branch operations
export async function createDocumentBranch(data: NewDocumentBranch) {
  const [branch] = await db.insert(documentBranches).values(data).returning();
  return branch;
}

export async function getDocumentBranches(documentId: string) {
  const branches = await db
    .select({
      id: documentBranches.id,
      name: documentBranches.name,
      isDefault: documentBranches.isDefault,
      isProtected: documentBranches.isProtected,
      createdAt: documentBranches.createdAt,
      createdBy: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(documentBranches)
    .leftJoin(users, eq(documentBranches.createdById, users.id))
    .where(eq(documentBranches.documentId, documentId))
    .orderBy(desc(documentBranches.createdAt));

  return branches;
}

export async function mergeBranch(
  documentId: string,
  sourceBranch: string,
  targetBranch: string,
  mergedById: number
) {
  // This is a simplified merge - in production you'd want more sophisticated conflict resolution
  const sourceVersions = await getDocumentVersions(documentId, sourceBranch);
  const targetVersions = await getDocumentVersions(documentId, targetBranch);
  
  if (sourceVersions.length === 0 || targetVersions.length === 0) {
    throw new Error('Cannot merge: one or both branches are empty');
  }

  const latestSource = sourceVersions[0];
  const latestTarget = targetVersions[0];
  
  // Create merge version
  const newVersion = Math.max(latestSource.version, latestTarget.version) + 1;
  
  const mergeVersion = await createDocumentVersion({
    documentId,
    version: newVersion,
    content: latestSource.content, // In production, merge content intelligently
    branchName: targetBranch,
    authorId: mergedById,
    commitMessage: `Merge branch '${sourceBranch}' into '${targetBranch}'`,
    parentVersionId: latestTarget.id,
  });

  // Record the merge
  const [merge] = await db.insert(documentMerges).values({
    documentId,
    sourceBranch,
    targetBranch,
    sourceVersionId: latestSource.id,
    targetVersionId: latestTarget.id,
    mergeVersionId: mergeVersion.id,
    mergedById,
    status: 'completed',
    completedAt: new Date(),
  }).returning();

  return merge;
}

// Collaboration operations
export async function addCollaborator(data: NewDocumentCollaborator) {
  const [collaborator] = await db.insert(documentCollaborators).values(data).returning();
  return collaborator;
}

export async function getDocumentCollaborators(documentId: string) {
  const collaborators = await db
    .select({
      id: documentCollaborators.id,
      permission: documentCollaborators.permission,
      acceptedAt: documentCollaborators.acceptedAt,
      createdAt: documentCollaborators.createdAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(documentCollaborators)
    .leftJoin(users, eq(documentCollaborators.userId, users.id))
    .where(eq(documentCollaborators.documentId, documentId))
    .orderBy(asc(documentCollaborators.createdAt));

  return collaborators;
}

export async function updateCollaboratorPermission(
  documentId: string,
  userId: number,
  permission: DocumentPermission
) {
  const [collaborator] = await db
    .update(documentCollaborators)
    .set({ permission })
    .where(
      and(
        eq(documentCollaborators.documentId, documentId),
        eq(documentCollaborators.userId, userId)
      )
    )
    .returning();

  return collaborator;
}

export async function removeCollaborator(documentId: string, userId: number) {
  await db
    .delete(documentCollaborators)
    .where(
      and(
        eq(documentCollaborators.documentId, documentId),
        eq(documentCollaborators.userId, userId)
      )
    );
}

// Comment operations
export async function addComment(data: NewDocumentComment) {
  const [comment] = await db.insert(documentComments).values(data).returning();
  return comment;
}

export async function getDocumentComments(documentId: string) {
  const comments = await db
    .select({
      id: documentComments.id,
      content: documentComments.content,
      position: documentComments.position,
      isResolved: documentComments.isResolved,
      resolvedAt: documentComments.resolvedAt,
      createdAt: documentComments.createdAt,
      updatedAt: documentComments.updatedAt,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(documentComments)
    .leftJoin(users, eq(documentComments.authorId, users.id))
    .where(eq(documentComments.documentId, documentId))
    .orderBy(desc(documentComments.createdAt));

  return comments;
}

export async function resolveComment(commentId: number, resolvedById: number) {
  const [comment] = await db
    .update(documentComments)
    .set({
      isResolved: true,
      resolvedById,
      resolvedAt: new Date(),
    })
    .where(eq(documentComments.id, commentId))
    .returning();

  return comment;
}

// Operation tracking for operational transform
export async function saveDocumentOperation(data: NewDocumentOperation) {
  const [operation] = await db.insert(documentOperations).values(data).returning();
  return operation;
}

export async function getDocumentOperations(
  documentId: string,
  since?: Date,
  limit = 100
) {
  const operations = await db
    .select()
    .from(documentOperations)
    .where(
      and(
        eq(documentOperations.documentId, documentId),
        since ? sql`${documentOperations.timestamp} > ${since}` : undefined
      )
    )
    .orderBy(asc(documentOperations.timestamp))
    .limit(limit);

  return operations;
}

// Permission check helper
export async function checkDocumentPermission(
  documentId: string,
  userId: number,
  requiredPermission: DocumentPermission
): Promise<boolean> {
  console.log('🔍 [PERMISSION CHECK] Starting permission check:', {
    documentId,
    userId,
    requiredPermission,
  });
  
  const document = await getDocumentById(documentId);
  if (!document) {
    console.log('❌ [PERMISSION CHECK] Document not found');
    return false;
  }

  console.log('🔍 [PERMISSION CHECK] Document info:', {
    ownerId: document.ownerId,
    isPublic: document.isPublic,
    isOwner: document.ownerId === userId,
  });

  // Owner has all permissions
  if (document.ownerId === userId) {
    console.log('✅ [PERMISSION CHECK] User is owner - access granted');
    return true;
  }

  // For public documents, allow read access to anyone
  if (document.isPublic && requiredPermission === DocumentPermission.READ) {
    console.log('✅ [PERMISSION CHECK] Public document read access - granted');
    return true;
  }

  // For public documents, allow authenticated users to have write access
  // This matches the behavior of the collaborative editor
  if (document.isPublic && requiredPermission === DocumentPermission.WRITE) {
    console.log('✅ [PERMISSION CHECK] Public document write access granted to authenticated user');
    return true;
  }

  // Check collaborator permissions for private documents or admin access
  console.log('🔍 [PERMISSION CHECK] Checking collaborator permissions...');
  const [collaborator] = await db
    .select()
    .from(documentCollaborators)
    .where(
      and(
        eq(documentCollaborators.documentId, documentId),
        eq(documentCollaborators.userId, userId)
      )
    )
    .limit(1);

  if (!collaborator) {
    console.log('❌ [PERMISSION CHECK] User is not a collaborator');
    return false;
  }

  console.log('🔍 [PERMISSION CHECK] Collaborator found:', {
    collaboratorPermission: collaborator.permission,
  });

  const permissions = [DocumentPermission.READ, DocumentPermission.WRITE, DocumentPermission.ADMIN];
  const userLevel = permissions.indexOf(collaborator.permission as DocumentPermission);
  const requiredLevel = permissions.indexOf(requiredPermission);

  const hasPermission = userLevel >= requiredLevel;
  
  console.log('🔍 [PERMISSION CHECK] Final result:', {
    userLevel,
    requiredLevel,
    hasPermission,
  });

  return hasPermission;
}