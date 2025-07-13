import { useState, useEffect, useRef } from "react";
import { sendMessage, getMessages } from "@api";
import socket from "../services/socket";
import "../styles/ChatBox.css";

function ChatBox({ loggedInEmail, friendEmail, friendName, setUnreadCounts }) {
  
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const loggedInEmailRef = useRef(loggedInEmail);
  const friendEmailRef = useRef(friendEmail);

  function getRoomId(email1, email2) {
  return [email1, email2].sort().join("-");
  } 

  const loadMessages = async (loggedInEmail, friendEmail) => {
    try {
      const msgs = await getMessages(loggedInEmail, friendEmail);
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (err) {
      console.error("Failed to load messages:", err);
      setMessages([]);
    }
  };

  const handleSend = async () => {
    if (!loggedInEmail || !friendEmail || typeof friendEmail !== "string") {
      console.error("Invalid sender or recipient email", loggedInEmail, friendEmail);
      return;}

    if (!text.trim()) return;

    const newMessage = {
      // conversationID: getRoomId(loggedInEmail, friendEmail), // should be created on the backend
      from: loggedInEmail,
      to: friendEmail,
      text,
      // timestamp: Date.now(), // timestamp will be set by the backend
    };

    socket.emit("send_message", newMessage);
    // await sendMessage(loggedInEmail, friendEmail, text); // not using API call anymore, handled by socket
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
// =========================================================================
  useEffect(() => {
    loggedInEmailRef.current = loggedInEmail;
    friendEmailRef.current = friendEmail;
  }, [loggedInEmail, friendEmail]);

  useEffect(() => {
    const handleReceive = (message) => {
      const currentRoom = getRoomId(loggedInEmailRef.current, friendEmailRef.current);
      if (message.roomId !== currentRoom) return;

      setMessages((prev) => {
        const exists = prev.some(
          (m) =>
            m.timestamp === message.timestamp &&
            m.text === message.text &&
            m.from === message.from
        );
        return exists ? prev : [...prev, { ...message, from: message.from }];
      });
    };

    socket.on("receive_message", handleReceive);
    return () => socket.off("receive_message", handleReceive);
  }, []);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!friendEmail) return;
    const roomId = getRoomId(loggedInEmail, friendEmail);
    socket.emit("join", roomId);
    loadMessages(loggedInEmail, friendEmail);


    setUnreadCounts((prev) => {
      const updated = { ...prev };
      delete updated[friendEmail];
      return updated;
    });
  }, [friendEmail, loggedInEmail]);

  useEffect(() => {
  const textarea = document.querySelector(".chatbox-textarea");
  if (textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }
  }, [text]);
  

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
