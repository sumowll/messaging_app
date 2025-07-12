require('dotenv').config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http");               // <-- Added for HTTP server
const { Server } = require("socket.io");    // <-- Socket.IO import

// Import routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Route registration
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

// Logging middleware
app.use((req, res, next) => {
  console.log(`[BACKEND] ${req.method} ${req.url}`);
  next();
});

// Create HTTP server and bind Socket.IO to it
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, set this to your frontend URL
    methods: ["GET", "POST"]
  }
});

// Import and initialize socket service
const socketService = require('./services/socketUtils');
const { registerSocketHandlers } = require('./services/socketHandler');
socketService.init(io); // 💥 Initialize once, after io is created
registerSocketHandlers(io); // Register your socket events


// Start both HTTP and WebSocket servers
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

