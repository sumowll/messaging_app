// src/socket.js
import { io } from "socket.io-client";

const socket = io("http://localhost:3000"); // Same port as your backend
export default socket;
