const express = require("express");
const router = express.Router();
const { searchUsers, addFriend } = require("../controllers/userController");

router.get("/search", searchUsers);
router.post("/add-friend", addFriend);

module.exports = router;
