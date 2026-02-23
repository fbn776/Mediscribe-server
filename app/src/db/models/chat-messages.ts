import mongoose from "mongoose";

/**
 * A single message inside a chat conversation.
 * role: "user" | "assistant" | "system"
 */
const chatMessagesSchema = new mongoose.Schema(
    {
        conversation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "chat_conversations",
            required: true,
            index: true,
        },
        role: {
            type: String,
            enum: ["user", "assistant", "system"],
            required: true,
        },
        content: { type: String, required: true },
        // Token usage reported back by the provider for assistant messages
        usage: {
            promptTokens: { type: Number, default: null },
            completionTokens: { type: Number, default: null },
            totalTokens: { type: Number, default: null },
        },
        // Finish reason (stop, length, content_filter, …)
        finishReason: { type: String, default: null },
    },
    { timestamps: true }
);

const ChatMessages = mongoose.model("chat_messages", chatMessagesSchema);

export default ChatMessages;

