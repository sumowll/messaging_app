import { useState, useEffect, useRef } from "react";
// import { sendMessage, getMessages } from "../api";
import { sendMessage, getMessages} from "@api";




function ChatBox({ loggedInEmail, friendEmail }) {

  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);

  const loadMessages = async () => {
    try {
      const msgs = await getMessages(loggedInEmail, friendEmail);
      if (Array.isArray(msgs)) {
        setMessages(msgs);
      } else {
        console.warn("Unexpected messages format:", msgs);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
      setMessages([]);
    }
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

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div style={{ marginTop: "2rem" }}>
      <h3>Chat with {friendEmail}</h3>
      <div style={{ border: "1px solid #ccc", height: "200px", overflowY: "scroll", padding: "1rem" }}>
        {messages.map((msg) => {
            const isSender = msg.from === loggedInEmail;
            const timestamp = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={msg.message_id}
                style={{
                  textAlign: isSender ? "right" : "left",
                  margin: "0.5rem 0"
                }}
              >
                <div>
                  <span style={{ fontWeight: "bold" }}>
                    {isSender ? "You" : msg.from}
                  </span>
                  <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", color: "#888" }}>
                    {timestamp}
                  </span>
                </div>
                <div>{msg.text}</div>
              </div>
            );
          })}
        <div ref={messagesEndRef} />
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
