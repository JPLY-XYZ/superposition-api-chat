import express from 'express';
import { register, login } from '../controllers/authController.js';

const authRoutes = express.Router();


authRoutes.post('/register', register); //in {email, password, publicKey}, out { message, userId, code }
authRoutes.post('/login', login); //in {email, password}, out { token, userId }

export default authRoutes;