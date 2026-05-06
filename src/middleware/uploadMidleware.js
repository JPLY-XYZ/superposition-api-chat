import multer from 'multer';

// Usamos el almacenamiento en memoria
const storage = multer.memoryStorage();

export const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});