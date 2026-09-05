import { INGESTION_LIMITS } from './types.ts'

export type FetchResult =
  | { ok: true; body: string; contentType: string | null }
  | { ok: false; error: string }

export async function fetchWithLimits(
  url: string,
  options: {
    timeoutMs?: number
    maxBytes?: number
    headers?: Record<string, string>
  } = {},
): Promise<FetchResult> {
  const timeoutMs = options.timeoutMs ?? INGESTION_LIMITS.fetchTimeoutMs
  const maxBytes = options.maxBytes ?? INGESTION_LIMITS.maxResponseBytes

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        'User-Agent': 'NexoraIngestion/1.0 (+https://nexora.dev)',
        ...options.headers,
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status} ${response.statusText}` }
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength && Number(contentLength) > maxBytes) {
      return { ok: false, error: `Response too large: ${contentLength} bytes` }
    }

    const reader = response.body?.getReader()
    if (!reader) {
      return { ok: false, error: 'Empty response body' }
    }

    const chunks: Uint8Array[] = []
    let received = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue

      received += value.byteLength
      if (received > maxBytes) {
        await reader.cancel()
        return { ok: false, error: `Response exceeded ${maxBytes} bytes` }
      }
      chunks.push(value)
    }

    const body = new TextDecoder('utf-8', { fatal: false }).decode(
      concatUint8Arrays(chunks, received),
    )

    return {
      ok: true,
      body,
      contentType: response.headers.get('content-type'),
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, error: `Request timed out after ${timeoutMs}ms` }
    }
    return { ok: false, error: error instanceof Error ? error.message : 'Fetch failed' }
  } finally {
    clearTimeout(timeout)
  }
}

function concatUint8Arrays(chunks: Uint8Array[], totalLength: number): Uint8Array {
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}
