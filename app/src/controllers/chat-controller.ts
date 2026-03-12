import type { Request, Response } from "express";
import mongoose from "mongoose";
import ChatConversations from "../db/models/chat-conversations";
import ChatMessages from "../db/models/chat-messages";
import { error_function, success_function } from "../utils/response-handler";
import { handleControllerError } from "../utils/utils";
import { chatAgent } from "../ai/agents/chat-agent";
import {
    createConversationSchema,
    sendMessageSchema,
    updateConversationSchema,
} from "../schemas/chat-schema";

// System prompt and model are now configured in the chat agent (src/ai/agents/chat-agent.ts)


const ChatController = {
    /**
     * GET /chat/conversations
     * List all conversations for the authenticated user.
     */
    listConversations: async (req: Request, res: Response) => {
        try {
            const { page, limit } = req.query;
            const userId = req.user!._id;

            const pageNum = Number(page) || 1;
            const limitNum = Number(limit) || 20;

            const [conversations, count] = await Promise.all([
                ChatConversations.find({ user: userId, deleted: { $ne: true } })
                    .sort({ updatedAt: -1 })
                    .skip((pageNum - 1) * limitNum)
                    .limit(limitNum),
                ChatConversations.countDocuments({ user: userId, deleted: { $ne: true } }),
            ]);

            return res.status(200).json(
                success_function({
                    status: 200,
                    message: "Conversations fetched successfully",
                    data: { conversations, page: pageNum, limit: limitNum, count },
                })
            );
        } catch (error) {
            handleControllerError({ error, res });
        }
    },

    /**
     * POST /chat/conversations
     * Create a new conversation thread.
     */
    createConversation: async (req: Request, res: Response) => {
        const parsed = createConversationSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json(
                error_function({ status: 400, message: parsed.error.issues })
            );
        }

        try {
            const userId = req.user!._id;
            const { title, session, systemPrompt } = parsed.data;

            const conversation = await ChatConversations.create({
                user: userId,
                title: title ?? "New Conversation",
                session: session ?? null,
                systemPrompt: systemPrompt ?? null,
            });

            return res.status(201).json(
                success_function({
                    status: 201,
                    message: "Conversation created successfully",
                    data: conversation,
                })
            );
        } catch (error) {
            handleControllerError({ error, res });
        }
    },

    /**
     * GET /chat/conversations/:id
     * Get a single conversation with its messages.
     */
    getConversation: async (req: Request, res: Response) => {
        try {
            const id = req?.params?.id as string | undefined;

            if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json(
                    error_function({ status: 400, message: "Invalid conversation ID" })
                );
            }

            const conversation = await ChatConversations.findOne({
                _id: id,
                user: req.user!._id,
                deleted: { $ne: true },
            });

            if (!conversation) {
                return res.status(404).json(
                    error_function({ status: 404, message: "Conversation not found" })
                );
            }

            const messages = await ChatMessages.find({ conversation: id }).sort({
                createdAt: 1,
            });

            return res.status(200).json(
                success_function({
                    status: 200,
                    message: "Conversation fetched successfully",
                    data: { conversation, messages },
                })
            );
        } catch (error) {
            handleControllerError({ error, res });
        }
    },

    /**
     * PATCH /chat/conversations/:id
     * Update conversation title or system prompt.
     */
    updateConversation: async (req: Request, res: Response) => {
        const parsed = updateConversationSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json(
                error_function({ status: 400, message: parsed.error.issues })
            );
        }

        try {
            const id = req?.params?.id as string | undefined;

            if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json(
                    error_function({ status: 400, message: "Invalid conversation ID" })
                );
            }

            const conversation = await ChatConversations.findOneAndUpdate(
                { _id: id, user: req.user!._id, deleted: { $ne: true } },
                { $set: parsed.data },
                { new: true }
            );

            if (!conversation) {
                return res.status(404).json(
                    error_function({ status: 404, message: "Conversation not found" })
                );
            }

            return res.status(200).json(
                success_function({
                    status: 200,
                    message: "Conversation updated successfully",
                    data: conversation,
                })
            );
        } catch (error) {
            handleControllerError({ error, res });
        }
    },

    /**
     * DELETE /chat/conversations/:id
     * Soft-delete a conversation.
     */
    deleteConversation: async (req: Request, res: Response) => {
        try {
            const id = req?.params?.id as string | undefined;

            if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json(
                    error_function({ status: 400, message: "Invalid conversation ID" })
                );
            }

            const conversation = await ChatConversations.findOneAndUpdate(
                { _id: id, user: req.user!._id, deleted: { $ne: true } },
                { $set: { deleted: true } },
                { new: true }
            );

            if (!conversation) {
                return res.status(404).json(
                    error_function({ status: 404, message: "Conversation not found" })
                );
            }

            return res.status(200).json(
                success_function({
                    status: 200,
                    message: "Conversation deleted successfully",
                    data: null,
                })
            );
        } catch (error) {
            handleControllerError({ error, res });
        }
    },

    // ─── Messages ─────────────────────────────────────────────────────────────

    /**
     * POST /chat/conversations/:id/messages
     * Send a user message; the LLM reply is generated and saved automatically.
     *
     * Body: { message: string, model?: string }
     */
    sendMessage: async (req: Request, res: Response) => {
        const parsed = sendMessageSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json(
                error_function({ status: 400, message: parsed.error.issues })
            );
        }

        try {
            const id = req?.params?.id as string | undefined;

            if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json(
                    error_function({ status: 400, message: "Invalid conversation ID" })
                );
            }

            const conversation = await ChatConversations.findOne({
                _id: id,
                user: req.user!._id,
                deleted: { $ne: true },
            });

            if (!conversation) {
                return res.status(404).json(
                    error_function({ status: 404, message: "Conversation not found" })
                );
            }

            const { message } = parsed.data;
            const userId = req.user!._id.toString();

            // Persist the user's message in MongoDB
            const userMessage = await ChatMessages.create({
                conversation: id,
                role: "user",
                content: message,
            });

            // Build generate options — memory handles conversation history automatically
            const generateOptions: Record<string, any> = {
                memory: {
                    thread: id as string,
                    resource: userId,
                },
            };

            // Override system prompt if the conversation has a custom one
            if (conversation.systemPrompt) {
                generateOptions.instructions = conversation.systemPrompt;
            }

            // Call the agent — Mastra Memory recalls prior messages automatically
            const result = await chatAgent.generate(message, generateOptions);

            // Persist the assistant reply in MongoDB
            const assistantMessage = await ChatMessages.create({
                // @ts-ignore
                conversation: id,
                role: "assistant",
                content: result.text,
                usage: {
                    promptTokens: (result.usage as any)?.promptTokens ?? null,
                    completionTokens: (result.usage as any)?.completionTokens ?? null,
                    totalTokens: (result.usage as any)?.totalTokens ?? null,
                },
                finishReason: result.finishReason ?? null,
            });

            // Bump conversation updatedAt
            await ChatConversations.findByIdAndUpdate(id, { updatedAt: new Date() });

            return res.status(200).json(
                success_function({
                    status: 200,
                    message: "Message sent successfully",
                    data: {
                        userMessage,
                        assistantMessage,
                    },
                })
            );
        } catch (error) {
            handleControllerError({ error, res });
        }
    },

    /**
     * GET /chat/conversations/:id/messages
     * List all messages in a conversation.
     */
    getMessages: async (req: Request, res: Response) => {
        try {
            const id = req?.params?.id as string | undefined;

            if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json(
                    error_function({ status: 400, message: "Invalid conversation ID" })
                );
            }

            // Ensure the conversation belongs to the requesting user
            const exists = await ChatConversations.exists({
                _id: id,
                user: req.user!._id,
                deleted: { $ne: true },
            });

            if (!exists) {
                return res.status(404).json(
                    error_function({ status: 404, message: "Conversation not found" })
                );
            }

            const { page, limit } = req.query;
            const pageNum = Number(page) || 1;
            const limitNum = Number(limit) || 50;

            const [messages, count] = await Promise.all([
                ChatMessages.find({ conversation: id })
                    .sort({ createdAt: 1 })
                    .skip((pageNum - 1) * limitNum)
                    .limit(limitNum),
                ChatMessages.countDocuments({ conversation: id }),
            ]);

            return res.status(200).json(
                success_function({
                    status: 200,
                    message: "Messages fetched successfully",
                    data: { messages, page: pageNum, limit: limitNum, count },
                })
            );
        } catch (error) {
            handleControllerError({ error, res });
        }
    },

    /**
     * DELETE /chat/conversations/:id/messages
     * Clear all messages in a conversation (reset history).
     */
    clearMessages: async (req: Request, res: Response) => {
        try {
            const id = req?.params?.id as string | undefined;

            if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json(
                    error_function({ status: 400, message: "Invalid conversation ID" })
                );
            }

            const exists = await ChatConversations.exists({
                _id: id,
                user: req.user!._id,
                deleted: { $ne: true },
            });

            if (!exists) {
                return res.status(404).json(
                    error_function({ status: 404, message: "Conversation not found" })
                );
            }

            await ChatMessages.deleteMany({ conversation: id });

            return res.status(200).json(
                success_function({
                    status: 200,
                    message: "Conversation history cleared",
                    data: null,
                })
            );
        } catch (error) {
            handleControllerError({ error, res });
        }
    },
};

export default ChatController;

