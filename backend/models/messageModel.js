const { v4: uuidv4 } = require("uuid");
const { QueryCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const ddb = require("../config/db");
const { TABLES } = require("../config/constants");
const TABLE_NAME = TABLES.MESSAGES;
const GSI_NAME = "conversation_index";

function getConversationId(a, b) {
  return [a, b].sort().join("|");
}

const createMessage = async ({ from, to, text }) => {
  const timestamp = new Date().toISOString();
  const message_id = uuidv4();
  const conversation_id = getConversationId(from, to);

  const item = {
    conversation_id,
    message_id,
    from,
    to,
    text,
    timestamp,
    read: false
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

  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "conversation_id = :cid",
    ExpressionAttributeValues: {
      ":cid": conversation_id,
    },
    ScanIndexForward: true, // Order by ascending timestamp
  };

  try {
    const data = await ddb.send(new QueryCommand(params));
    return data.Items;
  } catch (err) {
    console.error("Failed to fetch messages from DynamoDB:", err);
    throw err;
  }
};


module.exports = {
  createMessage,
  fetchMessages
};
