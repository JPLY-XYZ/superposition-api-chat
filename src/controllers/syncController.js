import prisma from "../../lib/prisma.js";

//in {?lastSync}, out {conversations[], messages[], messageUpdates[]}
const sync = async (req, res) => {
  const userId = req.user.id;
  
  // Si lastSync no viene, usamos fecha 0 (Trae todo el historial)
  const lastSyncDate = req.query.lastSync ? new Date(req.query.lastSync) : new Date(0);

  try {
    // 1. CONVERSACIONES
    // Solo traemos las que se crearon DESPUÉS de la última conexión
    const conversations = await prisma.conversation.findMany({
      where: {
        createdAt: { gt: lastSyncDate }, // <--- Clave: Usamos la fecha del grupo
        participants: {
          some: { userId: userId }       // Solo donde yo estoy
        }
      },
      include: {
        participants: {
          include: { 
            user: { 
              select: { id: true, displayName: true, imageUrl: true, publicKey: true } 
            } 
          }
        }
      }
    });

    // 2. MENSAJES
    // Mensajes nuevos en mis conversaciones
    const messages = await prisma.message.findMany({
      where: {
        createdAt: { gt: lastSyncDate },
        conversation: {
          participants: {
            some: { userId: userId }
          }
        }
      },
      orderBy: { createdAt: 'asc' } // Importante para que el cliente los pinte en orden
    });

    // 3. ACTUALIZACIONES DE ESTADO (Ticks)
    // Mensajes que cambiaron de estado (ej: a "READ") recientemente
    const messageUpdates = await prisma.messageStatus.findMany({
      where: {
        updatedAt: { gt: lastSyncDate },
        OR: [
          // A: Mensajes míos que alguien leyó
          { message: { senderId: userId } }, 
          // B: Mensajes de otros que YO leí en otro dispositivo
          { userId: userId } 
        ]
      },
      select: {
        messageId: true,
        status: true,
        userId: true,
        updatedAt: true
      }
    });

    return res.json({
      conversations,
      messages,
      messageUpdates: messageUpdates
    });

  } catch (error) {
    console.error("Sync Error:", error);
    return res.status(500).json({ error: "Error de sincronización" });
  }
}

export { sync };
