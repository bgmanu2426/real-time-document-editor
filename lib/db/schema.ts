import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  json,
  uuid,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
  metadata: text('metadata'), // JSON field for additional sharing-related data
});



export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;

// Document types
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type NewDocumentVersion = typeof documentVersions.$inferInsert;
export type DocumentBranch = typeof documentBranches.$inferSelect;
export type NewDocumentBranch = typeof documentBranches.$inferInsert;
export type DocumentMerge = typeof documentMerges.$inferSelect;
export type NewDocumentMerge = typeof documentMerges.$inferInsert;
export type DocumentCollaborator = typeof documentCollaborators.$inferSelect;
export type NewDocumentCollaborator = typeof documentCollaborators.$inferInsert;
export type DocumentComment = typeof documentComments.$inferSelect;
export type NewDocumentComment = typeof documentComments.$inferInsert;
export type DocumentWorkflow = typeof documentWorkflows.$inferSelect;
export type NewDocumentWorkflow = typeof documentWorkflows.$inferInsert;
export type DocumentOperation = typeof documentOperations.$inferSelect;
export type NewDocumentOperation = typeof documentOperations.$inferInsert;

// Enums for better type safety
export enum DocumentPermission {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
}

export enum DocumentWorkflowStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum MergeStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum OperationType {
  INSERT = 'insert',
  DELETE = 'delete',
  RETAIN = 'retain',
}

// Document-related tables
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull().default(''),
  ownerId: integer('owner_id')
    .notNull()
    .references(() => users.id),
  currentVersion: integer('current_version').notNull().default(1),
  isPublic: boolean('is_public').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  ownerIdx: index('owner_idx').on(table.ownerId),
  titleIdx: index('title_idx').on(table.title),
}));

export const documentVersions = pgTable('document_versions', {
  id: serial('id').primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  content: text('content').notNull(),
  branchName: varchar('branch_name', { length: 100 }).notNull().default('main'),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id),
  commitMessage: text('commit_message'),
  parentVersionId: integer('parent_version_id'),
  operations: json('operations'), // Store operational transform operations
  contentHash: varchar('content_hash', { length: 64 }), // SHA-256 hash for integrity
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  documentVersionIdx: index('document_version_idx').on(table.documentId, table.version),
  branchIdx: index('branch_idx').on(table.documentId, table.branchName),
  authorIdx: index('author_idx').on(table.authorId),
}));

export const documentBranches = pgTable('document_branches', {
  id: serial('id').primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  headVersionId: integer('head_version_id')
    .references(() => documentVersions.id),
  createdById: integer('created_by_id')
    .notNull()
    .references(() => users.id),
  parentBranch: varchar('parent_branch', { length: 100 }),
  isDefault: boolean('is_default').notNull().default(false),
  isProtected: boolean('is_protected').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  documentBranchIdx: index('document_branch_idx').on(table.documentId, table.name),
  createdByIdx: index('created_by_idx').on(table.createdById),
}));

export const documentMerges = pgTable('document_merges', {
  id: serial('id').primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  sourceBranch: varchar('source_branch', { length: 100 }).notNull(),
  targetBranch: varchar('target_branch', { length: 100 }).notNull(),
  sourceVersionId: integer('source_version_id')
    .notNull()
    .references(() => documentVersions.id),
  targetVersionId: integer('target_version_id')
    .notNull()
    .references(() => documentVersions.id),
  mergeVersionId: integer('merge_version_id')
    .references(() => documentVersions.id),
  mergedById: integer('merged_by_id')
    .notNull()
    .references(() => users.id),
  conflicts: json('conflicts'), // Store merge conflicts
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, completed, failed
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  documentMergeIdx: index('document_merge_idx').on(table.documentId),
  statusIdx: index('merge_status_idx').on(table.status),
}));

export const documentCollaborators = pgTable('document_collaborators', {
  id: serial('id').primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  permission: varchar('permission', { length: 20 }).notNull().default('read'), // read, write, admin
  invitedById: integer('invited_by_id')
    .references(() => users.id),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  documentUserIdx: index('document_user_idx').on(table.documentId, table.userId),
  permissionIdx: index('permission_idx').on(table.permission),
}));

export const documentComments = pgTable('document_comments', {
  id: serial('id').primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  versionId: integer('version_id')
    .references(() => documentVersions.id),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  parentCommentId: integer('parent_comment_id'),
  content: text('content').notNull(),
  position: json('position'), // Store cursor position/selection for inline comments
  isResolved: boolean('is_resolved').notNull().default(false),
  resolvedById: integer('resolved_by_id')
    .references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  documentCommentIdx: index('document_comment_idx').on(table.documentId),
  authorIdx: index('comment_author_idx').on(table.authorId),
  versionIdx: index('comment_version_idx').on(table.versionId),
}));

export const documentWorkflows = pgTable('document_workflows', {
  id: serial('id').primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  steps: json('steps'), // Array of workflow steps
  currentStep: integer('current_step').notNull().default(0),
  status: varchar('status', { length: 20 }).notNull().default('draft'), // draft, in_review, approved, rejected
  assignedToId: integer('assigned_to_id')
    .references(() => users.id),
  dueDate: timestamp('due_date'),
  createdById: integer('created_by_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  documentWorkflowIdx: index('document_workflow_idx').on(table.documentId),
  statusIdx: index('workflow_status_idx').on(table.status),
  assignedIdx: index('workflow_assigned_idx').on(table.assignedToId),
}));

