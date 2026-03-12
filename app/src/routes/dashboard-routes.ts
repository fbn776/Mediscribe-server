import {Router} from "express";
import {setAccessControl} from "../utils/utils";
import {getDashboardMetrics} from "../controllers/dashboard-controller";

const dashboardRoutes = Router();

dashboardRoutes.get("/dashboard", setAccessControl("1"), getDashboardMetrics);

export default dashboardRoutes;