import type { FileCommentAnchor, FileCommentItem } from '@lobechat/types';
import { and, asc, eq } from 'drizzle-orm';

import { fileComments } from '../schemas/fileComment';
import type { LobeChatDatabase } from '../type';
import { buildWorkspacePayload, buildWorkspaceWhere } from '../utils/workspace';

export interface CreateFileCommentParams {
  anchor: FileCommentAnchor;
  content: string;
  fileId: string;
}

const toItem = (row: typeof fileComments.$inferSelect): FileCommentItem => ({
  anchor: row.anchor,
  content: row.content,
  createdAt: row.createdAt,
  fileId: row.fileId,
  id: row.id,
  updatedAt: row.updatedAt,
  userId: row.userId,
});

/**
 * Point comments on an image file. The caller must have already checked the
 * file is visible in the current scope; this model only scopes the comments.
 */
export class FileCommentModel {
  private readonly userId: string;
  private readonly workspaceId?: string;
  private db: LobeChatDatabase;

  constructor(db: LobeChatDatabase, userId: string, workspaceId?: string) {
    this.db = db;
    this.userId = userId;
    this.workspaceId = workspaceId;
  }

  private ownership = () =>
    buildWorkspaceWhere({ userId: this.userId, workspaceId: this.workspaceId }, fileComments);

  create = async (params: CreateFileCommentParams): Promise<FileCommentItem> => {
    const [row] = await this.db
      .insert(fileComments)
      .values(
        buildWorkspacePayload(
          { userId: this.userId, workspaceId: this.workspaceId },
          { anchor: params.anchor, content: params.content, fileId: params.fileId },
        ),
      )
      .returning();

    return toItem(row);
  };

  /** Only the author can remove a comment; returns whether a row was deleted. */
  delete = async (id: string): Promise<boolean> => {
    const rows = await this.db
      .delete(fileComments)
      .where(and(eq(fileComments.id, id), eq(fileComments.userId, this.userId), this.ownership()))
      .returning({ id: fileComments.id });

    return rows.length > 0;
  };

  listByFileId = async (fileId: string): Promise<FileCommentItem[]> => {
    const rows = await this.db
      .select()
      .from(fileComments)
      .where(and(eq(fileComments.fileId, fileId), this.ownership()))
      .orderBy(asc(fileComments.createdAt), asc(fileComments.id));

    return rows.map(toItem);
  };
}
