import { useState, useEffect } from "react";

function FriendSearch({ loggedInEmail, onChatStart }) {
  const [searchName, setSearchName] = useState("");
  const [results, setResults] = useState([]);
  const [friendMessage, setFriendMessage] = useState("");

  useEffect(() => {
    if (!searchName.trim()) return;

    const timeout = setTimeout(() => {
      fetch(`http://localhost:3000/api/users/search?name=${encodeURIComponent(searchName)}`)
        .then(res => res.json())
        .then(data => setResults(data.filter(user => user.email !== loggedInEmail)))
        .catch(err => setFriendMessage("Search failed."));
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchName, loggedInEmail]);

  const handleConnect = async (friendEmail) => {
    const res = await fetch("http://localhost:3000/api/users/add-friend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail: loggedInEmail, friendEmail }),
    });
    const data = await res.json();
    setFriendMessage(res.ok ? data.message : `Error: ${data.error}`);
  };

  return (
    <div>
      <h3>Find and Add Friends</h3>
      <input
        type="text"
        placeholder="Search by name"
        value={searchName}
        onChange={(e) => setSearchName(e.target.value)}
      />
      <ul>
        {results.map((user) => (
          <li key={user.email}>
            {user.name} ({user.email}){" "}
            <button onClick={() => handleConnect(user.email)}>Connect</button>
            <button onClick={() => onChatStart(user.email)}>Chat</button>
          </li>
        ))}
      </ul>
      <p>{friendMessage}</p>
    </div>
  );
}
export default FriendSearch;