const express = require("express");
const router = express.Router();
const { searchUsers, addFriend, getContacts } = require("../controllers/userController");

router.get("/search", searchUsers);
router.post("/connect", addFriend);
router.get("/contacts", getContacts);

module.exports = router;
