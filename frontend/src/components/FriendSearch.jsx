import { useEffect, useState, useMemo } from "react";
import { getAllUsers, sendFriendRequest, getContacts, getUnreadCounts } from "@api";
import "../styles/FriendSearch.css"; // Assuming you have some styles for this component


export default function FriendSearch({
  loggedInEmail,
  contacts = [],
  onChatStart = () => {},
  mode = "chat",
  onContactAdded = () => {}, // ✅ safely default to no-op
  unreadCounts = {}, // ✅ default to empty object
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    if (mode === "add" && searchTerm) {
      getAllUsers(searchTerm)
        .then(setAllUsers)
        .catch((err) => {
          console.error("Failed to fetch users:", err);
        });
    }
  }, [mode, searchTerm]);

  const isAddMode = mode === "add";


  const filteredList = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();

    if (mode === "add") {
      return allUsers.filter(
        (user) =>
          user.email !== loggedInEmail &&
          !contacts.some((c) => c.email === user.email) &&
          (`${user.name || ""}${user.email || ""}`).toLowerCase().includes(normalizedSearch)
      );
    } else {
      return contacts.filter((contact) =>
        (`${contact.name || ""}${contact.email || ""}`).toLowerCase().includes(normalizedSearch)
      );
    }
  }, [mode, allUsers, contacts, searchTerm, loggedInEmail]);

  // Reset search term when switching modes
  // This ensures that when switching from "add" to "chat", the search input is cleared
  useEffect(() => {
    setSearchTerm("");
  }, [mode]);

  return (
    <div className="friend-search-section">
      <h3>{isAddMode ? "Find and Add Friends" : "My Contacts"}</h3>
      <input
        type="text"
        className="search-input"
        placeholder={isAddMode ? "Search all users" : "Search contacts"}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
     
      <ul className="contact-list">
        {/* Display/Loop through filtered list of friends or contacts or connected friends based on mode */}
        {filteredList.map((friend) => (
          <li key={friend.email} className="contact-item">
            {isAddMode ? (
              <>
                <div>{friend.name} ({friend.email})</div>
                <button
                  onClick={() => {
                    sendFriendRequest(loggedInEmail, friend.email)
                      .then(() => {
                        console.log("Request sent");
                        onContactAdded(); // ✅ THIS will call the refresh function from App.jsx
                        setAllUsers((prev) => prev.filter((u) => u.email !== friend.email)); //remove the newly added friend immediately from the current list
                      })
                      .catch((err) => console.log("Failed to send request", err));
                  }} className="chat-button">connect
                </button>
              </>
              ) : (
                    <div key={friend.email}>
                      <a href="#" onClick={() => onChatStart(friend)} className="contact-link">
                        {friend.name}
                      </a>

                      {unreadCounts[friend.email] > 0 && (
                        <span className="unread-badge">
                          {unreadCounts[friend.email]}{" "}{unreadCounts[friend.email] === 1 ? "msg" : "msgs"}
                        </span>
                      )}

                    </div>
                  )
              }
            </li>

        ))}
        {searchTerm && filteredList.length === 0 && (
        <p>No {isAddMode ? "users" : "contacts"} found.</p>
        )}

      </ul>
    </div>
  ); 
}


