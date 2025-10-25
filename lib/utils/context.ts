/**
 * Context helpers: token counting and trimming messages to fit model context windows.
 * Tries to use `js-tiktoken` when available for accurate token counts and falls back
 * to a character-based heuristic when not available.
 */

 
// Map of common model context sizes. Adjust as needed for accuracy.
const MODEL_CONTEXT_SIZES: Record<string, number> = {
  'gemini-2.5-flash': 32768,
  'gemini-2.1': 32768,
  'gpt-4o': 32768,
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
}

function estimateTokens(text: string) {
  // rough heuristic: ~4 chars per token
  return Math.max(1, Math.ceil(text.length / 4))
}

function getEncoderForModelSync(model?: string) {
  try {
    // Try to load js-tiktoken synchronously. This works in Node server runtime.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { encoding_for_model } = require('js-tiktoken')
    return encoding_for_model(model || 'gpt-4')
  } catch (err) {
    return null
  }
}

export function countTokens(text: string, model?: string) {
  try {
    const enc = getEncoderForModelSync(model)
    if (enc && typeof enc.encode === 'function') {
      return enc.encode(String(text)).length
    }
  } catch (e) {
    // fallthrough to heuristic
  }

  return estimateTokens(String(text))
}

export function getModelContextSize(model?: string) {
  if (!model) return 32768
  return MODEL_CONTEXT_SIZES[model] || 32768
}

/**
 * Trim messages so total tokens <= modelMaxTokens - tokensForResponse reserve.
 * Keeps system messages and then includes the most recent messages (newest-first)
 * until the token budget is reached. Returns messages in chronological order.
 */
export function trimMessagesForContext(messages: any[], modelMaxTokens?: number, tokensForResponse = 1024, model?: string) {
  const maxTokens = modelMaxTokens || getModelContextSize(model)
  const reserve = Math.max(64, tokensForResponse)
  const allowed = Math.max(0, maxTokens - reserve)

  const systemMessages = messages.filter((m) => m.role === 'system')
  const otherMessages = messages.filter((m) => m.role !== 'system')

  let totalTokens = 0
  const chosen: any[] = []

  // Always include system messages first (they are usually small)
  for (const msg of systemMessages) {
    const t = countTokens(msg.content || '', model)
    totalTokens += t
    chosen.push(msg)
  }

  // If system messages alone exceed allowed budget, return them (could be summarized later)
  if (totalTokens >= allowed) return chosen

  // Add other messages from newest to oldest until limit reached
  for (let i = otherMessages.length - 1; i >= 0; i--) {
    const msg = otherMessages[i]
    const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content || '')
    const t = countTokens(text, model)
    if (totalTokens + t > allowed) break
    totalTokens += t
    // unshift to keep chronological order when done
    chosen.unshift(msg)
  }

  // Ensure final order: system messages first, then chosen (chronological)
  const final = [...systemMessages, ...chosen.filter((m) => m.role !== 'system')]
  return final
}

export default {
  countTokens,
  trimMessagesForContext,
  getModelContextSize,
}
