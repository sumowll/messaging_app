const express = require("express");
const router = express.Router();
const { sendMessage, getMessages } = require("../controllers/messageController");

router.post("/", sendMessage); // POST /api/messages
router.get("/", getMessages); // GET /api/messages?with=bob@example.com

module.exports = router;
