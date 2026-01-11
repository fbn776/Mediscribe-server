import type {Request, Response} from "express";
import Sessions from "../db/models/sessions";
import {error_function, success_function} from "../utils/response-handler";
import {handleControllerError} from "../utils/utils";
import {createSessionSchema, updateSessionSchema} from "../schemas/sessions-schema";
import mongoose from "mongoose";

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
    }
}


export default SessionController;