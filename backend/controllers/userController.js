// controllers/userController.js
const { findUsersByName, addFriendPair, getUserContacts } = require("../models/userModel");

exports.searchUsers = async (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: "Name is required" });

  try {
    // Extract only name and email from each user
    const users = await findUsersByName(name);

    // Extract only name and email from each user
    const simplifiedUsers = users.map(user => ({
      name: user.name,
      email: user.email
    }));

    res.json(simplifiedUsers);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Failed to search users" });
  }
};

exports.getContacts = async(req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: "Missing 'email' query parameter." });
  }

  try {
    const contacts = await getUserContacts(email);
    return res.status(200).json(contacts);
  } catch (error) {
    console.error(`Error fetching contacts for ${email}:`, error);
    return res.status(500).json({ error: "Failed to fetch contacts." });
  }
};


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


