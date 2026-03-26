import { Router } from 'express';
import { upload } from '../middleware/uploadMidleware.js';
import { uploadFile } from '../controllers/uploadController.js';


const router = Router();

// Usamos authMiddleware para que solo usuarios logueados suban archivos
router.post('/', upload.single('file'), uploadFile);

export default router;