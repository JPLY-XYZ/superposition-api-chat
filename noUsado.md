 // Evento para recibir creación de conversación
    // in {conversation} = { id, type = DIRECT/GROUP , name, imageUrl, participants[] } out { success, conversation }
    socket.on("create_conversation", async (data, ack) => {
      const { id, participants, name, imageUrl, type } = data;
      const creatorId = socket.userId; 

      try {
        // validación básica
        if (!participants || !Array.isArray(participants)) {
          if (ack) ack({ success: false, error: "Participantes inválidos" });
          return;
        }

        //preparar participantes (eliminar duplicados + añadir creador)
        const allParticipants = [...new Set([...participants, creatorId])];

        //logica de deduplicacion para chats DIRECT (1-1)
        const isDirect = type === 'DIRECT' || (allParticipants.length === 2 && !name);

        if (isDirect) {
          const existingDirect = await prisma.conversation.findFirst({
            where: {
              type: 'DIRECT',
              participants: {
                every: { userId: { in: allParticipants } }
              }
            },
            include: { participants: true }
          });

          // Si existe, notificamos al otro usuario y retornamos
          if (existingDirect) {
            existingDirect.participants.forEach(p => {
              if (p.userId !== creatorId) {
                io.to(`user_${p.userId}`).emit("new_conversation", existingDirect);
              }
            });
            if (ack) ack({ success: true });
            return;
          }
        }

        // Creación en la base de datos
        const newConversation = await prisma.conversation.create({
      data: {
        id: id,
        type: isDirect ? 'DIRECT' : 'GROUP',
        name: isDirect ? null : name, // Correcto: null en BD para 1-1
        imageUrl: isDirect ? null : imageUrl,
        participants: {
          create: allParticipants.map(userId => ({ userId }))
        }
      },
      // CAMBIO CLAVE AQUÍ:
      include: {
        participants: {
          include: {
            user:{
              select:{
                id: true,
                displayName: true,
                imageUrl: true, 
                publicKey: true,
                code: true
              }
            }
          }
        }
      }
    });

        // Notificar a los demás participantes en tiempo real
        newConversation.participants.forEach(p => {
          if (p.userId !== creatorId) {
            // Emitir evento a la sala personal del usuario
            io.to(`user_${p.userId}`).emit("new_conversation", newConversation);
          }
        });

        // Confirmar al creador (ack)
        if (ack) ack({ success: true });

      } catch (error) {
        console.error("SOCKET: CREATE CONVERSATION - ", error);
        if (ack) ack({ success: false, error: "Error interno al crear conversación" });
      }
    });





    //TODO: no se usa eliminar en futuras versiones por eso no se ha refactorizado
//in {userId}, out { conversation }
const getUnReceivedMessages = async (req, res) => {
    const userId = req.user.id;


    try {
        // 1. Buscamos los mensajes
        const pendingStatuses = await prisma.messageStatus.findMany({
            where: {
                userId: userId,
                status: {
                    notIn: ['received', 'read']
                }
            },
            include: {
                message: {
                    include: {
                        sender: {
                            select: { id: true, displayName: true }
                        }
                    }
                }
            },
            orderBy: { message: { createdAt: 'asc' } }
        });

        res.json(pendingStatuses);
    } catch (error) {
        console.error("Sync Error:", error);
        res.status(500).json({ error: "Error al recuperar mensajes pendientes" });
    }
};


//TODO: no se usa eliminar en futuras versiones por eso no se ha refactorizado
//in {conversationId}, out { messages[] }
const getChatHistory = async (req, res) => {
    const { conversationId } = req.params;
    const { cursor, limit = 20 } = req.query;

    try {
        const messages = await prisma.message.findMany({
            where: {
                conversationId: conversationId
            },
            take: parseInt(limit),
            // Si hay cursor (ID de mensaje), saltamos 1 y empezamos desde ahí
            ...(cursor && {
                skip: 1,
                cursor: { id: cursor },
            }),
            orderBy: {
                createdAt: 'desc', // Traemos los más recientes primero (hacia atrás)
            },
        });

        // Los devolvemos ordenados cronológicamente para el móvil
        res.json(messages.reverse());
    } catch (error) {
        res.status(500).json({ error: "Error al cargar el historial" });
    }
};



