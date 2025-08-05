import { useState, useEffect, useRef, useCallback } from "react";
import { agenticCall } from "@api";
import socket from "../services/socket";
import "../styles/ChatBox.css";


function AIChatBox({ loggedInEmail, friendEmail, friendName }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const messagesEndRef = useRef(null);

  // Keep view scrolled to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Helper that appends a single message object
  const pushMessage = useCallback(msg =>
    setMessages(prev => [...prev, msg]),
  []);

  // Send handler --------------------------------------------------------
  const handleSend = async () => {
    if (!text.trim()) return;

    // 3-a. Optimistically add the user’s message
    const userMsg = {
      message_id: crypto.randomUUID(),
      from: loggedInEmail,
      text,
    };
    pushMessage(userMsg);
    setText("");           // clear input

    try {
      // 3-b. Ask the agent
      const aiReply = await agenticCall(text);

      // Shape matches your render loop
      const aiMsg = {
        message_id: crypto.randomUUID(),
        from: "agenticAI",
        text: aiReply.text,
        calendar_link: aiReply.calendar_link,   // may be undefined
        tool: aiReply.tool,         // may be undefined
      };
      pushMessage(aiMsg);
    } catch (err) {
      console.error(err);
      pushMessage({
        message_id: crypto.randomUUID(),
        from: "agenticAI",
        text: "⚠️ AI failed to respond",
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ---------------- existing JSX --------------- */
  return (
    <div className="chatbox-container">
      <h3 className="chatbox-header">
        AI Assistant
      </h3>

      <div className="chatbox-messages">
        {messages.map((msg) => {
          const isSender = msg.from === loggedInEmail;
          const senderLabel = isSender ? "You" : (msg.from === "agenticAI" ? "AI" : friendName);

          return (
            <div
              key={msg.message_id}
              className={`chatbox-message ${isSender ? "sent" : "received"}`}
            >
              <div className="chatbox-sender-name">{senderLabel}</div>
              <div className="chatbox-bubble">
                <div className="chatbox-text">
                  {msg.text}
                  {msg.calendar_link && (
                    <div className="chatbox-link">
                      <a href={msg.calendar_link} target="_blank" rel="noopener noreferrer">
                        📅 View Calendar Event
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbox-input-area">
        <input
          className="chatbox-textarea"
          placeholder="Type message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="chatbox-send" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
}


export default AIChatBox;
