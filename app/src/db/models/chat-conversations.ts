import mongoose from "mongoose";

/**
 * Represents a single LLM chat thread owned by a user.
 * A conversation holds many messages (see chat-messages model).
 */
const chatConversationsSchema = new mongoose.Schema(
    {
        title: { type: String, default: "New Conversation" },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true, index: true },
        // Optional link to a clinical session
        session: { type: mongoose.Schema.Types.ObjectId, ref: "sessions", default: null },
        // System prompt override for this conversation
        systemPrompt: { type: String, default: null },
        deleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const ChatConversations = mongoose.model("chat_conversations", chatConversationsSchema);

export default ChatConversations;