//in ?lastMess, out { messages } = {id, conversationId, senderId, type, content, createdAt, status, isSynced}
const syncMessages = async (req, res) => {
    let { lastMess } = req.query;

    // Si no hay lastMess, es la primera carga tras inicio de sesion
    const isInitialLoad = !lastMess || lastMess === '0' || new Date(lastMess).getFullYear() === 1970;

    // Si es la primera carga, usamos 3 meses atrás
    if (isInitialLoad) {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        lastMess = threeMonthsAgo.toISOString();
    }

    try {
        // 1. Buscamos los mensajes
        const messages = await prisma.message.findMany({
            where: {
                conversation: { participants: { some: { userId: req.user.id } } },
                createdAt: { gt: lastMess }
            },
            include: {
                statuses: true
            },
            orderBy: [
                { createdAt: 'asc' },
                { id: 'asc' }
            ],
            take: 1000
        });

        const formatted = messages.map(m => {
            let displayStatus = 'sent';

            if (m.senderId === req.user.id) { // Si el mensaje es mío
                const otherStatus = m.statuses.find(s => s.userId !== req.user.id); // Busco el estado del otro usuario
                displayStatus = otherStatus ? otherStatus.status : 'sent';
            } else { // Si el mensaje es de otro usuario
                const myStatus = m.statuses.find(s => s.userId === req.user.id); // Busco el estado de mí
                displayStatus = myStatus ? myStatus.status : 'delivered';
            }

            // 2. Formateamos el mensaje
            return {
                id: m.id,
                conversationId: m.conversationId,
                senderId: m.senderId,
                type: m.type,
                content: m.content,
                createdAt: m.createdAt,
                status: displayStatus,
                isSynced: 1
            };
        });

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: "Error al sincronizar mensajes" });
    }
};

//in {messages[]}, out { success }
const uploadBulkMessages = async (req, res) => {
    const { messages } = req.body;
    const userId = req.user.id;
    const io = req.app.get('socketio');

    // Validamos que el formato de lo recibido sea correcto
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Formato de mensajes inválido" });
    }

    // 1. Guardado masivo en DB y creacion de estados
    try {
        // 1. Guardamos en DB y recuperamos los participantes afectados
        const recipients = await prisma.$transaction(async (tx) => {

            // A. Insertar mensajes
            await tx.message.createMany({
                data: messages.map(msg => ({
                    id: msg.id,
                    conversationId: msg.conversationId,
                    senderId: userId,
                    content: msg.content,
                    type: msg.type,
                    createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
                })),
                skipDuplicates: true,
            });

            // B. Obtener participantes excluyendo al remitente
            const conversationIds = [...new Set(messages.map(m => m.conversationId))];

            // Buscamos los participantes de esas conversaciones
            const participants = await tx.participant.findMany({
                where: {
                    conversationId: { in: conversationIds },
                    userId: { not: userId }
                },
                select: {
                    conversationId: true,
                    userId: true
                }
            });

            // C. Insertar en base de datos como enviado'
            const statusData = [];
            messages.forEach(msg => {
                const chatParticipants = participants.filter(p => p.conversationId === msg.conversationId);
                chatParticipants.forEach(p => {
                    statusData.push({
                        messageId: msg.id,
                        userId: p.userId,
                        status: "sent"
                    });
                });
            });

            if (statusData.length > 0) {
                await tx.messageStatus.createMany({ data: statusData });
            }

            // Retornamos los participantes para usarlos en el socket
            return participants;
        });

        // 2. Notificar individualmente a cada usuario que sea destinatario del mensaje
        messages.forEach(msg => {
            // Buscamos quiénes deben recibir este mensaje específico
            const msgRecipients = recipients.filter(p => p.conversationId === msg.conversationId);

            // Emitimos a la sala única del usuario
            msgRecipients.forEach(participant => {
                io.to(`user_${participant.userId}`).emit("new_message", msg);
            });
        });

        // 3. Devolvemos la respuesta
        res.status(200).json({ success: true });

    } catch (error) {
        res.status(500).json({ error: "Error en la sincronización masiva" });
    }

};


//in {messageId, status}, out { success }
const changeMessageStatus = async (req, res) => {
    const { messageId, status } = req.body;
    const userId = req.user.id;

    try {
        // Actualizamos el estado
        const updatedStatus = await prisma.messageStatus.updateMany({
            where: {
                messageId: messageId,
                userId: userId,
            },
            data: {
                status: status, // ej: "read"
                updatedAt: new Date(),
            }
        });

        if (updatedStatus.count === 0) {
            return res.status(404).json({ error: "Estado de mensaje no encontrado para este usuario" });
        }

        res.json({ success: true, message: "Estado actualizado" });
    } catch (error) {
        console.error("Error al cambiar el estado del mensaje:", error);
        res.status(500).json({ error: "Error al cambiar el estado del mensaje" });
    }
};
