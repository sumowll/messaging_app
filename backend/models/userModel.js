// models/userModel.js
const ddb = require("../config/db");
const { ScanCommand, GetCommand, BatchGetCommand } = require("@aws-sdk/lib-dynamodb");
const { UpdateItemCommand } = require("@aws-sdk/client-dynamodb");

const { TABLES } = require("../config/constants");
const TABLE_NAME = TABLES.USERS;

// ============================================================================================
// FETCH USER CONTACTS

async function getUserContacts(email) {
  const user = await findUserByEmail(email);
  // console.log("User friends found:", user.friends); // Debugging line
  if (!user || !user.friends || user.friends.length === 0) return [];

  const friendsArray = Array.isArray(user.friends)
    ? user.friends
    : Array.from(user.friends || []);


  const keys = friendsArray.map(friendEmail => ({ email: friendEmail }));
  // console.log("keys:", keys);


  const command = new BatchGetCommand({
    RequestItems: {
      [TABLE_NAME]: {
        Keys: keys
      }
    }
  });

  const result = await ddb.send(command);
  // console.log("BatchGet result:", result); // Debugging line
  return result.Responses[TABLE_NAME].map(user => ({
    name: user.name,
    email: user.email,
    friends: Array.isArray(user.friends)
      ? user.friends
      : Array.from(user.friends || [])
  }));


}

// ============================================================================================
// FIND USERS BY NAME


async function findUsersByName(name) {
  const command = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: "contains(#nm, :n)",
    ExpressionAttributeNames: { "#nm": "name" },
    ExpressionAttributeValues: { ":n": name }
  });
// Uncomment the following lines if you want to use a QueryCommand instead of ScanCommand
//   This is useful if you have a GSI on the "name" attribute.

//   const command = new QueryCommand({
//   TableName: TABLE_NAME,
//   IndexName: "name_index",
//   KeyConditionExpression: "#nm = :namePrefix",
//   ExpressionAttributeNames: { "#nm": "name" },
//   ExpressionAttributeValues: { ":namePrefix": "Alice" }
// });


  const result = await ddb.send(command);
  // console.log("Scan result:", result); // Debugging line
  return result.Items;
}

// ============================================================================================
// FIND USER BY EMAIL

async function findUserByEmail(email) {
  const result = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { email }
  }));

  return result.Item;
}
// ============================================================================================
// ADD FRIEND PAIR

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
module.exports = { addFriendPair, findUsersByName, findUserByEmail, getUserContacts };
