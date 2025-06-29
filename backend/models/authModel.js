// models/userModel.js
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const ddb = require("../config/db");
const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const { TABLES } = require("../config/constants");
const TABLE_NAME = TABLES.USERS;

async function createUser({ email, name, password }) {
  const password_hash = await bcrypt.hash(password, 10);
  const user = {
    user_id: uuidv4(),
    email,
    name,
    password_hash,
    created_at: new Date().toISOString(),
  };

  await ddb.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: user
  }));

  return { email: user.email, name: user.name };
}

async function findUserByEmail(email) {
  const result = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { email }
  }));

  return result.Item;
}

async function comparePasswords(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = {
  createUser,
  findUserByEmail,
  comparePasswords
};
