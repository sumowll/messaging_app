// controllers/userController.js
const { findUsersByName } = require("../models/userModel");

exports.searchUsers = async (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: "Name is required" });

  try {
    const users = await findUsersByName(name);
    res.json(users);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Failed to search users" });
  }
};


const { addFriendPair } = require("../models/userModel");

exports.addFriend = async (req, res) => {
  const { userEmail, friendEmail } = req.body;

  if (!userEmail || !friendEmail || userEmail === friendEmail)
    return res.status(400).json({ error: "Invalid email addresses" });

  try {
    const result = await addFriendPair(userEmail, friendEmail); // ✅ capture return
    res.json(result); // ✅ send it back
  } catch (err) {
    console.error("Add friend error:", err);
    res.status(500).json({ error: "Failed to add friend" });
  }
};


