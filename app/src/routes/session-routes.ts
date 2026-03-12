import { Router } from "express";
import { setAccessControl } from "../utils/utils";
import SessionController from "../controllers/session-controller";
import SOAPController from "../controllers/soap-controller";
const { parseMultipartForm } = require("../utils/middlewares/upload-middleware");

const SessionRoutes = Router();


SessionRoutes.get('/sessions/documents/:sessionID', setAccessControl('1,2'), SessionController.getSessionDocuments);
SessionRoutes.get('/sessions/documents/download/:docID', setAccessControl('1,2,3'), SessionController.downloadSessionDocument);
SessionRoutes.post('/sessions/documents/upload/:sessionID', setAccessControl('1,2,3'), parseMultipartForm, SessionController.uploadSessionDocument);


SessionRoutes.get("/sessions", setAccessControl('1,2,3'), SessionController.getAll);
SessionRoutes.get("/sessions/:id", setAccessControl('1,2,3'), SessionController.getById);
SessionRoutes.post("/sessions", setAccessControl('1,2,3'), SessionController.createOne);
SessionRoutes.put("/sessions/:id", setAccessControl('1,2,3'), SessionController.updateById);
SessionRoutes.delete("/sessions/:id", setAccessControl('1,2,3'), SessionController.deleteById);

SessionRoutes.get("/sessions/transcripts/:sessionID", SessionController.getSessionTranscripts);

SessionRoutes.patch("/sessions/note/:id", setAccessControl('1,2,3'), SessionController.updateSessionNote);

SessionRoutes.get("/sessions/:id/soap", setAccessControl('1,2,3'), SOAPController.generateSOAP);


export default SessionRoutes;