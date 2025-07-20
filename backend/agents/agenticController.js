// assistantController.js
const axios = require('axios');

async function getAssistantResponse(userText) {
  try {
    const res = await axios.post("http://localhost:5050/agent/chat", {
      message: userText
    });
    return res.data.response;
  } catch (err) {
    console.error("Agent error:", err.message);
    return "Sorry, I had trouble understanding that.";
  }
}

module.exports = { getAssistantResponse };
