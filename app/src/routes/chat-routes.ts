import { Router } from "express";
import { setAccessControl } from "../utils/utils";
import ChatController from "../controllers/chat-controller";

const chatRoutes = Router();

const auth = setAccessControl("1,2,3");

chatRoutes.get("/chat/conversations", auth, ChatController.listConversations);
chatRoutes.post("/chat/conversations", auth, ChatController.createConversation);
chatRoutes.get("/chat/conversations/:id", auth, ChatController.getConversation);
chatRoutes.patch("/chat/conversations/:id", auth, ChatController.updateConversation);
chatRoutes.delete("/chat/conversations/:id", auth, ChatController.deleteConversation);

chatRoutes.post("/chat/conversations/:id/messages", auth, ChatController.sendMessage);
chatRoutes.get("/chat/conversations/:id/messages", auth, ChatController.getMessages);
chatRoutes.delete("/chat/conversations/:id/messages", auth, ChatController.clearMessages);

export default chatRoutes;

