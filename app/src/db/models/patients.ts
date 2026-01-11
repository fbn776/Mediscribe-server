import mongoose from "mongoose";

const patientsSchema = new mongoose.Schema({
    name: {type: String, required: true},
    dob: {type: Date, required: true},
    gender: {type: String, required: true},
    phone: {type: String},
    email: {type: String},
}, {
    timestamps: true,
});

const Patients = mongoose.model("patients", patientsSchema);

export default Patients;