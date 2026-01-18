import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { sync } from '../controllers/syncController.js';

const syncRoutes = express.Router();
    
syncRoutes.post('/', authenticateToken, sync); //TOKEN, in {?lastSync}, out {conversations[], messages[], messageUpdates[]}

export default syncRoutes;
