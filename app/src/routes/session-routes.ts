import {Router} from "express";
import {setAccessControl} from "../utils/utils";
import SessionController from "../controllers/session-controller";

const SessionRoutes = Router();

SessionRoutes.get("/sessions", setAccessControl('1,2,3'), SessionController.getAll);
SessionRoutes.get("/sessions/:id", setAccessControl('1,2,3'), SessionController.getById);
SessionRoutes.post("/sessions", setAccessControl('1,2,3'), SessionController.createOne);
SessionRoutes.put("/sessions/:id", setAccessControl('1,2,3'), SessionController.updateById);
SessionRoutes.delete("/sessions/:id", setAccessControl('1,2,3'), SessionController.deleteById);


SessionRoutes.patch("/sessions/note/:id", setAccessControl('1,2,3'), SessionController.updateSessionNote);


export default SessionRoutes;