import { getSession } from './session';
import { checkDocumentPermission } from '@/lib/db/document-queries';
import { DocumentPermission } from '@/lib/db/schema';
import { getUserById } from '@/lib/db/queries';
import { NextRequest, NextResponse } from 'next/server';

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string | null;
}

export async function requireAuth(): Promise<AuthenticatedUser | null> {
  const session = await getSession();
  if (!session) return null;

  // Fetch fresh user data from database
  const user = await getUserById(session.user.id);
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

export async function requireDocumentPermission(
  documentId: string,
  requiredPermission: DocumentPermission
): Promise<{ user: AuthenticatedUser; hasPermission: boolean } | null> {
  const user = await requireAuth();
  if (!user) return null;

  const hasPermission = await checkDocumentPermission(
    documentId,
    user.id,
    requiredPermission
  );

  return { user, hasPermission };
}

export function withAuth(handler: (req: NextRequest, user: AuthenticatedUser) => Promise<Response>) {
  return async (req: NextRequest) => {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(req, user);
  };
}

export function withDocumentPermission(
  requiredPermission: DocumentPermission,
  handler: (req: NextRequest, user: AuthenticatedUser, documentId: string) => Promise<Response>
) {
  return async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const params = await context.params;
    const documentId = params.id;
    const result = await requireDocumentPermission(documentId, requiredPermission);
    
    if (!result) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!result.hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    return handler(req, result.user, documentId);
  };
}

// Role-based permission checks
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export interface ExtendedUser extends AuthenticatedUser {
  role: UserRole;
}

// This would be enhanced to fetch role from database
export async function getUserWithRole(userId: number): Promise<ExtendedUser | null> {
  const user = await requireAuth();
  if (!user || user.id !== userId) return null;

  // For now, all users are regular users
  // In production, you'd fetch this from the database
  return {
    ...user,
    role: UserRole.USER,
  };
}

export function hasRole(user: ExtendedUser, requiredRole: UserRole): boolean {
  const roleHierarchy = {
    [UserRole.USER]: 0,
    [UserRole.ADMIN]: 1,
    [UserRole.SUPER_ADMIN]: 2,
  };

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

export function withRole(
  requiredRole: UserRole,
  handler: (req: NextRequest, user: ExtendedUser) => Promise<Response>
) {
  return async (req: NextRequest) => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserWithRole(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(user, requiredRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    return handler(req, user);
  };
}

// Utility functions for client-side permission checks
export function canReadDocument(permission: DocumentPermission | null): boolean {
  if (!permission) return false;
  return [DocumentPermission.READ, DocumentPermission.WRITE, DocumentPermission.ADMIN].includes(permission);
}

export function canWriteDocument(permission: DocumentPermission | null): boolean {
  if (!permission) return false;
  return [DocumentPermission.WRITE, DocumentPermission.ADMIN].includes(permission);
}

export function canAdminDocument(permission: DocumentPermission | null): boolean {
  if (!permission) return false;
  return permission === DocumentPermission.ADMIN;
}

// Document action permissions
export interface DocumentPermissions {
  canRead: boolean;
  canWrite: boolean;
  canAdmin: boolean;
  canComment: boolean;
  canCreateBranch: boolean;
  canMergeBranch: boolean;
  canManageCollaborators: boolean;
  canDeleteDocument: boolean;
}

export function getDocumentPermissions(
  permission: DocumentPermission | null,
  isOwner: boolean = false
): DocumentPermissions {
  if (isOwner) {
    return {
      canRead: true,
      canWrite: true,
      canAdmin: true,
      canComment: true,
      canCreateBranch: true,
      canMergeBranch: true,
      canManageCollaborators: true,
      canDeleteDocument: true,
    };
  }

  const basePermissions = {
    canRead: canReadDocument(permission),
    canWrite: canWriteDocument(permission),
    canAdmin: canAdminDocument(permission),
    canComment: canReadDocument(permission), // Can comment if can read
    canCreateBranch: canWriteDocument(permission),
    canMergeBranch: canWriteDocument(permission),
    canManageCollaborators: canAdminDocument(permission),
    canDeleteDocument: false, // Only owner can delete
  };

  return basePermissions;
}