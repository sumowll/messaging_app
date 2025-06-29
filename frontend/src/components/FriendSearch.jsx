import { useState } from "react";

function FriendSearch({ loggedInEmail, onChatStart }) {
  const [searchName, setSearchName] = useState("");
  const [results, setResults] = useState([]);
  const [friendMessage, setFriendMessage] = useState("");

  const handleSearch = async () => {
    const res = await fetch(`http://localhost:3000/api/users/search?name=${encodeURIComponent(searchName)}`);
    const data = await res.json();
    if (res.ok) {
      setResults(data.filter(user => user.email !== loggedInEmail));
    } else {
      setFriendMessage(`Search error: ${data.error}`);
    }
  };

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
      <button onClick={handleSearch}>Search</button>
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
