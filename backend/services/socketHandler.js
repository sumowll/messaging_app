import { sendMessageAndNotify } from './messageService.js';

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    
    const { userEmail } = socket.handshake.auth;
    socket.userEmail = userEmail;
    console.log(`✅ Socket connected with userEmail = ${userEmail}`);

    socket.on('join_notifications', ({ userId }) => {
      socket.join(`notifications:${userId}`);
      console.log(`🛎️ ${userId} joined notifications room`);
    });

    socket.on('join', (roomId) => {
      socket.join(`chat:${roomId}`);
      console.log(`💬 ${userEmail} Joined chat room ${roomId}`);
    });

    socket.on('send_message', async (msg) => {
      const { from, to, text } = msg;

      try {
        await sendMessageAndNotify({ from, to, text, io });
        console.log(`📤 Message from ${from} to ${to} handled via service is --  ${text}`);
      
      } catch (err) {
        console.error("Socket message failed:", err);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected');
    });
  });
}
