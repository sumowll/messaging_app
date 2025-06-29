// controllers/authController.js
const { createUser, findUserByEmail, comparePasswords } = require("../models/authModel");

exports.register = async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password)
    return res.status(400).json({ error: "Missing fields" });

  try {
    await createUser({ email, name, password });
    res.json({ message: "User registered" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(404).json({ error: "User not found" });

    const match = await comparePasswords(password, user.password_hash);
    if (!match) return res.status(401).json({ error: "Incorrect password" });

    res.json({ message: "Login successful", name: user.name });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
};
