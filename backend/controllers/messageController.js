const { createMessage, fetchMessages } = require("../models/messageModel");

exports.sendMessage = async (req, res) => {
  const { to, text } = req.body;
  const from = req.body.from || req.user?.email;

  if (!from || !to || !text) {
    return res.status(400).json({ error: "Missing required fields: from, to, text" });
  }

  try {
    const result = await createMessage({ from, to, text });
    res.status(201).json(result);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
};

exports.getMessages = async (req, res) => {
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
