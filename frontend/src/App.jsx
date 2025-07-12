import { useState, useEffect } from "react";
import AuthForm from "@components/AuthForm";
import FriendSearch from "@components/FriendSearch";
import ChatBox from "@components/ChatBox";
import "./App.css";
import { getContacts, getUnreadCounts, markMessagesAsRead } from "@api";
import socket from "./services/socket";


function App() {
  console.log("APP MOUNTED");
  useEffect(() => {
  socket.connect();

  // socket.on('connect', () => {
  //   console.log('✅ connect fired', socket.id);
  // });

  socket.on('connection', () => {
    console.log('⚠️ connection fired — unexpected unless manually emitted');
  });

  return () => {
    socket.off('connect');
    socket.off('connection');
    socket.disconnect();
  };
}, []);


  const [authMode, setAuthMode] = useState(null);
  const [loggedInEmail, setLoggedInEmail] = useState(null);
  const [loggedInName, setLoggedInName] = useState(null);
  const [activeChat, setActiveChat] = useState({ name: null, email: "" });
  const [friendSearchMode, setFriendSearchMode] = useState("chat"); // or "add"
  const [contacts, setContacts] = useState([]);

// ==================== Function to handle user login and logout
  const handleLogin = (email, name) => {
    setLoggedInEmail(email);
    setLoggedInName(name || email);
    setAuthMode(null); // Reset auth mode after login
    setActiveChat({ name, email }); // Set active chat to logged-in user
    console.log("User logged in:", email, name);
  };

  const handleLogout = () => {
    setLoggedInEmail(null);
    setLoggedInName(null);
    setActiveChat(null);
    setAuthMode(null);
    setContacts([]); // Clear contacts on logout
    setUnreadCounts({}); // Clear unread counts on logout
    setContactsVersion(0); // Reset contacts version to trigger re-fetching on next login
    console.log("User logged out");
  };

  // ============= Use a version counter to trigger re-fetching contacts
  const [contactsVersion, setContactsVersion] = useState(0);

  useEffect(() => {
    if (loggedInEmail) {
      getContacts(loggedInEmail)
        .then(setContacts)
        .catch((err) => console.error("Failed to load contacts", err));
    }
  }, [loggedInEmail, contactsVersion]); // ✅ explicit trigger

  const refreshContacts = () => setContactsVersion(v => v + 1);
  
  // ==================== Function to fetch unread counts for each contact
  const fetchUnreadCounts = async () => {
    if (!loggedInEmail) return; // Don't fetch if not logged in
    try {
      const res = await getUnreadCounts(loggedInEmail); // assume returns { email1: count, ... }
      console.log("Fetched unread counts:", res);
      setUnreadCounts(res);
    } catch (err) {
      console.error("Failed to fetch unread counts:", err);
    }
  };
  
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    if (!loggedInEmail) return;

    socket.emit("join_notifications", { userId: loggedInEmail });

    fetchUnreadCounts();

    const handleNewUnread = ({ from }) => {
      if (!from) return;
      setUnreadCounts((prev) => ({
        ...prev,
        [from]: (prev[from] || 0) + 1,
      }));
    };


    const handleUnreadCounts = (counts) => {
      setUnreadCounts(counts); // full refresh
    };

    socket.on("new_unread", handleNewUnread);
    socket.on("unreadCounts", handleUnreadCounts);

    return () => {
      socket.off("new_unread", handleNewUnread);
      socket.off("unreadCounts", handleUnreadCounts);
    };
  }, [loggedInEmail]);


  // ==================== Function to handle starting a chat
  const onChatStart = (loggedInEmail, friend) => {
    console.log("Friend object passed to onChatStart:", friend);

    setActiveChat(friend); // Use friend if available, otherwise use current user

    setUnreadCounts(prev => ({
      ...prev,
      [friend.email]: 0, // ✅ safely override only this contact's count
    }));
    console.log("loggedInEmail:", loggedInEmail);

    markMessagesAsRead(friend.email, loggedInEmail)
  };

// ============================ Logic to handle initial login state
  if (!loggedInEmail) {
    return (
      console.log("Rendering auth form"),
      <div className="auth-container">
        {!authMode ? (
          <>
            <h1>Welcome</h1>
            <button onClick={() => setAuthMode("register")}>Register</button>
            <button onClick={() => setAuthMode("login")}>Login</button>
          </>
        ) : (
          <AuthForm mode={authMode} setMode={setAuthMode} onLogin={handleLogin} />
        )}

      </div>
    );
  }

    return (
      <div className="app-container">
        <div className="sidebar">
          <div className="sidebar-top">
            <h2>Welcome {loggedInName} !</h2>
            <button onClick={handleLogout} className="logout-button">Logout</button>
          </div>

          <div>
            <div className="button-row">
              <button onClick={() => setFriendSearchMode("chat")}>My Contacts</button>
              <br />
              <button onClick={() => setFriendSearchMode("add")}>Add Friends</button>
              
            </div>
            <FriendSearch
              loggedInEmail={loggedInEmail}
              contacts={contacts}
              onChatStart={onChatStart}
              onContactAdded={refreshContacts}
              mode={friendSearchMode}
              unreadCounts={unreadCounts}
            />

          </div>

        </div>

        <div className="chat-area">
          
          {activeChat?.email ? (
            <ChatBox
              loggedInEmail={loggedInEmail}
              friendEmail={activeChat?.email || ""}
              friendName={activeChat?.name || activeChat?.email || "Friend"}
              setUnreadCounts={setUnreadCounts}
            />

          ) : (
            <div className="placeholder-text">Select a contact to start chatting.</div>
          )}
        </div>
      </div>
    );
}

export default App;
