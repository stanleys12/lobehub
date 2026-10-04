import type { FileCommentAnchor, FileCommentItem } from '@lobechat/types';
import { useCallback, useState } from 'react';

import { useClientDataSWR } from '@/libs/swr';
import { fileCommentKeys } from '@/libs/swr/keys';
import { fileCommentService } from '@/services/fileComment';

/**
 * Comments pinned on one image file. Create appends the server row to the
 * cached list; delete removes the row optimistically and revalidates on failure.
 */
export const useFileComments = (fileId: string | undefined) => {
  const { data, error, isLoading, mutate } = useClientDataSWR<FileCommentItem[]>(
    fileId ? fileCommentKeys.list(fileId) : null,
    async () => (await fileCommentService.list(fileId!)).data,
  );
  const [creating, setCreating] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  const createComment = useCallback(
    async (anchor: FileCommentAnchor, content: string) => {
      if (!fileId) return;
      setCreating(true);
      try {
        const { data: comment } = await fileCommentService.create({ anchor, content, fileId });
        await mutate((prev) => [...(prev ?? []), comment], { revalidate: false });
        return comment;
      } finally {
        setCreating(false);
      }
    },
    [fileId, mutate],
  );

  const deleteComment = useCallback(
    async (id: string) => {
      setDeletingIds((ids) => [...ids, id]);
      try {
        await mutate(
          async (prev) => {
            await fileCommentService.delete(id);
            return (prev ?? []).filter((comment) => comment.id !== id);
          },
          {
            optimisticData: (prev) => (prev ?? []).filter((comment) => comment.id !== id),
            rollbackOnError: true,
          },
        );
      } finally {
        setDeletingIds((ids) => ids.filter((value) => value !== id));
      }
    },
    [mutate],
  );

  return {
    comments: data ?? [],
    createComment,
    creating,
    deleteComment,
    deletingIds,
    error,
    isLoading,
    reload: () => mutate(),
  };
};
