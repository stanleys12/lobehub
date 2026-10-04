/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImagePixelsUnavailableError, renderImageToBlob } from './exportImage';

const createCtx = () => ({
  beginPath: vi.fn(),
  drawImage: vi.fn(),
  imageSmoothingQuality: 'low',
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  restore: vi.fn(),
  save: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
  strokeRect: vi.fn(),
});

const source = { naturalHeight: 1000, naturalWidth: 2000 } as unknown as HTMLImageElement;

describe('renderImageToBlob', () => {
  let ctx: ReturnType<typeof createCtx>;
  let canvases: HTMLCanvasElement[];
  let tainted: boolean;

  beforeEach(() => {
    ctx = createCtx();
    canvases = [];
    tainted = false;
    const create = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      const element = create(tag);
      if (tag === 'canvas') {
        const canvas = element as HTMLCanvasElement;
        canvas.getContext = vi.fn(() => ctx) as never;
        canvas.toBlob = vi.fn((callback: BlobCallback, type?: string) => {
          if (tainted)
            throw new DOMException('Tainted canvases may not be exported.', 'SecurityError');
          callback(new Blob(['png'], { type }));
        }) as never;
        canvases.push(canvas);
      }
      return element;
    }) as typeof document.createElement);
  });

  afterEach(() => vi.restoreAllMocks());

  it('exports the full image at natural size by default', async () => {
    const blob = await renderImageToBlob(source);

    expect(blob.type).toBe('image/png');
    expect(canvases[0].width).toBe(2000);
    expect(canvases[0].height).toBe(1000);
    expect(ctx.drawImage).toHaveBeenCalledWith(source, 0, 0, 2000, 1000, 0, 0, 2000, 1000);
    expect(ctx.strokeRect).not.toHaveBeenCalled();
  });

  it('crops and scales to the requested output size', async () => {
    await renderImageToBlob(source, {
      crop: { height: 0.5, width: 0.25, x: 0.5, y: 0.25 },
      output: { height: 250, width: 250 },
    });

    expect(canvases[0].width).toBe(250);
    expect(ctx.drawImage).toHaveBeenCalledWith(source, 1000, 250, 500, 500, 0, 0, 250, 250);
  });

  it('burns annotations into the exported pixels', async () => {
    await renderImageToBlob(source, {
      shapes: [
        {
          color: '#f00',
          rect: { height: 0.1, width: 0.1, x: 0.1, y: 0.1 },
          size: 0.01,
          type: 'rect',
        },
      ],
    });

    expect(ctx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, -0, -0);
    expect(ctx.strokeRect).toHaveBeenCalledWith(200, 100, 200, 100);
  });

  it('reports unreadable pixels when the canvas is tainted', async () => {
    tainted = true;

    await expect(renderImageToBlob(source)).rejects.toBeInstanceOf(ImagePixelsUnavailableError);
  });
});
