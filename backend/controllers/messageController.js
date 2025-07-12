const { createMessage, fetchMessages, countUnread, markMessagesAsReadInDB } = require("../models/messageModel");
const { emitToRoom, emitToUserNotifications, emitUnreadCounts } = require('../services/socketUtils');
const { sendMessageAndNotify } = require('../services/messageService');


const sendMessage = async (req, res) => {
  const { to, text } = req.body;
  const from = req.body.from || req.user?.email;

  if (!from || !to || !text) {
    return res.status(400).json({ error: "Missing required fields: from, to, text" });
  }

  try {
    const result = await sendMessageAndNotify({ from, to, text });
    res.status(201).json(result);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
};

const getMessages = async (req, res) => {
  const userEmail = req.user?.email || req.query.from;
  const friendEmail = req.query.with;

  if (!userEmail || !friendEmail) {
    return res.status(400).json({ error: "Missing 'with' or user context" });
  }

  try {
    const messages = await fetchMessages(userEmail, friendEmail);
    res.json(messages);
  } catch (err) {
    console.error("Fetch messages error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

const getCountUnread = async (req, res) => {
  const userEmail = req.user?.email || req.query.user;

  if (!userEmail) {
    return res.status(400).json({ error: "Missing 'user' context" });
  }

  try {
    const unreadCount = await countUnread(userEmail);
    emitUnreadCounts(userEmail, unreadCount); // Emit to socket for real-time updates
    res.json(unreadCount); // ✅ returns the full object

  } catch (err) {
    console.error("Count unread messages error:", err);
    res.status(500).json({ error: "Failed to count unread messages" });
  }
};

const markMessagesAsRead = async (req, res) => {
  console.log(`[DEBUG] markMessagesAsRead controller hit for ${req.body.from} → ${req.body.to}`);
  const { from, to } = req.body;
  if (!from || !to) {
    return res.status(400).json({ error: "Missing 'from' or 'to'" });
  }

  try {
    const updatedCount = await markMessagesAsReadInDB(from, to);
    res.status(200).json({ updated: updatedCount });
  } catch (err) {
    console.error("Failed to mark messages as read:", err);
    res.status(500).json({ error: "Failed to update messages" });
  }
};


module.exports = {
  sendMessage,
  getMessages,
  getCountUnread,
  markMessagesAsRead
};
