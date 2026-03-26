import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getMe, getMyContactCode, updateMe, getUser, upsertPushToken, getNotificationsForMe, updateNotificationsForMe } from '../controllers/userCrontroller.js';

const usersRoutes = express.Router();

usersRoutes.get('/get_contact_code', authenticateToken, getMyContactCode); //TOKEN, in {}, out { code }

usersRoutes.post('/', authenticateToken, getUser); //TOKEN, in {code}, out { user } == { id, displayName, imageUrl, publicKey, code }

usersRoutes.get('/get_me', authenticateToken, getMe); //TOKEN, in {}, out { user } == { id, displayName, imageUrl, publicKey, code }

usersRoutes.put('/update_me', authenticateToken, updateMe); //TOKEN, in {displayName, imageUrl, publicKey}, out { user } == { id, displayName, imageUrl, publicKey, code }

usersRoutes.put('/upsert_push_token', authenticateToken, upsertPushToken); //TOKEN, in {pushToken}, out {}

usersRoutes.put('/notifications', authenticateToken, updateNotificationsForMe); //TOKEN, in {notifications:TRUE/FALSE}, out {}
usersRoutes.get('/notifications', authenticateToken, getNotificationsForMe); //TOKEN, in {}, out {notifications_TRUE/FALSE}

export default usersRoutes;