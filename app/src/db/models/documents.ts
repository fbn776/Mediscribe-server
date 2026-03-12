import mongoose from "mongoose";

const documentsSchema = new mongoose.Schema({
    originalPath: { type: String, required: true },
    filename: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    markdown: { type: String, default: "" },
    processedText: { type: String, default: "" },
    session: { type: mongoose.Schema.Types.ObjectId, ref: "sessions", default: null },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "patients", required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    pageCount: { type: Number, default: 0 },
    qualityScore: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ["uploading", "processing", "completed", "error"],
        default: "uploading"
    },
    error: { type: String, default: null },
}, {
    timestamps: true
});

// Index for efficient queries
documentsSchema.index({ patient: 1, createdAt: -1 });
documentsSchema.index({ session: 1, createdAt: -1 });
documentsSchema.index({ uploadedBy: 1, createdAt: -1 });
documentsSchema.index({ status: 1 });

const Documents = mongoose.model("documents", documentsSchema);

export default Documents;
