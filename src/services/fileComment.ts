import type { FileCommentAnchor } from '@lobechat/types';

import { lambdaClient } from '@/libs/trpc/client';

class FileCommentService {
  create = (input: { anchor: FileCommentAnchor; content: string; fileId: string }) =>
    lambdaClient.fileComment.create.mutate(input);

  delete = (id: string) => lambdaClient.fileComment.delete.mutate({ id });

  list = (fileId: string) => lambdaClient.fileComment.list.query({ fileId });
}

export const fileCommentService = new FileCommentService();
