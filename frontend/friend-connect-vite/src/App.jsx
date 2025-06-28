import { useState } from "react";

function App() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState(null);

  const [searchName, setSearchName] = useState("");
  const [results, setResults] = useState([]);
  const [friendMessage, setFriendMessage] = useState("");

  // Registration
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("http://localhost:3000/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage("Registration successful!");
      setRegisteredEmail(form.email);
    } else {
      setMessage(`Error: ${data.error}`);
    }
  };

  // Friend search
  const handleSearch = async () => {
    const res = await fetch(`http://localhost:3000/search?name=${encodeURIComponent(searchName)}`);
    const data = await res.json();
    if (res.ok) setResults(data.filter(user => user.email !== registeredEmail)); // exclude self
    else setFriendMessage(`Search error: ${data.error}`);
  };

  const handleConnect = async (friendEmail) => {
    const res = await fetch("http://localhost:3000/add-friend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail: registeredEmail, friendEmail }),
    });

    const data = await res.json();
    setFriendMessage(res.ok ? data.message : `Error: ${data.error}`);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Create Account</h1>
      <form onSubmit={handleSubmit}>
        <input name="name" placeholder="Name" onChange={handleChange} /><br /><br />
        <input name="email" type="email" placeholder="Email" onChange={handleChange} /><br /><br />
        <input name="password" type="password" placeholder="Password" onChange={handleChange} /><br /><br />
        <button type="submit">Register</button>
      </form>
      <p>{message}</p>

      {registeredEmail && (
        <>
          <hr />
          <h2>Find Friends</h2>
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
              </li>
            ))}
          </ul>
          <p>{friendMessage}</p>
        </>
      )}
    </div>
  );
}

export default App;
