import { Expo } from 'expo-server-sdk';

const expo = new Expo();

export const sendNotification = async (pushToken, message) => {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Token inválido: ${pushToken}`);
    return;
  }

  const mensajes = [{
    to: pushToken,
    sound: 'default',
    body: message,
    data: { route: 'Chat' },
  }];

  try {
    let tickets = await expo.sendPushNotificationsAsync(mensajes);
    console.log('Notificación enviada:', tickets);
  } catch (error) {
    console.error('Error enviando notificación:', error);
  }
};