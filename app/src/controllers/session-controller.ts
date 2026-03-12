import type {Request, Response} from "express";
import Sessions from "../db/models/sessions";
import Documents from "../db/models/documents";
import {error_function, success_function} from "../utils/response-handler";
import {handleControllerError} from "../utils/utils";
import {createSessionSchema, updateSessionSchema} from "../schemas/sessions-schema";
import mongoose from "mongoose";
import Transcripts from "../db/models/transcripts";
import { fileUpload } from "../utils/file-manager";
import { processDocument } from "../ai/utils/process-document";
import path from "path";
import fs from "fs";

const SessionController = {
    getAll: async (req: Request, res: Response) => {
        try {
            const {keyword, startedAt, endedAt, patient, page, limit} = req?.query;

            const filters: any[] = [];

            if (keyword) {
                filters.push({
                    $or: [
                        {title: {$regex: keyword as string, $options: 'i'}},
                    ]
                });
            }

            if (startedAt) {
                filters.push({createdAt: {$gte: new Date(startedAt as string)}});
            }

            if (endedAt) {
                filters.push({endedAt: {$lte: new Date(endedAt as string)}});
            }

            if (patient) {
                filters.push({patient: patient});
            }

            filters.push({
                added_by: req?.user?._id
            })

            const queryFilter = filters.length > 0 ? {$and: filters} : {};

            const [sessions, count] = await Promise.all([
                Sessions.find(queryFilter)
                    .skip(((Number(page) || 1) - 1) * (Number(limit) || 10))
                    .limit(Number(limit) || 10),
                Sessions.countDocuments(queryFilter)
            ]);


            res.status(200).json(success_function({
                status: 200,
                message: "Sessions fetched successfully",
                data: {
                    sessions: sessions,
                    page: Number(page) || 1,
                    limit: Number(limit) || 10,
                    count: count
                }
            }));
        } catch (error) {
            handleControllerError({res, error});
        }
    },

    getById: async (req: Request, res: Response) => {
        try {
            const {id} = req.params;

            if (!id || Array.isArray(id) || !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).send(error_function({
                    status: 400,
                    message: "Invalid session ID"
                }));
            }

            const session = await Sessions.findById(id);

            if (!session) {
                return res.status(404).send(error_function({
                    status: 404,
                    message: "Session not found"
                }));
            }

            res.status(200).json(success_function({
                status: 200,
                message: "Session fetched successfully",
                data: session
            }));
        } catch (error) {
            handleControllerError({res, error});
        }
    },

    createOne: async (req: Request, res: Response) => {
        try {
            const sessionBody = createSessionSchema.safeParse(req.body);

            if (!sessionBody.success) {
                return res.status(400).send(error_function({
                    status: 400,
                    message: "Invalid data",
                    data: sessionBody.error.issues
                }));
            }

            const data = sessionBody.data;

            const newSession = new Sessions({
                ...data,
                added_by: req?.user?._id,
                ...(data.endedAt ? {endedAt: new Date(data.endedAt)} : {})
            });

            await newSession.save();

            res.status(201).json(success_function({
                status: 201,
                message: "Session created successfully",
                data: newSession
            }));
        } catch (error) {
            handleControllerError({res, error});
        }
    },

    updateById: async (req: Request, res: Response) => {
        try {
            const {id} = req.params;

            if (!id || Array.isArray(id) || !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).send(error_function({
                    status: 400,
                    message: "Invalid session ID"
                }));
            }

            const sessionBody = updateSessionSchema.safeParse(req.body);

            if (!sessionBody.success) {
                return res.status(400).send(error_function({
                    status: 400,
                    message: "Invalid data",
                    data: sessionBody.error.issues
                }));
            }

            const data = sessionBody.data;

            const updateData = {
                ...data,
                ...(data?.endedAt ? {endedAt: new Date(data.endedAt)} : {})
            };

            const result = await Sessions.updateOne({_id: id}, {$set: updateData});

            if (result.matchedCount === 0) {
                return res.status(404).send(error_function({
                    status: 404,
                    message: "Session not found"
                }));
            }

            if (result.modifiedCount === 0) {
                return res.status(200).send(success_function({
                    status: 200,
                    message: "No changes made to session"
                }));
            }

            res.status(200).send(success_function({
                status: 200,
                message: "Session updated successfully"
            }));
        } catch (error) {
            handleControllerError({res, error});
        }
    },

    deleteById: async (req: Request, res: Response) => {
        try {
            const {id} = req.params;

            if (!id || Array.isArray(id) || !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).send(error_function({
                    status: 400,
                    message: "Invalid session ID"
                }));
            }

            const result = await Sessions.deleteOne({_id: id});

            if (result.deletedCount === 0) {
                return res.status(404).send(error_function({
                    status: 404,
                    message: "Session not found"
                }));
            }

            res.status(200).send(success_function({
                status: 200,
                message: "Session deleted successfully"
            }));
        } catch (error) {
            handleControllerError({res, error});
        }
    },

    updateSessionNote: async (req: Request, res: Response) => {
        try {
            const {id} = req?.params;
            const {notes} = req?.body;

            if (!id || Array.isArray(id) || !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).send(error_function({
                    status: 400,
                    message: "Invalid session ID"
                }));
            }

            if (typeof notes !== 'string') {
                return res.status(400).send(error_function({
                    status: 400,
                    message: "Invalid notes data"
                }));
            }

            const result = await Sessions.updateOne(
                {_id: id},
                {$set: {notes: notes}}
            );

            if (result.matchedCount === 0) {
                return res.status(404).send(error_function({
                    status: 404,
                    message: "Session not found"
                }));
            }

            if (result.modifiedCount === 0) {
                return res.status(200).send(success_function({
                    status: 200,
                    message: "No changes made to session notes"
                }));
            }

            res.status(200).send(success_function({
                status: 200,
                message: "Session notes updated successfully"
            }))
        } catch (error) {
            handleControllerError({res, error});
        }
    },

    getSessionTranscripts: async (req: Request, res: Response) => {
        try {
            const {sessionID} = req.params;

            const session = await Transcripts.find({
                session: sessionID
            })
                .sort({createdAt: 1});


            return res.status(200).send(success_function({
                status: 200,
                message: "Session conversations fetched successfully",
                data: session
            }));
        } catch (error) {
            handleControllerError({res, error});
        }
    },

    // ─── Document Management ─────────────────────────────────────────────────

    /**
     * GET /sessions/documents/:sessionID
     * Get all documents for a specific session
     */
    getSessionDocuments: async (req: Request, res: Response) => {
        try {
            const { sessionID } = req.params;
            const { page, limit } = req.query;

            if (!sessionID || Array.isArray(sessionID) || !mongoose.Types.ObjectId.isValid(sessionID)) {
                return res.status(400).json(error_function({
                    status: 400,
                    message: "Invalid session ID"
                }));
            }

            // Verify session exists and belongs to user
            const session = await Sessions.findOne({
                _id: sessionID,
                added_by: req.user!._id
            });

            if (!session) {
                return res.status(404).json(error_function({
                    status: 404,
                    message: "Session not found"
                }));
            }

            const pageNum = Number(page) || 1;
            const limitNum = Number(limit) || 20;

            const [documents, count] = await Promise.all([
                Documents.find({ session: sessionID })
                    .populate('patient', 'name')
                    .populate('uploadedBy', 'name email')
                    .sort({ createdAt: -1 })
                    .skip((pageNum - 1) * limitNum)
                    .limit(limitNum)
                    .select('-markdown -processedText'), // Exclude large text fields from list
                Documents.countDocuments({ session: sessionID })
            ]);

            res.status(200).json(success_function({
                status: 200,
                message: "Session documents fetched successfully",
                data: { documents, page: pageNum, limit: limitNum, count }
            }));

        } catch (error) {
            handleControllerError({ res, error });
        }
    },

    /**
     * POST /sessions/documents/upload/:sessionID
     * Upload a document for a specific session
     */
    uploadSessionDocument: async (req: Request, res: Response) => {
        try {
            const { sessionID } = req.params;

            if (!sessionID || Array.isArray(sessionID) || !mongoose.Types.ObjectId.isValid(sessionID)) {
                return res.status(400).json(error_function({
                    status: 400,
                    message: "Invalid session ID"
                }));
            }

            // Verify session exists and belongs to user
            const session = await Sessions.findOne({
                _id: sessionID,
                added_by: req.user!._id
            }).populate('patient');

            if (!session) {
                return res.status(404).json(error_function({
                    status: 404,
                    message: "Session not found"
                }));
            }

            // Check if file was uploaded
            const files = (req as any).files;
            if (!files || !files.file || files.file.length === 0) {
                return res.status(400).json(error_function({
                    status: 400,
                    message: "No file uploaded"
                }));
            }

            const file = files.file[0];

            // Validate file type (only PDF and images)
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
            if (!allowedTypes.includes(file.mimetype)) {
                return res.status(400).json(error_function({
                    status: 400,
                    message: "Only PDF and image files (JPEG, PNG) are allowed"
                }));
            }

            // Validate file size (50MB max)
            const maxSize = 50 * 1024 * 1024; // 50MB
            if (file.size > maxSize) {
                return res.status(400).json(error_function({
                    status: 400,
                    message: "File size must be less than 50MB"
                }));
            }

            // Upload file locally
            const uploadResult = await fileUpload({
                files: [file],
                type: allowedTypes,
                maxFileSize: maxSize,
                uploadPath: `uploads/documents/sessions/${sessionID}`,
                uploadType: 'local'
            }) as any;

            // Create document record
            const document = new Documents({
                originalPath: uploadResult.path,
                filename: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                session: sessionID,
                patient: session.patient._id,
                uploadedBy: req.user!._id,
                status: "uploading"
            });

            const savedDocument = await document.save();

            // Process document asynchronously
            processDocument({
                documentId: savedDocument._id.toString(),
                file,
                patientId: session.patient._id.toString(),
                sessionId: sessionID,
                userId: req.user!._id.toString()
            }).catch(error => {
                console.error("[Document] Background processing error:", error);
            });

            res.status(201).json(success_function({
                status: 201,
                message: "Document uploaded successfully. Processing in background.",
                data: {
                    documentId: savedDocument._id,
                    filename: savedDocument.filename,
                    status: savedDocument.status,
                    uploadPath: uploadResult.path
                }
            }));

        } catch (error) {
            handleControllerError({ res, error });
        }
    },

    /**
     * GET /sessions/documents/download/:docID
     * Download a specific document from session
     */
    downloadSessionDocument: async (req: Request, res: Response) => {
        try {
            const { docID } = req.params;

            if (!docID || Array.isArray(docID) || !mongoose.Types.ObjectId.isValid(docID)) {
                return res.status(400).json(error_function({
                    status: 400,
                    message: "Invalid document ID"
                }));
            }

            const document = await Documents.findById(docID)
                .populate('session', 'added_by')
                .populate('patient', 'name');

            if (!document) {
                return res.status(404).json(error_function({
                    status: 404,
                    message: "Document not found"
                }));
            }

            // Verify user has access to this document's session
            if (document.session && (document.session as any).added_by.toString() !== req.user!._id.toString()) {
                return res.status(403).json(error_function({
                    status: 403,
                    message: "Access denied"
                }));
            }

            // Check if file exists locally
            const filePath = path.resolve(document.originalPath);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json(error_function({
                    status: 404,
                    message: "File not found on server"
                }));
            }

            // Send file
            res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
            res.setHeader('Content-Type', document.mimetype);
            return res.sendFile(filePath);

        } catch (error) {
            handleControllerError({ res, error });
        }
    }
}


export default SessionController;