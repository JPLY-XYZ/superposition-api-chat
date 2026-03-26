import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Crear carpeta 'public/uploads' si no existe
const uploadDir = 'public/uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Nombre: timestamp-aleatorio.extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

export const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Límite 10MB
});