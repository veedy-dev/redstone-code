/**
 * OpenAI-Compatible Fetch Adapter
 *
 * Intercepts fetch calls from the Anthropic SDK and routes them to
 * any OpenAI-compatible endpoint, translating between Anthropic Messages API
 * format and OpenAI Chat Completions API format.
 *
 * Supports:
 * - Text messages (user/assistant)
 * - System prompts
 * - Tool definitions and tool calls
 * - Streaming (SSE)
 */

type AnthropicMessage = {
  role: string
  content: string | Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown; tool_use_id?: string; content?: string | Array<{ type: string; text?: string }> }>
}

type OpenAIMessage = {
  role: string
  content?: string | null
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>
  tool_call_id?: string
}

function translateMessages(
  system: string | Array<{ type: string; text?: string }> | undefined,
  messages: AnthropicMessage[],
): OpenAIMessage[] {
  const result: OpenAIMessage[] = []

  if (system) {
    const systemText = typeof system === 'string'
      ? system
      : system.filter(b => b.type === 'text').map(b => b.text).join('\n')
    if (systemText) {
      result.push({ role: 'system', content: systemText })
    }
  }

  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      result.push({ role: msg.role, content: msg.content })
      continue
    }

    if (!Array.isArray(msg.content)) continue

    if (msg.role === 'assistant') {
      const textParts = msg.content.filter(b => b.type === 'text').map(b => b.text || '').join('')
      const toolCalls = msg.content.filter(b => b.type === 'tool_use').map(b => ({
        id: b.id!,
        type: 'function' as const,
        function: { name: b.name!, arguments: JSON.stringify(b.input || {}) },
      }))

      const openAIMsg: OpenAIMessage = { role: 'assistant', content: textParts || null }
      if (toolCalls.length > 0) openAIMsg.tool_calls = toolCalls
      result.push(openAIMsg)
    } else if (msg.role === 'user') {
      for (const block of msg.content) {
        if (block.type === 'text') {
          result.push({ role: 'user', content: block.text || '' })
        } else if (block.type === 'tool_result') {
          const resultContent = typeof block.content === 'string'
            ? block.content
            : Array.isArray(block.content)
              ? block.content.filter(b => b.type === 'text').map(b => b.text || '').join('')
              : ''
          result.push({ role: 'tool', content: resultContent, tool_call_id: block.tool_use_id! })
        }
      }
    }
  }

  return result
}

function translateTools(tools: Array<{ name: string; description?: string; input_schema?: unknown }> | undefined) {
  if (!tools || tools.length === 0) return undefined
  return tools.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description || '',
      parameters: t.input_schema || { type: 'object', properties: {} },
    },
  }))
}

type StreamState = {
  blockIndex: number
  hadToolCalls: boolean
  textBlockStarted: boolean
}

function translateStreamChunk(line: string, state: StreamState): string[] {
  if (!line.startsWith('data: ')) return []
  const data = line.slice(6).trim()
  if (data === '[DONE]') {
    const stopReason = state.hadToolCalls ? 'tool_use' : 'end_turn'
    const events: string[] = []
    if (state.textBlockStarted || !state.hadToolCalls) {
      events.push(`event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: state.blockIndex })}\n`)
    }
    events.push(
      `event: message_delta\ndata: ${JSON.stringify({ type: 'message_delta', delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 0 } })}\n`,
      `event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n`,
    )
    return events
  }

  let chunk: any
  try { chunk = JSON.parse(data) } catch { return [] }

  const events: string[] = []
  const choice = chunk.choices?.[0]
  if (!choice) return []

  const delta = choice.delta
  if (!delta) return []

  if (delta.content) {
    if (!state.textBlockStarted) {
      events.push(
        `event: content_block_start\ndata: ${JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })}\n`
      )
      state.textBlockStarted = true
    }
    events.push(
      `event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: delta.content } })}\n`
    )
  }

  if (delta.tool_calls) {
    state.hadToolCalls = true
    for (const tc of delta.tool_calls) {
      if (tc.function?.name) {
        state.blockIndex++
        events.push(
          `event: content_block_start\ndata: ${JSON.stringify({ type: 'content_block_start', index: state.blockIndex, content_block: { type: 'tool_use', id: tc.id || `call_${state.blockIndex}`, name: tc.function.name } })}\n`
        )
      }
      if (tc.function?.arguments) {
        events.push(
          `event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', index: state.blockIndex, delta: { type: 'input_json_delta', partial_json: tc.function.arguments } })}\n`
        )
      }
    }
  }

  if (choice.finish_reason) {
    events.push(
      `event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: state.blockIndex })}\n`
    )
  }

  return events
}

export function createOpenAIFetch(baseUrl: string, apiKey?: string) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = input instanceof Request ? input.url : String(input)

    if (!url.includes('/v1/messages')) {
      return globalThis.fetch(input, init)
    }

    let anthropicBody: Record<string, unknown>
    try {
      const bodyText =
        init?.body instanceof ReadableStream
          ? await new Response(init.body).text()
          : typeof init?.body === 'string'
            ? init.body
            : '{}'
      anthropicBody = JSON.parse(bodyText)
    } catch {
      anthropicBody = {}
    }

    const openAIMessages = translateMessages(
      anthropicBody.system as any,
      (anthropicBody.messages || []) as AnthropicMessage[],
    )
    const openAITools = translateTools(anthropicBody.tools as any)

    const model = process.env.OPENAI_MODEL || (anthropicBody.model as string) || 'default'

    const openAIBody: Record<string, unknown> = {
      model,
      messages: openAIMessages,
      stream: true,
      stream_options: { include_usage: true },
    }
    if (openAITools) openAIBody.tools = openAITools
    if (anthropicBody.max_tokens) openAIBody.max_tokens = anthropicBody.max_tokens
    if (anthropicBody.temperature !== undefined) openAIBody.temperature = anthropicBody.temperature

    const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    }
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    const openAIResponse = await globalThis.fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(openAIBody),
      signal: init?.signal,
    })

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text()
      return new Response(errorText, {
        status: openAIResponse.status,
        statusText: openAIResponse.statusText,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const streamState: StreamState = { blockIndex: 0, hadToolCalls: false, textBlockStarted: false }

    const messageStartEvent = JSON.stringify({
      type: 'message_start',
      message: {
        id: `msg_openai_${Date.now()}`,
        type: 'message',
        role: 'assistant',
        content: [],
        model,
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      },
    })

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    if (!openAIResponse.body) {
      return new Response('No response body', { status: 502, headers: { 'Content-Type': 'text/plain' } })
    }
    const reader = openAIResponse.body.getReader()
    let buffer = ''

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`event: message_start\ndata: ${messageStartEvent}\n\n`))

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed) continue
              const events = translateStreamChunk(trimmed, streamState)
              for (const event of events) {
                controller.enqueue(encoder.encode(event + '\n'))
              }
            }
          }

          if (buffer.trim()) {
            const events = translateStreamChunk(buffer.trim(), streamState)
            for (const event of events) {
              controller.enqueue(encoder.encode(event + '\n'))
            }
          }
        } catch (err) {
          controller.error(err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Transfer-Encoding': 'chunked',
      },
    })
  }
}
