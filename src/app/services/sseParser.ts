/** One server-sent event: its name (`message` when the frame names none) and its data lines joined. */
export interface SseFrame {
  event: string;
  data: string;
}

const LINE_BREAK = /\r\n|\r|\n/;

/**
 * Reads server-sent events from a `fetch` response body. `EventSource` can't send a POST, so the
 * agent endpoints are read this way.
 *
 * Follows the SSE line rules: CRLF, LF or CR end a line, a blank line ends a frame, `data:` lines
 * join with `\n`, and lines starting with `:` are comments. A frame with no data is skipped. Bytes
 * are decoded as a stream, so a frame or a character split across chunks parses the same.
 */
export async function* parseSse(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<SseFrame> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let event = '';
  let data: string[] = [];

  function takeFrame(): SseFrame | null {
    const frame =
      data.length > 0
        ? { event: event || 'message', data: data.join('\n') }
        : null;
    event = '';
    data = [];
    return frame;
  }

  function readLine(line: string): SseFrame | null {
    if (line === '') return takeFrame();
    if (line.startsWith(':')) return null;

    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    if (field === 'event') event = value;
    else if (field === 'data') data.push(value);
    return null;
  }

  let done = false;
  try {
    while (!done) {
      const result = await reader.read();
      done = result.done;
      buffer += done
        ? decoder.decode()
        : decoder.decode(result.value, { stream: true });

      let match = LINE_BREAK.exec(buffer);
      while (match) {
        // A CR that ends the buffer may be the first half of a CRLF still on its way.
        if (!done && match[0] === '\r' && match.index === buffer.length - 1) {
          break;
        }
        const frame = readLine(buffer.slice(0, match.index));
        buffer = buffer.slice(match.index + match[0].length);
        if (frame) yield frame;
        match = LINE_BREAK.exec(buffer);
      }
    }

    // The stream ended without a final blank line.
    if (buffer !== '') readLine(buffer);
    const last = takeFrame();
    if (last) yield last;
  } finally {
    // Stopped before the end (the caller broke out, or got what it needed): close the response
    // rather than leave the connection open until the server closes it.
    if (!done) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
