import { FILE_COMMENT_MAX_LENGTH } from '@lobechat/types';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { wsCompatProcedure } from '@/business/server/trpc-middlewares/workspaceAuth';
import { FileModel } from '@/database/models/file';
import { FileCommentModel } from '@/database/models/fileComment';
import { router } from '@/libs/trpc/lambda';
import { serverDatabase } from '@/libs/trpc/lambda/middleware';

import { assertFileNotInRestrictedKnowledgeBase } from './_helpers/knowledgeBaseAccess';

const anchorSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const fileCommentProcedure = wsCompatProcedure.use(serverDatabase).use(async (opts) => {
  const { ctx } = opts;
  const wsId = ctx.workspaceId ?? undefined;

  return opts.next({
    ctx: {
      fileCommentModel: new FileCommentModel(ctx.serverDB, ctx.userId, wsId),
      fileModel: new FileModel(ctx.serverDB, ctx.userId, wsId),
    },
  });
});

/**
 * Comments ride on the file's own visibility: a caller who cannot open the
 * file in this scope gets the same NOT_FOUND as for a missing file.
 */
const assertFileReadable = async (
  ctx: Parameters<typeof assertFileNotInRestrictedKnowledgeBase>[0] & { fileModel: FileModel },
  fileId: string,
) => {
  const file = await ctx.fileModel.findById(fileId);
  if (!file) throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });

  await assertFileNotInRestrictedKnowledgeBase(ctx, fileId);
};

export const fileCommentRouter = router({
  create: fileCommentProcedure
    .input(
      z.object({
        anchor: anchorSchema,
        content: z.string().trim().min(1).max(FILE_COMMENT_MAX_LENGTH),
        fileId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertFileReadable(ctx, input.fileId);

      const data = await ctx.fileCommentModel.create(input);
      return { data, message: 'Comment created', success: true };
    }),

  delete: fileCommentProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await ctx.fileCommentModel.delete(input.id);
      if (!deleted) throw new TRPCError({ code: 'NOT_FOUND', message: 'Comment not found' });

      return { message: 'Comment deleted', success: true };
    }),

  list: fileCommentProcedure
    .input(z.object({ fileId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertFileReadable(ctx, input.fileId);

      const data = await ctx.fileCommentModel.listByFileId(input.fileId);
      return { data, success: true };
    }),
});
