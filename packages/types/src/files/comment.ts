/**
 * A point on an image, normalized to 0–1 against the image's natural size so
 * the pin stays on the same pixel at any zoom level or container width.
 */
export interface FileCommentAnchor {
  x: number;
  y: number;
}

export interface FileCommentItem {
  anchor: FileCommentAnchor;
  content: string;
  createdAt: Date;
  fileId: string;
  id: string;
  updatedAt: Date;
  userId: string;
}

/** Longest comment body accepted by the API. */
export const FILE_COMMENT_MAX_LENGTH = 2000;
