require('dotenv').config();


// server.js (Backend)
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { DynamoDBClient, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand, QueryCommand, PutCommand, GetCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const TABLE_NAME = "messaging-users"; // Change this if needed
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-1" }));

// 1. Register user
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid"); // if you want user_id

app.post("/register", async (req, res) => {
  const { email, name, password } = req.body;

  if (!email || !name || !password) {
    return res.status(400).json({ error: "Email, name, and password required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10); // 10 salt rounds

    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        user_id: uuidv4(),
        created_at: new Date().toISOString(),
        email,
        name,
        password_hash: hashedPassword
      }
    }));

    res.json({ message: "User registered" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});


app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { email }
  }));

  const user = result.Item;
  
  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.password_hash.startsWith("$2b$")) {
    // stored password is bcrypt hash
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: "Incorrect password" });
  } else {
    // stored password is plaintext
    if (user.password !== password)
      return res.status(401).json({ error: "Incorrect password" });

    // Optional: upgrade to bcrypt hash on successful login
    const newHash = await bcrypt.hash(password, 10);
    await ddb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { email },
      UpdateExpression: "SET password = :p",
      ExpressionAttributeValues: { ":p": newHash }
    }));
  }

  res.json({ message: "Login successful", name: user.name });
});



// 2. Search users by name
app.get("/search", async (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: "Name required" });

  try {
    const result = await ddb.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "contains(#nm, :n)",
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
    // const dynamo = new DynamoDBClient({ region: "us-east-1" });

    const updateA = ddb.send(new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: { email: { S: userEmail } },
      UpdateExpression: "ADD friends :f",
      ExpressionAttributeValues: {
        ":f": { SS: [friendEmail] }
      }
    }));

    const updateB = ddb.send(new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: { email: { S: friendEmail } },
      UpdateExpression: "ADD friends :f",
      ExpressionAttributeValues: {
        ":f": { SS: [userEmail] }
      }
    }))

    await Promise.all([updateA, updateB]);
    res.json({ message: "Friendship established" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Friendship failed" });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
