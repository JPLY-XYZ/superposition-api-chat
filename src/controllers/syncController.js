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
        status: 'READ', // <--- FILTRO: Solo trae confirmaciones de lectura
        message: {
          senderId: userId // Solo mensajes enviados por mí
        }
      },
      select: {
        messageId: true,
        userId: true, // Quién lo leyó
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
