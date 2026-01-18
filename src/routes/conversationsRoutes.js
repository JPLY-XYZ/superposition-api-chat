import express from 'express';
import {authenticateToken} from '../middleware/authMiddleware.js';
import { createConversation, getUserConversations, getExistingConversation } from '../controllers/conversationController.js';


const chatRoutes = express.Router();

chatRoutes.post('/', authenticateToken, createConversation); //TOKEN, in {conversation} = { id, type = DIRECT/GROUP , name, imageUrl, participants[] }, out { conversation }

chatRoutes.get('/', authenticateToken, getUserConversations); //TOKEN, in ?lastConv, out { conversations } 

chatRoutes.post('/getExistingConversation', authenticateToken, getExistingConversation); //TOKEN, in {contactId}, out { conversation }

export default chatRoutes;


