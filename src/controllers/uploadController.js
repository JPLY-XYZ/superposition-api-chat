import { v2 as cloudinary } from 'cloudinary';

// Configuración (puedes mover esto a un archivo de config separado)
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_NAME, 
    api_key: process.env.CLOUDINARY_KEY, 
    api_secret: process.env.CLOUDINARY_SECRET 
});

export const uploadFile = async (req, res) => {


    console.log('Archivo recibido:', req.file);
    
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No hay archivo' });
        }

        // Subida a Cloudinary usando el buffer del archivo
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { resource_type: 'auto', folder: 'uploads' },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        res.json({ 
            url: uploadResult.secure_url,
            type: uploadResult.resource_type === 'image' ? 'image' : 'file',
            public_id: uploadResult.public_id
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al subir a Cloudinary' });
    }
};