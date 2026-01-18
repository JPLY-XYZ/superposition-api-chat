import { ChatType } from "@prisma/client";
import prisma from "../../lib/prisma.js";

//in {participantIds}, out { conversation } == { id, type, name, imageUrl, createdAt, otherUsers, participantIds, lastMessageText }
const findPrivateChat = async (participantIds) => {
  // Aseguramos que hay 2 IDs
  if (!participantIds || participantIds.length < 2) return null;

  const [userA, userB] = participantIds;

  const chat = await prisma.conversation.findFirst({
    where: {
      type: ChatType.DIRECT,
      AND: [
        { participants: { some: { userId: userA } } },
        { participants: { some: { userId: userB } } }
      ]
    },
    include: {
      participants: true,
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' }
      }
    },
  });

  return {
    id: chat.id,
    type: chat.type,
    name: chat.type === 'DIRECT' ? chat.participants.find(p => p.userId !== userA)?.user.displayName : chat.name,
    imageUrl: chat.type === 'DIRECT' ? chat.participants.find(p => p.userId !== userA)?.user.imageUrl : chat.imageUrl,
    createdAt: chat.createdAt,
    otherUsers: chat.participants.find(p => p.userId !== userA)?.user,
    participantIds: chat.participants.map(p => p.userId),
    lastMessageText: chat.messages[0]?.content || null
  };

};

export default findPrivateChat;
