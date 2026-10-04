import type { FileCommentAnchor } from '@lobechat/types';
import { index, jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import { idGenerator } from '../utils/idGenerator';
import { createdAt, updatedAt } from './_helpers';
import { files } from './file';
import { users } from './user';
import { workspaces } from './workspace';

/**
 * Comments pinned to a point on an image file in the file viewer. A comment is
 * addressed one at a time (delete by id), hence the prefixed id. Ownership
 * follows the usual compat rule: personal rows carry `workspace_id IS NULL`,
 * team rows are visible to every member of the workspace.
 */
export const fileComments = pgTable(
  'file_comments',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => idGenerator('fileComments'))
      .notNull(),
    fileId: text('file_id')
      .references(() => files.id, { onDelete: 'cascade' })
      .notNull(),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),

    /** Normalized (0–1) point on the image's natural size. */
    anchor: jsonb('anchor').$type<FileCommentAnchor>().notNull(),
    content: text('content').notNull(),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('file_comments_file_id_created_at_idx').on(t.fileId, t.createdAt),
    index('file_comments_user_id_idx').on(t.userId),
    index('file_comments_workspace_id_idx').on(t.workspaceId),
  ],
);

export type NewFileComment = typeof fileComments.$inferInsert;
export type FileCommentRow = typeof fileComments.$inferSelect;
