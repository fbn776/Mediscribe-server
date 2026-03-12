import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import morgan from "morgan";
import {connectDB} from "./db/config";
import authRouter from "./routes/auth-routes";
import userRouter from "./routes/users-routes";
import http from "http";
// import {dev_websocket_logger} from "./dev/logs/dev_websocket_logger";
import devRouter from "./routes/dev-routes";
import patientsRoutes from "./routes/patients-routes";
import sessionRoutes from "./routes/session-routes";
import chatRoutes from "./routes/chat-routes";
import dashboardRoutes from "./routes/dashboard-routes";
import {createSTTWebSocketServer} from "./ai/stt-handler";
import fs from 'fs';
import path from 'path';

require('dotenv').config();

const app = express();

const server = http.createServer(app);
const env = process.env.ENVIRONMENT || 'development';


if (env === 'development') {
    app.use(morgan('dev'));
    // dev_websocket_logger(env, server);
}

// delay: TODO - for testing purposes only
// app.use(function (req, res, next) {
//     setTimeout(next, 1000);
// });

app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));
app.use(express.json());

app.use(cors({
    origin: ["http://localhost:3000"],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
}));

// app.use(cors({
//     "origin": "*",
//     "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
//     "preflightContinue": false,
//     "optionsSuccessStatus": 204
// }));

app.use('/system_generated', express.static(__dirname + '/system_generated'));
app.use('/uploads', express.static(__dirname + '/uploads'));

app.use('/public', express.static(__dirname + '/public'));

if (env === "development") {
    app.use('/dev', express.static(__dirname + '/dev'));
}

// Initialize uploads directory structure
function initializeUploadsDirectory() {
    const uploadsDir = path.join(__dirname, '../uploads');
    const documentsDir = path.join(uploadsDir, 'documents');
    const patientsDir = path.join(documentsDir, 'patients');
    const sessionsDir = path.join(documentsDir, 'sessions');

    // Create directories if they don't exist
    [uploadsDir, documentsDir, patientsDir, sessionsDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`[Uploads] Created directory: ${dir}`);
        }
    });

    console.log('[Uploads] Directory structure initialized');
}

// Initialize uploads directory before connecting to DB
initializeUploadsDirectory();

connectDB();

createSTTWebSocketServer(server, "/stt");

//Invoking server port connection
server.listen(process.env.NODE_PORT, () => {
    console.log(`Server listening on port ${process.env.NODE_PORT}`);
    if (env === 'development') {
        console.log(`WebSocket server ready at ws://localhost:${process.env.NODE_PORT}`);
    }

});

app.get('/is-dev', (req, res) => {
    let response = {
        "success": true,
        "status": 200,
        "message": "Environment fetched successfully",
        "data": {
            environment: env,
            isDev: env === 'development'
        }
    }
    res.status(200).send(response);
});

app.use(authRouter);
app.use(userRouter);
app.use(patientsRoutes);
app.use(sessionRoutes);
app.use(chatRoutes);
app.use(dashboardRoutes);


if( env === 'development'){
    app.use(devRouter);
}


//health check API
app.get('/platform/status', (req, res) => {
    let response = {
        "success": true,
        "status": 200,
        "message": "All systems operational",
        "data": null
    }
    res.status(200).send(response);
});

//404 implementation
app.use(function (req, res) {
    let response = {
        "success": false,
        "status": 404,
        "message": "API not found",
        "data": null
    }
    res.status(404).send(response);
});
