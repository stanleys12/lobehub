// @vitest-environment node
import { type LobeChatDatabase } from '@lobechat/database';
import { files } from '@lobechat/database/schemas';
import { getTestDB } from '@lobechat/database/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fileCommentRouter } from '../fileComment';
import { cleanupTestUser, createTestUser } from './integration/setup';

let testDB: LobeChatDatabase;
vi.mock('@/database/core/db-adaptor', () => ({
  getServerDB: vi.fn(() => testDB),
}));

describe('fileCommentRouter', () => {
  let serverDB: LobeChatDatabase;
  let ownerId: string;
  let strangerId: string;
  const fileId = 'file_comment_router_image';

  beforeEach(async () => {
    serverDB = await getTestDB();
    testDB = serverDB;
    ownerId = await createTestUser(serverDB);
    strangerId = await createTestUser(serverDB);
    await serverDB.insert(files).values({
      fileType: 'image/png',
      id: fileId,
      name: 'sunset.png',
      size: 10,
      url: 'files/sunset.png',
      userId: ownerId,
    });
  });

  afterEach(async () => {
    await cleanupTestUser(serverDB, strangerId);
    await cleanupTestUser(serverDB, ownerId);
    vi.clearAllMocks();
  });

  const caller = (userId: string) =>
    fileCommentRouter.createCaller({ jwtPayload: { userId }, userId } as any);

  it('creates, lists and deletes a pinned comment', async () => {
    const created = await caller(ownerId).create({
      anchor: { x: 0.3, y: 0.6 },
      content: '  Fix the horizon  ',
      fileId,
    });

    expect(created.data).toMatchObject({ anchor: { x: 0.3, y: 0.6 }, content: 'Fix the horizon' });

    const listed = await caller(ownerId).list({ fileId });
    expect(listed.data.map((c) => c.id)).toEqual([created.data.id]);

    await caller(ownerId).delete({ id: created.data.id });
    expect((await caller(ownerId).list({ fileId })).data).toEqual([]);
  });

  it('rejects anchors outside the image', async () => {
    await expect(
      caller(ownerId).create({ anchor: { x: 1.2, y: 0.5 }, content: 'x', fileId }),
    ).rejects.toThrow();
  });

  it('rejects blank comments', async () => {
    await expect(
      caller(ownerId).create({ anchor: { x: 0.2, y: 0.5 }, content: '   ', fileId }),
    ).rejects.toThrow();
  });

  it('hides the file comments from users who cannot open the file', async () => {
    await expect(caller(strangerId).list({ fileId })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      caller(strangerId).create({ anchor: { x: 0.2, y: 0.5 }, content: 'hi', fileId }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('reports NOT_FOUND when deleting a comment the caller does not own', async () => {
    const created = await caller(ownerId).create({
      anchor: { x: 0.3, y: 0.6 },
      content: 'mine',
      fileId,
    });

    await expect(caller(strangerId).delete({ id: created.data.id })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
