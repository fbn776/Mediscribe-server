import type {Request, Response} from 'express';
import Patients from "../db/models/patients";
import Documents from "../db/models/documents";
import {error_function, success_function} from "../utils/response-handler";
import {handleControllerError} from "../utils/utils";
import {createPatientSchema, updatePatientSchema} from "../schemas/patients-schema";
import mongoose from "mongoose";
import { fileUpload } from "../utils/file-manager";
import { processDocument } from "../ai/utils/process-document";
import path from "path";
import fs from "fs";

const PatientController = {
    getAll: async (req: Request, res: Response) => {
        try {
            const {keyword, dob_start, dob_end, gender, page, limit} = req.query;

            const filters: any[] = [];

            if (keyword) {
                filters.push({
                    $or: [
                        {name: {$regex: keyword as string, $options: 'i'}},
                        {email: {$regex: keyword as string, $options: 'i'}},
                        {phone: {$regex: keyword as string, $options: 'i'}},
                    ]
                });
            }

            if (dob_start) {
                filters.push({dob: {$gte: new Date(dob_start as string)}});
            }

            if (dob_end) {
                filters.push({dob: {$lte: new Date(dob_end as string)}});
            }

            if (gender) {
                filters.push({gender: gender});
            }

            const queryFilter = filters.length > 0 ? {$and: filters} : {};
            const [patients, count] = await Promise.all([
                Patients.find(queryFilter)
                .skip(((Number(page) || 1) - 1) * (Number(limit) || 10))
                .limit(Number(limit) || 10),

                Patients.countDocuments(queryFilter)
            ]);


            res.status(200).json(success_function({
                status: 200,
                message: "Patients fetched successfully",
                data: {
                    patients: patients,
                    page: Number(page) || 1,
                    limit: Number(limit) || 10,
                    count: count
                }
            }))
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
                    message: "Invalid patient ID"
                }));
            }

            const patient = await Patients.findById(id);

            if (!patient) {
                return res.status(404).send(error_function({
                    status: 404,
                    message: "Patient not found"
                }));
            }

            res.status(200).json(success_function({
                status: 200,
                message: "Patient fetched successfully",
                data: patient
            }));
        } catch (error) {
            handleControllerError({res, error});
        }
    },

    createOne: async (req: Request, res: Response) => {
        try {
            const patientBody = createPatientSchema.safeParse(req.body);

            if (!patientBody.success) {
                return res.status(400).send(error_function({
                    status: 400,
                    message: "Invalid data",
                    data: patientBody.error.issues
                }));
            }

            const data = patientBody.data;

            // Check if patient with same email or phone already exists
            if (data.email || data.phone) {
                const existingPatient = await Patients.findOne({
                    $or: [
                        ...(data.email ? [{email: data.email}] : []),
                        ...(data.phone ? [{phone: data.phone}] : [])
                    ]
                });

                if (existingPatient) {
                    return res.status(409).send(error_function({
                        status: 409,
                        message: "Patient with this email or phone already exists"
                    }));
                }
            }

            const newPatient = new Patients({
                ...data,
                dob: new Date(data.dob)
            });

            await newPatient.save();

            res.status(201).json(success_function({
                status: 201,
                message: "Patient created successfully",
                data: newPatient
            }));
        } catch (error) {
            handleControllerError({res, error});
        }
    },

    updateOne: async (req: Request, res: Response) => {
        try {
            const {id} = req.params;

            if (!id || Array.isArray(id) || !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).send(error_function({
                    status: 400,
                    message: "Invalid patient ID"
                }));
            }

            const patientBody = updatePatientSchema.safeParse(req.body);

            if (!patientBody.success) {
                return res.status(400).send(error_function({
                    status: 400,
                    message: "Invalid data",
                    data: patientBody.error.issues
                }));
            }

            const data = patientBody.data;

            // Check if another patient with same email or phone exists
            if (data?.email || data?.phone) {
                const existingPatient = await Patients.findOne({
                    $and: [
                        {
                            $or: [
                                ...(data.email ? [{email: data.email}] : []),
                                ...(data.phone ? [{phone: data.phone}] : [])
                            ]
                        },
                        {_id: {$ne: new mongoose.Types.ObjectId(id)}}
                    ]
                });

                if (existingPatient) {
                    return res.status(409).send(error_function({
                        status: 409,
                        message: "Another patient with this email or phone already exists"
                    }));
                }
            }

            const updateData = {
                ...data,
                ...(data?.dob ? {dob: new Date(data.dob)} : {})
            };

            const result = await Patients.updateOne({_id: id}, {$set: updateData});

            if (result.matchedCount === 0) {
                return res.status(404).send(error_function({
                    status: 404,
                    message: "Patient not found"
                }));
            }

            if (result.modifiedCount === 0) {
                return res.status(200).send(success_function({
                    status: 200,
                    message: "No changes made to patient"
                }));
            }

            res.status(200).send(success_function({
                status: 200,
                message: "Patient updated successfully"
            }));
        } catch (error) {
            handleControllerError({res, error});
        }
    },

    deleteOne: async (req: Request, res: Response) => {
        try {
            const {id} = req.params;

            if (!id || Array.isArray(id) || !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).send(error_function({
                    status: 400,
                    message: "Invalid patient ID"
                }));
            }

            const result = await Patients.deleteOne({_id: id});

            if (result.deletedCount === 0) {
                return res.status(404).send(error_function({
                    status: 404,
                    message: "Patient not found"
                }));
            }

            res.status(200).send(success_function({
                status: 200,
                message: "Patient deleted successfully"
            }));
        } catch (error) {
            handleControllerError({res, error});
        }
    },

    // ─── Document Management ─────────────────────────────────────────────────

    /**
     * GET /patients/documents/:patientID
     * Get all documents for a specific patient
     */
    getDocuments: async (req: Request, res: Response) => {
        try {
            const { patientID } = req.params;
            const { page, limit } = req.query;

            if (!patientID || Array.isArray(patientID) || !mongoose.Types.ObjectId.isValid(patientID)) {
                return res.status(400).json(error_function({
                    status: 400,
                    message: "Invalid patient ID"
                }));
            }

            // Verify patient exists
            const patient = await Patients.findById(patientID);
            if (!patient) {
                return res.status(404).json(error_function({
                    status: 404,
                    message: "Patient not found"
                }));
            }

            const pageNum = Number(page) || 1;
            const limitNum = Number(limit) || 20;

            const [documents, count] = await Promise.all([
                Documents.find({ patient: patientID })
                    .populate('session', 'title createdAt')
                    .populate('uploadedBy', 'name email')
                    .sort({ createdAt: -1 })
                    .skip((pageNum - 1) * limitNum)
                    .limit(limitNum)
                    .select('-markdown -processedText'), // Exclude large text fields from list
                Documents.countDocuments({ patient: patientID })
            ]);

            res.status(200).json(success_function({
                status: 200,
                message: "Documents fetched successfully",
                data: { documents, page: pageNum, limit: limitNum, count }
            }));

        } catch (error) {
            handleControllerError({ res, error });
        }
    },

    /**
     * POST /patients/documents/upload/:patientID
     * Upload a document for a specific patient
     */
    uploadDocument: async (req: Request, res: Response) => {
        try {
            const { patientID } = req.params;

            if (!patientID || Array.isArray(patientID) || !mongoose.Types.ObjectId.isValid(patientID)) {
                return res.status(400).json(error_function({
                    status: 400,
                    message: "Invalid patient ID"
                }));
            }

            // Verify patient exists
            const patient = await Patients.findById(patientID);
            if (!patient) {
                return res.status(404).json(error_function({
                    status: 404,
                    message: "Patient not found"
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
                uploadPath: `uploads/documents/patients/${patientID}`,
                uploadType: 'local'
            }) as any;

            // Create document record
            const document = new Documents({
                originalPath: uploadResult.path,
                filename: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                patient: patientID,
                uploadedBy: req.user!._id,
                status: "uploading"
            });

            const savedDocument = await document.save();

            // Process document asynchronously
            processDocument({
                documentId: savedDocument._id.toString(),
                file,
                patientId: patientID as string,
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
     * GET /patients/documents/download/:docID
     * Download a specific document
     */
    downloadDocument: async (req: Request, res: Response) => {
        try {
            const { docID } = req.params;

            if (!docID || Array.isArray(docID) || !mongoose.Types.ObjectId.isValid(docID)) {
                return res.status(400).json(error_function({
                    status: 400,
                    message: "Invalid document ID"
                }));
            }

            const document = await Documents.findById(docID).populate('patient', 'name');

            if (!document) {
                return res.status(404).json(error_function({
                    status: 404,
                    message: "Document not found"
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

export default PatientController;