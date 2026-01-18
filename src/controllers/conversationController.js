import prisma from "../../lib/prisma.js";
import findPrivateChat from "../helpers/chat.js";

//in {conversation} = { id, type = DIRECT/GROUP , name, imageUrl, participants[] } = {id,type, name, imageUrl, participants[]} , out { conversation }
export const createConversation = async (req, res) => {
  const { id, participants, name, imageUrl, type } = req.body;
  const creatorId = req.user.id;

  try {
    //comprobamos que los participantes sean un array
    if (!participants || !Array.isArray(participants)) {
      return res.status(400).json({ error: "Participantes inválidos" });
    }

    //Si envían un ID, verificamos primero si ya existe en la BD
    if (id) {
      const existingById = await prisma.conversation.findUnique({
        where: { id },
        include: { participants: true }
      });

      //Si existe el chat, se retorna
      if (existingById) return res.status(200).json(existingById);
    }
    //Se eliminan los duplicados y se añade el creador si no esta ya
    const allParticipants = [...new Set([...participants, creatorId])];

    //Lógica de deduplicación para chats 1-1
    const isDirect = type === 'DIRECT' || (allParticipants.length === 2 && !name);

    if (isDirect && !id) {
      // Solo buscamos duplicados si NO nos pasaron un ID específico
      const existingDirect = await prisma.conversation.findFirst({
        where: {
          type: 'DIRECT',
          participants: { every: { userId: { in: allParticipants } } }
        },
        include: { participants: true }
      });

      //Si existe el chat, se retorna
      if (existingDirect) return res.status(200).json(existingDirect);
    }

    //Creación en la base de datos
    const newConversation = await prisma.conversation.create({
      data: {
        id: id,
        type: isDirect ? 'DIRECT' : 'GROUP',
        name: isDirect ? null : name,
        imageUrl: isDirect ? null : imageUrl,
        participants: {
          create: allParticipants.map(userId => ({ userId }))
        }
      },
      include: { participants: true }
    });

    //Se retorna la conversación creada
    return res.status(201).json(newConversation);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No se pudo crear la conversación" });
  }
};


//in {lastConv}, out { conversations } == { id, type, name, imageUrl, createdAt, otherUsers, participantIds, lastMessageText }
export const getUserConversations = async (req, res) => {
  try {
    const { lastConv } = req.query;

    //Se buscan las conversaciones del usuario
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { userId: req.user.id } },
        createdAt: lastConv ? { gt: new Date(lastConv) } : undefined,
      },
      include: { //Se incluyen los participantes de cada conversación
        participants: {
          include: {
            user: { select: { id: true, displayName: true, imageUrl: true, code: true, publicKey: true } }
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true }
        }
      }
    });

    //Se formatean las conversaciones para devolverlas con lo necesario
    const formatted = conversations.map(conv => {

      // Extraemos solo a los otros participantes
      const others = conv.participants
        .filter(p => p.userId !== req.user.id)
        .map(p => p.user);

      //Se retorna la conversación formateada
      return {
        id: conv.id,
        type: conv.type,
        name: conv.type === 'DIRECT' ? others[0]?.displayName : conv.name,
        imageUrl: conv.type === 'DIRECT' ? others[0]?.imageUrl : conv.imageUrl,
        createdAt: conv.createdAt,
        otherUsers: others,
        participantIds: conv.participants.map(p => p.userId),
        lastMessageText: conv.messages[0]?.content || null
      };
    });

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Error al sincronizar conversaciones" });
  }
};


// in {contactId}, out { conversation } == { id, type, name, imageUrl, createdAt, otherUsers, participantIds, lastMessageText }
export const getExistingConversation = async (req, res) => {
  try {
    const myId = req.user.id;

    const { contactId } = req.body;

    if (!contactId) {
      return res.status(400).json({ error: "Falta el ID del contacto" });
    }

    //Se busca la conversación
    const conversation = await findPrivateChat([myId, contactId]);

    if (!conversation) {
      return res.status(404).json({ message: "No existe conversación" });
    }

    //Se retorna la conversación
    res.json(conversation);

  } catch (error) {
    res.status(500).json({ error: "Error al buscar la conversación" });
  }
};