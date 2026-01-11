import type {Request, Response} from 'express';
import Patients from "../db/models/patients";
import {error_function, success_function} from "../utils/response-handler";
import {handleControllerError} from "../utils/utils";
import {createPatientSchema, updatePatientSchema} from "../schemas/patients-schema";
import mongoose from "mongoose";

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
    }
}

export default PatientController;