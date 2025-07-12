let ioInstance = null;

function init(io) {
  ioInstance = io;
}

function emitUnreadCounts(userEmail, counts) {
  if (!ioInstance) {
    console.warn("Socket.IO not initialized");
    return;
  }
  ioInstance.to(`notifications:${userEmail}`).emit('unreadCounts', counts);
}

function emitToRoom(room, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(room).emit(event, payload);
  console.log(`📡 Emitting to room: ${room} — Clients:`, ioInstance.sockets.adapter.rooms.get(room));
}

function emitToUserNotifications(userId, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(`notifications:${userId}`).emit(event, payload);
}

// ====================================================================

module.exports = {
  init,
  emitUnreadCounts,
  emitToRoom,
  emitToUserNotifications,
};
