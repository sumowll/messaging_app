const { v4: uuidv4 } = require("uuid");
const { QueryCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const ddb = require("../config/db");
const { TABLES } = require("../config/constants");
const TABLE_NAME = TABLES.MESSAGES;
const GSI_NAME = "conversation_index";

function getConversationId(a, b) {
  return [a, b].sort().join("|");
}

exports.createMessage = async ({ from, to, text }) => {
  const timestamp = new Date().toISOString();
  const message_id = uuidv4();
  const conversation_id = getConversationId(from, to);

  const item = {
    message_id,
    from,
    to,
    text,
    timestamp,
    read: false,
    conversation_id
  };

  await ddb.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: item
  }));

  return {
    message: "Message sent",
    message_id,
    timestamp
  };
};

exports.fetchMessages = async (userEmail, friendEmail) => {
  const conversation_id = getConversationId(userEmail, friendEmail);

  const result = await ddb.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: GSI_NAME,
    KeyConditionExpression: "conversation_id = :cid",
    ExpressionAttributeValues: {
      ":cid": conversation_id
    },
    ScanIndexForward: true // true = oldest to newest
  }));

  return result.Items || [];
};
