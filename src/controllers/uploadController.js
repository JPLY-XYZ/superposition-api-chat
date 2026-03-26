export const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No hay archivo' });
        }

        // Construimos la URL. Ajusta el puerto si es necesario.
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

        res.json({ 
            url: fileUrl,
            type: req.file.mimetype.startsWith('image/') ? 'image' : 'file'
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar subida' });
    }
};