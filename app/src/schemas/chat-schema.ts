import { z } from "zod";

// ─── Conversation ────────────────────────────────────────────────────────────

export const createConversationSchema = z.object({
    title: z.string().min(1).optional(),
    session: z.string().optional(),
    systemPrompt: z.string().optional(),
});

export const updateConversationSchema = z.object({
    title: z.string().min(1).optional(),
    systemPrompt: z.string().nullable().optional(),
});

// ─── Chat / Send Message ─────────────────────────────────────────────────────

export const sendMessageSchema = z.object({
    /** The user's message text */
    message: z.string().min(1, "Message is required"),
    /**
     * Optional: override the model for this single request.
     * Defaults to the env var CHAT_MODEL or "openai/gpt-4o-mini".
     */
    model: z.string().optional(),
});

