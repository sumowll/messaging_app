const axios = require('axios');

async function getAssistantResponse(userText) {
  try {
    // 1) Tell axios to return raw text
    const res = await axios.post(
      "http://localhost:5050/agents/chat",
      { user_msg: userText },
      { responseType: 'text' }
    );

    const rawText = res.data;  

    // 2) Split on any '====…\n' delimiter
    const chunks = rawText
      .split(/=+\n/)              
      .map(c => c.trim())
      .filter(Boolean);

    let result = {
      text: "",          // always return a text field
      calendar_link: undefined
    };

    for (const chunk of chunks) {
      // 3) Skip the LLM‐metadata dumps
      if (chunk.includes("additional_kwargs") || chunk.includes("response_metadata")) {
        continue;
      }

      // 4) JSON payload? (e.g. { "Event created": "…” })
      if (chunk.startsWith("{") && chunk.endsWith("}")) {
        try {
          const parsed = JSON.parse(chunk);
          if (parsed["Event created"]) {
            result.calendar_link = parsed["Event created"];
          }
        } catch (e) {
          // malformed JSON → ignore
        }
        continue;
      }

      // 5) Pure number (calculator tool)
      if (/^-?\d+(\.\d+)?$/.test(chunk)) {
        result.text = `The result is ${chunk}`;
        continue;
      }

      // 6) Otherwise treat it as the AI’s reply text
      result.text = chunk;
    }

    // If we never saw any reply chunk, fall back to a default message
    if (!result.text) {
      result.text = "⚠️ No response from AI.";
    }

    return result;

  } catch (err) {
    console.error("Agent error:", err.message);
    return { text: "Sorry, I had trouble understanding that." };
  }
}

module.exports = { getAssistantResponse };
