import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getMe, getMyContactCode, updateMe, getUser } from '../controllers/userCrontroller.js';

const usersRoutes = express.Router();

usersRoutes.get('/get_contact_code', authenticateToken, getMyContactCode); //TOKEN, in {}, out { code }

usersRoutes.post('/', authenticateToken, getUser); //TOKEN, in {code}, out { user } == { id, displayName, imageUrl, publicKey, code }

usersRoutes.get('/get_me', authenticateToken, getMe); //TOKEN, in {}, out { user } == { id, displayName, imageUrl, publicKey, code }

usersRoutes.put('/update_me', authenticateToken, updateMe); //TOKEN, in {displayName, imageUrl, publicKey}, out { user } == { id, displayName, imageUrl, publicKey, code }

export default usersRoutes;