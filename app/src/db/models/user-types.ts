import mongoose from 'mongoose';

const useTypeSchema = new mongoose.Schema({
    title: { type: String, required: true, unique: true },
    type_id: { type: Number, required: true, unique: true },
    added_by: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'users' }
},
    { timestamps: true })


const UserTypes = mongoose.model('user_types', useTypeSchema);

export default UserTypes;