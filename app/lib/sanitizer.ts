/**
 * Sanitizes user input before passing it into LLM prompt templates
 * to prevent prompt injection and control sequence breaking.
 */
export function sanitizePromptInput(input: string): string {
    if (!input || typeof input !== 'string') return '';

    return input
        // Remove control characters except standard whitespace
        .replace(/[\x00-\x09\x0B-\x1F\x7F]/g, '')
        // Strip common system prompt override attempts
        .replace(/ignore\s+(previous|above)\s+instructions/gi, '[filtered]')
        .replace(/system\s*:/gi, 'system_label:')
        // Limit length to prevent buffer exhaustion / token flooding
        .slice(0, 2000)
        .trim();
}