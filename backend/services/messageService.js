// services/messageService.js
import { createMessage, markMessagesAsReadInDB } from '../models/messageModel.js';
import { emitToRoom, emitToUserNotifications } from './socketUtils.js';

// This service handles message creation and notification logic
export const sendMessageAndNotify = async ({ from, to, text }) => {
  const result = await createMessage({ from, to, text });

  const roomId = [from, to].sort().join('-');

  emitToRoom(`chat:${roomId}`, 'receive_message', {
    roomId,
    sender: from,
    to,
    text,
    timestamp: result.timestamp,
  });

  emitToUserNotifications(to, 'new_unread', { from });

  return {
    message: "Message sent",
    message_id: result.message_id,
    timestamp: result.timestamp
  };
};

// This service handles marking messages as read
export const markMessagesAsRead = async (from, to) => {
  await markMessagesAsReadInDB(from, to);
  console.log(`Marking messages as read for ${to}`);

  emitToUserNotifications(to, 'messages_read', { from });
};
