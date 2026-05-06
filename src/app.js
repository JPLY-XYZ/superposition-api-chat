import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
// 1. IMPORTA PATH (Esencial para arreglar tu error)
import path from 'path';
import { fileURLToPath } from 'url';

import socketManager from './sockets/socketManager.js';
import authRoutes from './routes/authRoutes.js';
import conversationsRoutes from './routes/conversationsRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import usersRoutes from './routes/usersRoutes.js';
import syncRoutes from './routes/syncRoutes.js';

// 2. CONFIGURA __dirname (Necesario en ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

app.set('socketio', io);
socketManager(io);

// RUTAS
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/sync', syncRoutes);

// 3. CORRECCIÓN DE LA RUTA ESTÁTICA
// Asegúrate de que la carpeta 'uploads' existe en la raíz de tu proyecto
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/status', (req, res) => {
  res.json({ status: 'health' });
});

app.use('/api/upload', uploadRoutes);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});