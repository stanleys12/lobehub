// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';

import { getTestDB } from '../../core/getTestDB';
import { fileComments, files, users, workspaces } from '../../schemas';
import type { LobeChatDatabase } from '../../type';
import { FileCommentModel } from '../fileComment';

const serverDB: LobeChatDatabase = await getTestDB();

const userId = 'file-comment-user';
const otherUserId = 'file-comment-other';
const fileId = 'file-comment-image';

beforeEach(async () => {
  await serverDB.delete(users);
  await serverDB.insert(users).values([{ id: userId }, { id: otherUserId }]);
  await serverDB.insert(files).values({
    fileType: 'image/png',
    id: fileId,
    name: 'sunset.png',
    size: 100,
    url: 'files/sunset.png',
    userId,
  });
});

describe('FileCommentModel', () => {
  it('creates a comment and lists it back in creation order', async () => {
    const model = new FileCommentModel(serverDB, userId);

    const first = await model.create({ anchor: { x: 0.25, y: 0.5 }, content: 'Sky', fileId });
    const second = await model.create({ anchor: { x: 0.75, y: 0.1 }, content: 'Sun', fileId });

    expect(first.id).toMatch(/^fcm_/);
    expect(first).toMatchObject({ anchor: { x: 0.25, y: 0.5 }, content: 'Sky', fileId, userId });

    const list = await model.listByFileId(fileId);
    expect(list.map((c) => c.id)).toEqual([first.id, second.id]);
  });

  it('keeps personal comments private to their author', async () => {
    await new FileCommentModel(serverDB, userId).create({
      anchor: { x: 0.1, y: 0.1 },
      content: 'mine',
      fileId,
    });

    expect(await new FileCommentModel(serverDB, otherUserId).listByFileId(fileId)).toEqual([]);
  });

  it('does not mix personal and workspace comments', async () => {
    const [ws] = await serverDB
      .insert(workspaces)
      .values({ name: 'fc-ws', primaryOwnerId: userId, slug: 'fc-ws' })
      .returning();

    await new FileCommentModel(serverDB, userId).create({
      anchor: { x: 0.1, y: 0.1 },
      content: 'personal',
      fileId,
    });
    await new FileCommentModel(serverDB, userId, ws.id).create({
      anchor: { x: 0.2, y: 0.2 },
      content: 'team',
      fileId,
    });

    const teamForOther = await new FileCommentModel(serverDB, otherUserId, ws.id).listByFileId(
      fileId,
    );
    expect(teamForOther.map((c) => c.content)).toEqual(['team']);

    const personal = await new FileCommentModel(serverDB, userId).listByFileId(fileId);
    expect(personal.map((c) => c.content)).toEqual(['personal']);
  });

  it('only lets the author delete a comment', async () => {
    const [ws] = await serverDB
      .insert(workspaces)
      .values({ name: 'fc-ws-del', primaryOwnerId: userId, slug: 'fc-ws-del' })
      .returning();
    const authorModel = new FileCommentModel(serverDB, userId, ws.id);
    const comment = await authorModel.create({ anchor: { x: 0.5, y: 0.5 }, content: 'x', fileId });

    expect(await new FileCommentModel(serverDB, otherUserId, ws.id).delete(comment.id)).toBe(false);
    expect(await authorModel.delete(comment.id)).toBe(true);
    expect(await authorModel.listByFileId(fileId)).toEqual([]);
  });

  it('removes comments when the file is deleted', async () => {
    const model = new FileCommentModel(serverDB, userId);
    await model.create({ anchor: { x: 0.5, y: 0.5 }, content: 'x', fileId });

    await serverDB.delete(files);

    expect(await serverDB.select().from(fileComments)).toEqual([]);
  });
});
