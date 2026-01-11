import mongoose from "mongoose";
import Transcripts from "./transcripts";

// This defines the session of a doctor patient interaction
const sessionsSchema = new mongoose.Schema({
    title: {type: String, required: true},

    // Doctor and patient references
    added_by: {type: mongoose.Schema.Types.ObjectId, ref: "user", required: true},
    patient: {type: mongoose.Schema.Types.ObjectId, ref: "patients", required: true},

    notes: {type: String, default: ""},

    endedAt: {type: Date},
}, {
    timestamps: true,
});

sessionsSchema.methods.getConversations = function () {
    return Transcripts.find({session: this._id}).sort({createdAt: -1});
}

const Sessions = mongoose.model("sessions", sessionsSchema);

export default Sessions;