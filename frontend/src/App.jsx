import { useState } from "react";
import AuthForm from "./components/AuthForm";
import FriendSearch from "./components/FriendSearch";
import ChatBox from "./components/ChatBox";

function App() {
  const [mode, setMode] = useState(null); // null, "login", or "register"
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

  return (
    <div style={{ padding: "2rem" }}>
      {!loggedInEmail && mode === null && (
        <>
          <h1>Welcome</h1>
          <button onClick={() => setMode("register")}>Register</button>
          <button onClick={() => setMode("login")}>Login</button>
        </>
      )}

      {!loggedInEmail && mode && (
        <AuthForm mode={mode} setMode={setMode} onLogin={handleLogin} />
      )}

      {loggedInEmail && (
        <>
          <h2>Welcome, {loggedInName}</h2>
          <button onClick={handleLogout}>Logout</button>
          <FriendSearch
            loggedInEmail={loggedInEmail}
            onChatStart={(email) => setActiveChat(email)}
          />
          {activeChat && (
            <ChatBox
              loggedInEmail={loggedInEmail}
              friendEmail={activeChat}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
