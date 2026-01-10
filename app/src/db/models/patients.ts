import mongoose from "mongoose";


const documentSchema = new mongoose.Schema({
    name: {type: String, required: true},
    file: {type: String, required: true},
    uploadedAt: {type: Date, required: true, default: Date.now},

    description: {type: String},

    // Optional link to the session where this document was created
    session: {type: mongoose.Schema.Types.ObjectId, ref: "sessions"}
});

const patientsSchema = new mongoose.Schema({
    name: {type: String, required: true},
    dob: {type: Date, required: true},
    gender: {type: String, required: true},
    phone: {type: String},
    email: {type: String},

    documents: [documentSchema],
}, {
    timestamps: true,
});

const Patients = mongoose.model("patients", patientsSchema);