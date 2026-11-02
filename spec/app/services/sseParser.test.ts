import { parseSse, type SseFrame } from '@src/app/services/sseParser';

const encoder = new TextEncoder();
const FIXTURE =
  'event: start\r\ndata: {"result_id":"r1"}\r\n\r\nevent: message\r\ndata: {"text":"Café"}\r\n\r\n';
const EXPECTED: SseFrame[] = [
  { event: 'start', data: '{"result_id":"r1"}' },
  { event: 'message', data: '{"text":"Café"}' },
];

function streamOf(...chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk));
      controller.close();
    },
  });
}

async function collect(body: ReadableStream<Uint8Array>): Promise<SseFrame[]> {
  const frames: SseFrame[] = [];
  for await (const frame of parseSse(body)) frames.push(frame);
  return frames;
}

describe('parseSse', () => {
  it('should parse CRLF frames', async () => {
    expect(await collect(streamOf(encoder.encode(FIXTURE)))).toEqual(EXPECTED);
  });

  it('should parse LF and CR line endings the same', async () => {
    const lf = FIXTURE.replace(/\r\n/g, '\n');
    const cr = FIXTURE.replace(/\r\n/g, '\r');
    expect(await collect(streamOf(encoder.encode(lf)))).toEqual(EXPECTED);
    expect(await collect(streamOf(encoder.encode(cr)))).toEqual(EXPECTED);
  });

  it('should give the same frames for every chunk split', async () => {
    const bytes = encoder.encode(FIXTURE);
    for (let k = 1; k < bytes.length; k += 1) {
      const frames = await collect(streamOf(bytes.slice(0, k), bytes.slice(k)));
      expect(frames).toEqual(EXPECTED);
    }
  });

  it('should join multi-line data with a newline', async () => {
    const body = streamOf(encoder.encode('event: x\ndata: a\ndata: b\n\n'));
    expect(await collect(body)).toEqual([{ event: 'x', data: 'a\nb' }]);
  });

  it('should default the event to "message"', async () => {
    const body = streamOf(encoder.encode('data: hi\n\n'));
    expect(await collect(body)).toEqual([{ event: 'message', data: 'hi' }]);
  });

  it('should ignore comment lines', async () => {
    const body = streamOf(encoder.encode(': ping\nevent: x\ndata: 1\n\n'));
    expect(await collect(body)).toEqual([{ event: 'x', data: '1' }]);
  });

  it('should ignore frames with no data', async () => {
    const body = streamOf(
      encoder.encode('event: ping\n\nevent: x\ndata: 1\n\n')
    );
    expect(await collect(body)).toEqual([{ event: 'x', data: '1' }]);
  });

  it('should dispatch a final frame with no trailing blank line', async () => {
    const body = streamOf(encoder.encode('event: end\ndata: {}'));
    expect(await collect(body)).toEqual([{ event: 'end', data: '{}' }]);
  });

  it('should release the reader lock when the consumer stops early', async () => {
    const body = streamOf(encoder.encode(FIXTURE));

    for await (const frame of parseSse(body)) {
      expect(frame.event).toBe('start');
      break;
    }
    expect(() => body.getReader()).not.toThrow();
  });
});
