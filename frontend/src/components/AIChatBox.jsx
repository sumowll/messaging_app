import { useState, useEffect, useRef } from "react";
import { sendMessage, getMessages } from "@api";
import socket from "../services/socket";
import "../styles/ChatBox.css";

function ChatBox({ loggedInEmail, friendEmail }) {
  

  // =========================================================================

  return (
    <div className="chatbox-container">
      <h3 className="chatbox-header">
        Chat with <span className="chatbox-friend-name">{friendName}</span>
      </h3>

      <div className="chatbox-messages">
        {messages.map((msg) => {
          const isSender = msg.from === loggedInEmail;
          const senderLabel = isSender ? "You" : friendName;

          return (
            <div
              key={msg.message_id}
              className={`chatbox-message ${isSender ? "sent" : "received"}`}
            >
              <div className="chatbox-sender-name">{senderLabel}</div>

              <div className="chatbox-bubble">
                <div className="chatbox-text">{msg.text}</div>
                <div className="chatbox-hover-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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
          onKeyDown={handleKeyDown} // ✅ Enter to send
        />
        <button className="chatbox-send" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
