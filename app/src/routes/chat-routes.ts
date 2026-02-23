import { Router } from "express";
import { setAccessControl } from "../utils/utils";
import ChatController from "../controllers/chat-controller";

const chatRoutes = Router();

// All chat routes require authenticated users (type 1 = admin, 2 = staff, 3 = regular user)
const auth = setAccessControl("1,2,3");

// ─── Conversations ────────────────────────────────────────────────────────────
chatRoutes.get("/chat/conversations", auth, ChatController.listConversations);
chatRoutes.post("/chat/conversations", auth, ChatController.createConversation);
chatRoutes.get("/chat/conversations/:id", auth, ChatController.getConversation);
chatRoutes.patch("/chat/conversations/:id", auth, ChatController.updateConversation);
chatRoutes.delete("/chat/conversations/:id", auth, ChatController.deleteConversation);

// ─── Messages ─────────────────────────────────────────────────────────────────
chatRoutes.post("/chat/conversations/:id/messages", auth, ChatController.sendMessage);
chatRoutes.get("/chat/conversations/:id/messages", auth, ChatController.getMessages);
chatRoutes.delete("/chat/conversations/:id/messages", auth, ChatController.clearMessages);

export default chatRoutes;

