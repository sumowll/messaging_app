// services/messageService.js
import { createMessage, markMessagesAsReadInDB } from '../models/messageModel.js';
import { emitToRoom, emitToUserNotifications } from './socketUtils.js';

// This service handles message creation and notification logic

export const sendMessageAndNotify = async ({ from, to, text, io }) => {
  const result = await createMessage({ from, to, text });

  const roomId = [from, to].sort().join('-');
  const chatRoom = `chat:${roomId}`;

  emitToRoom(chatRoom, 'receive_message', {
    roomId,
    from,
    to,
    text,
    timestamp: result.timestamp,
  });

  // Fetch sockets currently in the chat room
  const socketsInRoom = await io.in(chatRoom).fetchSockets();

  // Check if the recipient is present in the room
  const isRecipientInRoom = socketsInRoom.some(socket => socket.userEmail === to);

  // Only send notification if recipient is NOT in the chat room
  if (!isRecipientInRoom) {
    emitToUserNotifications(to, 'new_unread', { from });
  }

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