export const documentOperations = pgTable('document_operations', {
  id: serial('id').primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  operationType: varchar('operation_type', { length: 20 }).notNull(), // insert, delete, retain
  position: integer('position').notNull(),
  content: text('content'),
  length: integer('length'),
  attributes: json('attributes'),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id),
  versionBefore: integer('version_before').notNull(),
  versionAfter: integer('version_after').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
}, (table) => ({
  documentOpIdx: index('document_op_idx').on(table.documentId, table.timestamp),
  authorOpIdx: index('author_op_idx').on(table.authorId),
}));

// Relations
export const documentsRelations = relations(documents, ({ one, many }) => ({
  owner: one(users, {
    fields: [documents.ownerId],
    references: [users.id],
  }),
  versions: many(documentVersions),
  branches: many(documentBranches),
  collaborators: many(documentCollaborators),
  comments: many(documentComments),
  workflows: many(documentWorkflows),
  operations: many(documentOperations),
  merges: many(documentMerges),
}));

export const documentVersionsRelations = relations(documentVersions, ({ one, many }) => ({
  document: one(documents, {
    fields: [documentVersions.documentId],
    references: [documents.id],
  }),
  author: one(users, {
    fields: [documentVersions.authorId],
    references: [users.id],
  }),
  comments: many(documentComments),
}));

export const documentBranchesRelations = relations(documentBranches, ({ one }) => ({
  document: one(documents, {
    fields: [documentBranches.documentId],
    references: [documents.id],
  }),
  createdBy: one(users, {
    fields: [documentBranches.createdById],
    references: [users.id],
  }),
  headVersion: one(documentVersions, {
    fields: [documentBranches.headVersionId],
    references: [documentVersions.id],
  }),
}));

export const documentCollaboratorsRelations = relations(documentCollaborators, ({ one }) => ({
  document: one(documents, {
    fields: [documentCollaborators.documentId],
    references: [documents.id],
  }),
  user: one(users, {
    fields: [documentCollaborators.userId],
    references: [users.id],
  }),
  invitedBy: one(users, {
    fields: [documentCollaborators.invitedById],
    references: [users.id],
  }),
}));

export const documentCommentsRelations = relations(documentComments, ({ one, many }) => ({
  document: one(documents, {
    fields: [documentComments.documentId],
    references: [documents.id],
  }),
  author: one(users, {
    fields: [documentComments.authorId],
    references: [users.id],
  }),
  version: one(documentVersions, {
    fields: [documentComments.versionId],
    references: [documentVersions.id],
  }),
  resolvedBy: one(users, {
    fields: [documentComments.resolvedById],
    references: [users.id],
  }),
  replies: many(documentComments),
}));

export const documentWorkflowsRelations = relations(documentWorkflows, ({ one }) => ({
  document: one(documents, {
    fields: [documentWorkflows.documentId],
    references: [documents.id],
  }),
  assignedTo: one(users, {
    fields: [documentWorkflows.assignedToId],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [documentWorkflows.createdById],
    references: [users.id],
  }),
}));

export const documentOperationsRelations = relations(documentOperations, ({ one }) => ({
  document: one(documents, {
    fields: [documentOperations.documentId],
    references: [documents.id],
  }),
  author: one(users, {
    fields: [documentOperations.authorId],
    references: [users.id],
  }),
}));

export const documentMergesRelations = relations(documentMerges, ({ one }) => ({
  document: one(documents, {
    fields: [documentMerges.documentId],
    references: [documents.id],
  }),
  sourceVersion: one(documentVersions, {
    fields: [documentMerges.sourceVersionId],
    references: [documentVersions.id],
  }),
  targetVersion: one(documentVersions, {
    fields: [documentMerges.targetVersionId],
    references: [documentVersions.id],
  }),
  mergeVersion: one(documentVersions, {
    fields: [documentMerges.mergeVersionId],
    references: [documentVersions.id],
  }),
  mergedBy: one(users, {
    fields: [documentMerges.mergedById],
    references: [users.id],
  }),
}));

// Update users relations to include documents
export const usersRelations = relations(users, ({ many }) => ({
  activityLogs: many(activityLogs),
  ownedDocuments: many(documents),
  collaboratingDocuments: many(documentCollaborators),
  documentVersions: many(documentVersions),
  comments: many(documentComments),
  workflows: many(documentWorkflows),
  operations: many(documentOperations),
}));

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  SHARE_CREATED = 'SHARE_CREATED',
  SHARE_ACCESSED = 'SHARE_ACCESSED',
  SHARE_UPDATED = 'SHARE_UPDATED',
  SHARE_DELETED = 'SHARE_DELETED',
  DOCUMENT_CREATED = 'DOCUMENT_CREATED',
  DOCUMENT_UPDATED = 'DOCUMENT_UPDATED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',
  DOCUMENT_SHARED = 'DOCUMENT_SHARED',
  BRANCH_CREATED = 'BRANCH_CREATED',
  BRANCH_MERGED = 'BRANCH_MERGED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  WORKFLOW_CREATED = 'WORKFLOW_CREATED',
  WORKFLOW_UPDATED = 'WORKFLOW_UPDATED',
}