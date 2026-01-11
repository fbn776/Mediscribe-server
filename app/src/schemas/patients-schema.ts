import {z} from "zod";


export const createPatientSchema = z.object({
    name: z.string().min(1, "Name is required").max(200, "Name is too long"),
    dob: z.string().refine(date => !isNaN(Date.parse(date)), {
        message: "Date of Birth must be a valid date string"
    }),
    gender: z.string().min(1, "Gender is required").max(50, "Gender is too long"),
    phone: z.string().min(10, "Phone must be at least 10 digits").max(15, "Phone is too long").optional().or(z.literal("")),
    email: z.email("Invalid email address").max(100, "Email is too long").optional().or(z.literal("")),
});

export const updatePatientSchema = createPatientSchema.partial();

