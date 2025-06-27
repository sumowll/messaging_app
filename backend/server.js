require('dotenv').config(); // at the top of your server.js
const express = require("express");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const client = require("./dynamoClient");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");



const app = express();
app.use(express.json());

const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "messaging-users"; // Ensure this table exists in your DynamoDB

app.post("/register", async (req, res) => {
  console.log("📥 Register request:", req.body); // Add this log for debugging
  const { name, email, password } = req.body;

  try {
    // Check if user exists
    const existing = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { email }
    }));

    if (existing.Item) {
      return res.status(409).json({ error: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user_id = uuidv4();

    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        user_id,
        name,
        email,
        password_hash: hashed,
        created_at: new Date().toISOString()
      }
    }));

    res.status(201).json({ message: "User created", user_id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/user/:email(*)", async (req, res) => {

  const { email } = req.params;
  try {
    const user = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { email }
    }));
    res.json(user.Item || { message: "User not found" });
  } catch (err) {
    res.status(500).json({ error: "Error fetching user" });
  }
});


app.listen(3001, () => console.log("Backend running on http://localhost:3001"));
