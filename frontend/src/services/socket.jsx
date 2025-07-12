// src/socket.js
import { io } from "socket.io-client";

// Same port as your backend
const socket = io("http://localhost:3000",
    {
        autoConnect: false // <- this is key
    }
); 

export default socket;
