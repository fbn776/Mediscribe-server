import fs from "fs";
import path from "path";

// -------- Upload File (Local Only) --------
export async function uploadFile(file_data: { file: string | any[]; fileName: any; fileExtension: any; path: any; contentType: any; }) {
    try {
        const fileSizeInBytes = file_data?.file?.length;
        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for documents

        if (fileSizeInBytes > MAX_FILE_SIZE) {
            throw new Error("File size should be less than 50 MB");
        }

        const fileName = `${file_data?.fileName}.${file_data?.fileExtension}`;
        const uploadDir = file_data?.path || "uploads/files";

        // Ensure upload directory exists
        const fullUploadDir = path.resolve(uploadDir);
        if (!fs.existsSync(fullUploadDir)) {
            fs.mkdirSync(fullUploadDir, { recursive: true });
        }

        const filePath = path.join(fullUploadDir, fileName);

        // Write file to local storage
        const fileBuffer = Buffer.isBuffer(file_data.file) ? file_data.file : Buffer.from(file_data.file as any);
        fs.writeFileSync(filePath, fileBuffer);

        // Return local file path
        return filePath;
    } catch (error) {
        throw error;
    }
}

// -------- List Files (Local Only) --------
export async function listFiles(files_data: { directory: any; type: string; }) {
    try {
        if (!files_data?.directory) throw new Error("Directory is required");

        const directoryPath = path.resolve(files_data.directory);

        if (!fs.existsSync(directoryPath)) {
            return [];
        }

        const files = fs
            .readdirSync(directoryPath)
            .filter((file) => fs.statSync(path.join(directoryPath, file)).isFile());
        return files;
    } catch (error) {
        throw error;
    }
}

// -------- List Files Without Extension (Local Only) --------
export async function listFilesWithoutExtension(files_data: { directory: any; type: string; }) {
    try {
        if (!files_data?.directory) throw new Error("Directory is required");

        const directoryPath = path.resolve(files_data.directory);

        if (!fs.existsSync(directoryPath)) {
            return [];
        }

        const files = fs
            .readdirSync(directoryPath)
            .filter((file) => fs.statSync(path.join(directoryPath, file)).isFile())
            .map((file) => path.parse(file).name);
        return files;
    } catch (error) {
        throw error;
    }
}
