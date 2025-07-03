import { useState } from "react";
import AuthForm from "./components/AuthForm";
import FriendSearch from "./components/FriendSearch";
import ChatBox from "@components/ChatBox";

function App() {
  const [mode, setMode] = useState(null); // null, "login", or "register"
  const [loggedInEmail, setLoggedInEmail] = useState(null);
  const [loggedInName, setLoggedInName] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Example contact list — replace with actual dynamic list if needed
  const [contacts] = useState([
    { name: "test3", email: "test3@example.com" },
    { name: "test4", email: "test4@example.com" },
    { name: "su", email: "scmowll@gmail.com" }
  ]);

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

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Unauthenticated UI
  if (!loggedInEmail) {
    return (
      <div style={{ padding: "2rem" }}>
        {!mode && (
          <>
            <h1>Welcome</h1>
            <button onClick={() => setMode("register")}>Register</button>
            <button onClick={() => setMode("login")}>Login</button>
          </>
        )}
        {mode && (
          <AuthForm mode={mode} setMode={setMode} onLogin={handleLogin} />
        )}
      </div>
    );
  }

  // Authenticated UI
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Left: Contact Directory */}
      <div
        style={{
          width: "25%",
          borderRight: "1px solid #444",
          padding: "1rem",
          backgroundColor: "#1c1c1c",
          color: "#fff",
          overflowY: "auto"
        }}
      >
        <h2>{loggedInName}</h2>
        <button onClick={handleLogout} style={{ marginBottom: "1rem" }}>
          Logout
        </button>

        <h3>Contacts</h3>
        <input
          type="text"
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
        />

        <ul style={{ listStyle: "none", padding: 0 }}>
          {filteredContacts.map((contact) => (
            <li key={contact.email} style={{ marginBottom: "0.75rem" }}>
              <div>{contact.name} ({contact.email})</div>
              <button
                onClick={() => setActiveChat(contact.email)}
                style={{ marginTop: "0.25rem" }}
              >
                Chat
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Right: Chat Area */}
      <div style={{ flex: 1, padding: "1rem", overflowY: "auto" }}>
        {activeChat ? (
          <ChatBox loggedInEmail={loggedInEmail} friendEmail={activeChat} />
        ) : (
          <div style={{ color: "#888", fontStyle: "italic" }}>
            Select a contact to start chatting.
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
