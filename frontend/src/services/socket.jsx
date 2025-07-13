// src/socket.js
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  autoConnect: false
});

export function connectSocket(userEmail) {
  socket.auth = { userEmail };  // ✅ attach email BEFORE connect
  socket.connect();
  console.log("Socket connected for user:", userEmail);
}

export default socket;

