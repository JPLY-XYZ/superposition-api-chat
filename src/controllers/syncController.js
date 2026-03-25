import prisma from "../../lib/prisma.js";

//in {?lastSync}, out {conversations[], messages[], messageUpdates[]}
const sync = async (req, res) => {
  const userId = req.user.id;

  console.log(req.query.lastSync);
  // Si lastSync no viene, usamos fecha 0 (Trae todo el historial)
  const timestamp = Number(req.query.lastSync);
  const lastSyncDate = !isNaN(timestamp) ? new Date(timestamp) : new Date(0);

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
              select: { id: true, displayName: true, imageUrl: true, publicKey: true, code: true }
            }
          }
        }
      }
    });

    // 2. MENSAJES (Server)
    const messages = await prisma.message.findMany({
      where: {
        createdAt: { gt: lastSyncDate },
        conversation: {
          participants: { some: { userId: userId } }
        }
      },
      include: {
        // CAMBIO AQUÍ: Usamos 'statuses' que es el nombre real en tu esquema
        statuses: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // MAPEAMOS LOS MENSAJES
    const formattedMessages = messages.map(msg => {
      // Buscamos si hay un estado puesto por el RECEPTOR (alguien que no soy yo)
      const remoteStatus = msg.statuses.find(s => s.userId !== userId);

      return {
        ...msg,
        // Lógica: 
        // Si yo lo envié: 'read' > 'received' > 'sent' (según rastro del otro)
        // Si yo lo recibí: 'received' por defecto al descargar
        status: msg.senderId === userId
          ? (remoteStatus ? remoteStatus.status.toLowerCase() : 'sent')
          : 'received',
        statuses: undefined // Limpiamos para no enviar datos extra al móvil
      };
    });

    // 3. ACTUALIZACIONES (Para mensajes antiguos que cambiaron de estado)
    const messageUpdates = await prisma.messageStatus.findMany({
      where: {
        updatedAt: { gt: lastSyncDate },
        status: { in: ['RECEIVED', 'READ'] },
        message: { senderId: userId }
      },
      select: {
        messageId: true,
        status: true,
        updatedAt: true
      }
    });

    return res.json({
      conversations,
      messages: formattedMessages,
      messageUpdates
    });

  } catch (error) {
    console.error("Sync Error:", error);
    return res.status(500).json({ error: "Error de sincronización" });
  }
}

export { sync };
