import { useState, useEffect } from "react";
import AuthForm from "./components/AuthForm";
import FriendSearch from "./components/FriendSearch";
import ChatBox from "@components/ChatBox";
import "./App.css";

function App() {
  console.log("APP MOUNTED");
  const [mode, setMode] = useState(null);
  const [loggedInEmail, setLoggedInEmail] = useState(null);
  const [loggedInName, setLoggedInName] = useState(null);
  const [activeChat, setActiveChat] = useState(null);

  const handleLogin = (email, name) => {
    setLoggedInEmail(email);
    setLoggedInName(name || email);
  };

  const handleLogout = () => {
    setLoggedInEmail(null);
    setLoggedInName(null);
    setActiveChat(null);
    setMode(null);
  };


  if (!loggedInEmail) {
    return (
      <div className="auth-container">
        {!mode ? (
          <>
            <h1>Welcome</h1>
            <button onClick={() => setMode("register")}>Register</button>
            <button onClick={() => setMode("login")}>Login</button>
          </>
        ) : (
          <AuthForm mode={mode} setMode={setMode} onLogin={handleLogin} />
        )}
      </div>
    );
  }

    return (
      <div className="app-container">
        <div className="sidebar">
          <h2>{loggedInName}</h2>
          <button onClick={handleLogout} className="logout-button">Logout</button>

          <FriendSearch
          loggedInEmail={loggedInEmail}
          onChatStart={setActiveChat}
          />

        </div>

        <div className="chat-area">
          {activeChat ? (
            <ChatBox loggedInEmail={loggedInEmail} friendEmail={activeChat} />
          ) : (
            <div className="placeholder-text">Select a contact to start chatting.</div>
          )}
        </div>
      </div>
    );
}

export default App;
