import mongoose from "mongoose";
import Conversations from "./conversations";

// This defines the session of a doctor patient interaction
const sessionsSchema = new mongoose.Schema({
    userId: {type: mongoose.Schema.Types.ObjectId, ref: "user", required: true},

    startedAt: {type: Date, required: true, default: Date.now},
    endedAt: {type: Date},

    patient: {type: mongoose.Schema.Types.ObjectId, ref: "patients", required: true},
}, {
    timestamps: true,
});

sessionsSchema.methods.getConversations = function () {
    return Conversations.find({session: this._id}).sort({createdAt: -1});
}

const Sessions = mongoose.model("sessions", sessionsSchema);
