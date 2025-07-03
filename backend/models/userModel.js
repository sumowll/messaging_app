// models/userModel.js
const ddb = require("../config/db");
const { ScanCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { UpdateItemCommand } = require("@aws-sdk/client-dynamodb");

const { TABLES } = require("../config/constants");
const TABLE_NAME = TABLES.USERS;

async function findUsersByName(name) {
  const command = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: "contains(#nm, :n)",
    ExpressionAttributeNames: { "#nm": "name" },
    ExpressionAttributeValues: { ":n": name }
  });

  const result = await ddb.send(command);
  // console.log("Scan result:", result); // Debugging line
  return result.Items;
}

async function findUserByEmail(email) {
  const result = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { email }
  }));

  return result.Item;
}

async function addFriendPair(userEmail, friendEmail) {
  // 1. Fetch both users
  const [userRes, friendRes] = await Promise.all([
    ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { email: userEmail } })),
    ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { email: friendEmail } }))
  ]);

  const user = userRes.Item;
  const friend = friendRes.Item;

  if (!user || !friend) throw new Error("One or both users not found");

  const userFriends = new Set(user.friends || []);
  const friendFriends = new Set(friend.friends || []);

  const alreadyFriends = userFriends.has(friendEmail) && friendFriends.has(userEmail);
  if (alreadyFriends) {
    // Optional: return a message or just silently skip
    console.log(`${userEmail} and ${friendEmail} are already friends`);
    return { message: "Already friends" };
  }

  // 2. Add reciprocal friendship using ADD (safe from duplication)
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
      }));

  await Promise.all([updateA, updateB]);
  return { message: "Friendship established" };
}

// Export functions for use in routes
// This allows us to use these functions in our route handlers
// e.g., in userRoutes.js we can import these functions to handle requests
// const { addFriendPair, findUsersByName, findUserByEmail } = require("../models/userModel");    

module.exports = { addFriendPair, findUsersByName, findUserByEmail };
