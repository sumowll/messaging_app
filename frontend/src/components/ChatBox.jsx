import { useState, useEffect } from "react";
import { sendMessage, getMessages } from "../api";

function ChatBox({ loggedInEmail, friendEmail }) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);

  const loadMessages = async () => {
    const msgs = await getMessages(loggedInEmail, friendEmail);
    setMessages(msgs);
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    await sendMessage(loggedInEmail, friendEmail, text);
    setText("");
    loadMessages(); // Refresh messages
  };

  useEffect(() => {
    if (friendEmail) loadMessages();
  }, [friendEmail]);

  return (
    <div style={{ marginTop: "2rem" }}>
      <h3>Chat with {friendEmail}</h3>
      <div style={{ border: "1px solid #ccc", height: "200px", overflowY: "scroll", padding: "1rem" }}>
        {messages.map((msg) => (
          <div key={msg.message_id} style={{ textAlign: msg.from === loggedInEmail ? "right" : "left" }}>
            <b>{msg.from === loggedInEmail ? "You" : msg.from}</b>: {msg.text}
          </div>
        ))}
      </div>
      <input
        placeholder="Type message"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}

export default ChatBox;
