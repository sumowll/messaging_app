const express = require("express");
const router = express.Router();
const { sendMessage, getMessages, getCountUnread, markMessagesAsRead } = require("../controllers/messageController");

router.post("/", sendMessage); // POST /api/messages
router.get("/", getMessages); // GET /api/messages?with=bob@example.com
router.get("/unread", getCountUnread);
router.post("/mark-read", markMessagesAsRead); // POST /api/messages/read


module.exports = router;
