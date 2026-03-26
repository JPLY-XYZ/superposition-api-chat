import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import socketManager from './sockets/socketManager.js';
import authRoutes from './routes/authRoutes.js';
import conversationsRoutes from './routes/conversationsRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import usersRoutes from './routes/usersRoutes.js';
import syncRoutes from './routes/syncRoutes.js';

const app = express();
app.use(express.json());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

app.set('socketio', io); // Esto hace que io esté disponible en todos los controladores
// Inicializamos la lógica de sockets pasando la instancia de 'io'
socketManager(io);

// Rutas



app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/sync', syncRoutes);
app.use('/uploads', express.static('public/uploads'));
app.get('/api/status', (req, res) => {
  res.json({ status: 'health' });
});

// 2. Registrar la ruta de subida
app.use('/api/upload', uploadRoutes);


const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});