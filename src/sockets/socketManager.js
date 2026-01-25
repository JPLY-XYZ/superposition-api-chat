import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma.js';
import findPrivateChat from '../helpers/chat.js';
import { sendNotification } from '../helpers/notifications.js';

const socketManager = (io) => {
  // 1. Middleware de Autenticación
  io.use((socket, next) => {

    //obtener el token del usuario
    const token = socket.handshake.auth?.token;

    //si no hay token, no continuar
    if (!token) return next(new Error("Auth error: Token missing"));

    //verificar que el token sea valido y lo guardamos en el socket
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("Auth error: Invalid token"));
    }
  });

  //manejo de errores de conexion //TODO: eliminar
  io.on("connection_error", (err) => {
    console.log("Error de conexión:", err.message);
    console.log("Contexto del error:", err.context);
  });

  //mapa de usuarios online para avisar a los clientes de cual esta online y cual no
  const onlineUsers = new Map();

  // cuando un usuario se conecta
  io.on("connection", async (socket) => {
    const userId = socket.userId;

    //unimos al usuario a su sala privada
    socket.join(`user_${userId}`);

    //agregamos al usuario al mapa de usuarios online
    onlineUsers.set(userId, socket.id);

    //avisamos a todos los usuarios que este usuario se ha conectado
    io.emit('user_status_change', { userId, status: 'online' });


    //TODO: ELIMINAR ESTA FUNCION
    const markAsDelivered = async (userId) => {
      // 1. Buscar mensajes en mis chats, enviados por otros, 
      // que YO todavía no tenga registrados en MessageStatus.
      const pendingMessages = await prisma.message.findMany({
        where: {
          conversation: { participants: { some: { userId: userId } } }, // En mis chats
          senderId: { not: userId }, // No enviados por mí
          statuses: {
            none: { userId: userId } // Que NO tengan un estado creado por mí
          }
        },
        select: { id: true } // Solo necesitamos los IDs
      });

      if (pendingMessages.length === 0) return;

      // 2. Crear registros masivos en MessageStatus
      // "createMany" es mucho más rápido que un bucle
      await prisma.messageStatus.createMany({
        data: pendingMessages.map(msg => ({
          messageId: msg.id,
          userId: userId,
          status: 'delivered'
        })),
        skipDuplicates: true // Por seguridad, si ya existe no falla
      });

      // Aquí emitirías el evento por Socket a los remitentes original
    };

    //TODO: COMENTADA POR AHORA, NO SE DEBE USAR USA
    // markAsDelivered(userId);

    // -------------------------- 
    // --- ESCUCHA DE EVENTOS ---
    //---------------------------


    // Evento para recibir mensaje del cliente
    // in { message } = {id, conversationId, senderId, content, type, createdAt}  out { success }
    socket.on("send_message", async (data, ack) => {

      if (!data.id || !data.conversationId || !data.senderId || !data.content || !data.type || !data.createdAt) {
        if (ack) ack({ success: false, error: "Faltan campos obligatorios" });
        return;
      }

      try {

        //obtener la conversacion relacionada con el mensaje con los participantes
        const conversation = await prisma.conversation.findUnique({
          where: { id: data.conversationId },
          include: { participants: true }
        });

        //si no existe la conversacion, no continuar
        if (!conversation) {
          if (ack) ack({ success: false, error: "Conversación no encontrada" });
          return;
        }

        //construir el mensaje
        const newMessage = await prisma.message.create({
          data: {
            id: data.id,
            conversationId: data.conversationId,
            senderId: socket.userId,
            content: data.content,
            type: data.type,
            createdAt: data.createdAt,
            // Creamos los estados automáticamente
            statuses: {
              create: conversation.participants
                .filter(p => p.userId !== socket.userId) // Solo para los DEMÁS
                .map(p => ({
                  userId: p.userId,
                  status: "sent"
                }))
            }
          }
        });

        // Recorremos los participantes y emitimos el mensaje a cada uno
        for (const participant of conversation.participants) {
          if (participant.userId !== socket.userId) {

            //obtener el nombre del usuario
            const participantUserToken = await prisma.user.findUnique({
              where: { id: participant.userId },
              select: { pushToken: true }
            });

            const senderDisplayName = await prisma.user.findUnique({
              where: { id: participant.userId },
              select: { displayName: true }
            });


            io.to(`user_${participant.userId}`).emit("new_message", newMessage);

            // El bucle se detiene aquí hasta que esta notificación sale
            await sendNotification(participantUserToken.pushToken, senderDisplayName.displayName + " : " + newMessage.content);
          }
        }
        // Confirmación al emisor
        if (ack) ack({ success: true });

      } catch (error) {
        console.error("SOCKET: SEND MESSAGE - ", error);
      }
    });

    // Evento para recibir actualización de estado del mensaje
    // in { messageId, userId, senderId, status } out { success }
    socket.on("message_status_update", async (data, ack) => {
      try {

        if (!data.messageId || !data.userId || !data.senderId || !data.status) {
          console.log("SOCKET: MESSAGE STATUS UPDATE - Faltan campos obligatorios");
          if (ack) ack({ success: false, error: "Faltan campos obligatorios" });
          return;
        }

        console.log("SOCKET: MESSAGE STATUS UPDATE - ", data);
        //actualizamos el estado del mensaje
        await prisma.messageStatus.updateMany({
          where: {
            messageId: data.messageId,
            userId: data.userId,
          },
          data: {
            status: data.status,
            updatedAt: new Date(),
          }
        });



        //avisamos al emisor original que su mensaje ha sido entregado
        io.to(`user_${data.senderId}`).emit("message_status_changed", { messageId: data.messageId, status: data.status });
        //confirmación al emisor

        const room = io.sockets.adapter.rooms.get(`user_${data.senderId}`);
        if (!room || room.size === 0) {
          console.log("El usuario no está conectado, el mensaje no llegará.");
        } else {
          console.log(`Enviando a ${room.size} dispositivo(s): user_${data.senderId}: ${data.messageId} = ${data.status}`);
        }
        if (ack) ack({ success: true });
      } catch (error) {
        console.error("SOCKET: MESSAGE STATUS UPDATE - ", error);
      }
    });


    // TODO: IMPLEMENTAR EVENTO DE ESCRIBIR
    socket.on("typing", (data) => {
      // data: { conversationId, isTyping: true/false }
      socket.to(`conversation_${data.conversationId}`).emit("display_typing", {
        userId: socket.userId,
        isTyping: data.isTyping
      });
    });

    // Evento para recibir actualización de estado del mensajes leidos en un chat
    // in { conversationId } out { success }
    socket.on("mark_conversation_as_read", async (data, ack) => {
      try {
        const { conversationId } = data;

        //Buscamos qué registros vamos a modificar
        const statusesToUpdate = await prisma.messageStatus.findMany({
          where: {
            userId: socket.userId,
            status: { not: 'read' },
            message: { conversationId: conversationId, senderId: { not: socket.userId } }
          },
          select: { id: true, messageId: true, message: { select: { senderId: true } } }
        });

        //obtenemos los ids de los mensajes
        const statusIds = statusesToUpdate.map(s => s.id);

        //si hay mensajes para actualizar
        if (statusIds.length > 0) {
          //actualizamos los mensajes a leidos
          await prisma.messageStatus.updateMany({
            where: { id: { in: statusIds } },
            data: { status: 'read' }
          });

          //avisamos al emisor original que su mensaje ha sido leido
          for (const status of statusesToUpdate) {

            console.log(status);

            socket.to(`user_${status.message.senderId}`).emit("message_status_changed", {
              messageId: status.messageId,
              status: 'read'
            });
          }

        }

        if (ack) ack({ success: true });
      } catch (error) {
        console.error("SOCKET: MARK CONVERSATION AS READ - ", error);
        if (ack) ack({ success: false });
      }
    });

    // Evento para obtener usuarios online
    // in {} out {usersArray}
    socket.on('get_online_users', () => {
      try {
        //obtenemos los usuarios online
        const usersArray = Array.from(onlineUsers.keys());
        //emitimos el evento a todos los usuarios enviando el array de usuarios online
        socket.emit('all_online_users', usersArray);
      } catch (error) {
        console.error("SOCKET: GET ONLINE USERS - ", error);
      }
    });

    // Evento para desconectar usuario
    //in {} out {}
    socket.on("disconnect", () => {
      io.emit('user_status_change', { userId, status: 'offline' });
      onlineUsers.delete(userId);
    });
  });
};

export default socketManager;