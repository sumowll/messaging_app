const { v4: uuidv4 } = require("uuid");
// const { TransactWriteItemsCommand } = require("@aws-sdk/client-dynamodb");
const { QueryCommand, PutCommand, DynamoDBDocumentClient, TransactWriteCommand, UpdateCommand} = require("@aws-sdk/lib-dynamodb");
const ddb = require("../config/db");
const { TABLES } = require("../config/constants");
const TABLE_NAME = TABLES.MESSAGES;


function getConversationId(a, b) {
  return [a, b].sort().join("|");
}

const createMessage = async ({ from, to, text }) => {
  const timestamp = new Date().toISOString();
  const message_id = uuidv4();
  const conversation_id = getConversationId(from, to);

  // Create the item to be stored in DynamoDB and match the schema and types
  if (!from || !to || !text) {
    throw new Error("Missing required fields: from, to, text");
  }
  const item = {
    conversation_id,            // string
    message_id,                 // string (UUID)
    from,                       // string
    to,                         // string
    text,                       // string
    timestamp,                  // string (ISO timestamp)
    read: 0 // equivalent to false/unread
  };

  try {
    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    }));

    return {
      message: "Message sent",
      message_id,
      timestamp
    };
  } catch (err) {
    console.error("Failed to write message to DynamoDB:", err);
    throw new Error("Failed to send message");
  }
};


const fetchMessages = async (from, to) => {
  const conversation_id = getConversationId(from, to);

  const params_history = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "conversation_id = :cid",
    ExpressionAttributeValues: {
      ":cid": conversation_id,
    },
    ScanIndexForward: true, // Order by ascending timestamp
  };

  try {
    const data = await ddb.send(new QueryCommand(params_history));
    return data.Items;
  } catch (err) {
    console.error("Failed to fetch messages from DynamoDB:", err);
    throw err;
  }
};

const countUnread = async (userEmail) => {
  const params = {
    TableName: TABLE_NAME,
    IndexName: "to-read-index",
    KeyConditionExpression: '#to = :to AND #read = :read',
    ExpressionAttributeNames: {
      '#to': 'to',
      '#read': 'read'
    },
    ExpressionAttributeValues: {
      ':to': userEmail,
      ':read': 0
    }
  };

  try {
    const data = await ddb.send(new QueryCommand(params));
    const counts = {};

    for (const msg of data.Items || []) {
      const from = msg.from;
      counts[from] = (counts[from] || 0) + 1;
    }

    return counts; // ✅ returns: { "alice@example.com": 2, ... }
  } catch (err) {
    console.error("Failed to count unread messages:", err);
    throw err;
  }
};


const docClient = DynamoDBDocumentClient.from(ddb);

const markMessagesAsReadInDB = async (from, to) => {
  console.log(`[DEBUG] markMessagesAsReadInDB called with from=${from}, to=${to}`);

  const conversationId = getConversationId(from, to);

  const queryParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'conversation_id = :cid',
    FilterExpression: '#from = :from AND #to = :to AND #read = :read',
    ExpressionAttributeNames: {
      '#from': 'from',
      '#to': 'to',
      '#read': 'read'
    },
    ExpressionAttributeValues: {
      ':cid': conversationId,
      ':from': from,
      ':to': to,
      ':read': 0   // ✅ Unread messages only
    }
  };

  const result = await docClient.send(new QueryCommand(queryParams));
  const messages = result.Items || [];
  console.log(`[DEBUG] Found ${messages.length} unread messages for conversation ${conversationId}`);

  if (messages.length === 0) return 0;

  let updatedCount = 0;

  for (const msg of messages) {
    try {
      await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          conversation_id: msg.conversation_id,
          timestamp: msg.timestamp
        },
        UpdateExpression: 'SET #read = :read',
        ConditionExpression: '#read = :expected', // Only update if currently unread
        ExpressionAttributeNames: { '#read': 'read' },
        ExpressionAttributeValues: {
          ':read': 1,
          ':expected': 0
        }
      }));
      updatedCount++;
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException') {
        // Already read — safe to ignore
      } else {
        console.error(`[ERROR] Failed to mark message as read:`, err);
        throw err; // Unexpected error — rethrow
      }
    }
  }

  console.log(`✅ Marked ${updatedCount} messages as read for conversation ${conversationId}`);
  return updatedCount;

};


module.exports = {
  createMessage,
  fetchMessages, 
  countUnread,
  markMessagesAsReadInDB,
};
