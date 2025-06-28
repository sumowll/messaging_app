require('dotenv').config();


// server.js (Backend)
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand, QueryCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const TABLE_NAME = "messaging-users"; // Change this if needed
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-1" }));

// 1. Register user
app.post("/register", async (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) return res.status(400).json({ error: "Email and name required" });
  try {
    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: { email, name, friends: [] }
    }));
    res.json({ message: "User registered" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// 2. Search users by name
app.get("/search", async (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: "Name required" });
  try {
    const result = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "name-index",
      KeyConditionExpression: "#nm = :n",
      ExpressionAttributeNames: { "#nm": "name" },
      ExpressionAttributeValues: { ":n": name }
    }));
    res.json(result.Items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});

// 3. Add friend (reciprocal)
app.post("/add-friend", async (req, res) => {
  const { userEmail, friendEmail } = req.body;
  if (!userEmail || !friendEmail || userEmail === friendEmail)
    return res.status(400).json({ error: "Invalid emails" });
  try {
    const updateA = ddb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { email: userEmail },
      UpdateExpression: "ADD friends :f",
      ExpressionAttributeValues: { ":f": ddb.createSet([friendEmail]) }
    }));

    const updateB = ddb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { email: friendEmail },
      UpdateExpression: "ADD friends :f",
      ExpressionAttributeValues: { ":f": ddb.createSet([userEmail]) }
    }));

    await Promise.all([updateA, updateB]);
    res.json({ message: "Friendship established" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Friendship failed" });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
