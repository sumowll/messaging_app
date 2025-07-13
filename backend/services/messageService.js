// services/messageService.js
import { createMessage } from '../models/messageModel.js';
import { emitToRoom, emitToUserNotifications } from './socketUtils.js';

// This service handles message creation and notification logic
export const sendMessageAndNotify = async ({ from, to, text, io }) => {
  const roomId = [from, to].sort().join("-");
  const chatRoom = `chat:${roomId}`;

  // 🔍 Check if recipient is in the room
  const socketsInRoom = await io.in(chatRoom).fetchSockets();
  const isRecipientInRoom = socketsInRoom.some(
    (socket) => socket.userEmail === to
  );

  // ✅ Set read flag based on presence
  const read = isRecipientInRoom ? 1 : 0;

  // 📝 Create the message with correct read status
  const result = await createMessage({ from, to, text, read });

  // 📤 Emit to the room
  emitToRoom(chatRoom, "receive_message", {
    roomId,
    from,
    to,
    text,
    timestamp: result.timestamp,
    read, // optional — can be used on client for UI
  });

  // 🔔 Notify only if recipient isn't present
  if (!isRecipientInRoom) {
    emitToUserNotifications(to, "new_unread", { from });
  }

  return {
    message: "Message sent",
    message_id: result.message_id,
    timestamp: result.timestamp,
  };
};

