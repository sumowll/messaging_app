import { useState } from "react";

function App() {
  const [mode, setMode] = useState(null); // null, "login", or "register"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loggedInEmail, setLoggedInEmail] = useState(null);

  const [searchName, setSearchName] = useState("");
  const [results, setResults] = useState([]);
  const [friendMessage, setFriendMessage] = useState("");

  // Handle form input change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle Register
  const handleRegister = async (e) => {
    e.preventDefault();
    const res = await fetch("http://localhost:3000/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("Registration successful!");
      setLoggedInEmail(form.email);
    } else {
      setMessage(`Error: ${data.error}`);
    }
  };

  // Handle Login
  const handleLogin = async (e) => {
  e.preventDefault();

  if (!form.email || !form.password) {
    setMessage("Please enter both email and password");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, password: form.password }),
    });

    const data = await res.json();
    if (res.ok) {
      setLoggedInEmail(form.email);
      setMessage(`Login successful! Welcome, ${data.name}`);
    } else {
      setMessage(`Login failed: ${data.error}`);
    }
  } catch (err) {
    console.error("Login error:", err);
    setMessage("Login error. Please try again.");
  }
};

  // Friend search
  const handleSearch = async () => {
    const res = await fetch(`http://localhost:3000/search?name=${encodeURIComponent(searchName)}`);
    const data = await res.json();
    if (res.ok) setResults(data.filter(user => user.email !== loggedInEmail));
    else setFriendMessage(`Search error: ${data.error}`);
  };

  const handleConnect = async (friendEmail) => {
    const res = await fetch("http://localhost:3000/add-friend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail: loggedInEmail, friendEmail }),
    });
    const data = await res.json();
    setFriendMessage(res.ok ? data.message : `Error: ${data.error}`);
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

      {!loggedInEmail && mode === "register" && (
        <>
          <h2>Register</h2>
          <form onSubmit={handleRegister}>
            <input name="name" placeholder="Name" onChange={handleChange} /><br /><br />
            <input name="email" type="email" placeholder="Email" onChange={handleChange} /><br /><br />
            <input name="password" type="password" placeholder="Password" onChange={handleChange} /><br /><br />
            <button type="submit">Register</button>
          </form>
          <p>{message}</p>
          <button onClick={() => setMode(null)}>Back</button>
        </>
      )}

      {!loggedInEmail && mode === "login" && (
        <>
          <h2>Login</h2>
          <form onSubmit={handleLogin}>
            <input name="email" type="email" placeholder="Email" onChange={handleChange} /><br /><br />
            <input name="password" type="password" placeholder="Password" onChange={handleChange} /><br /><br />
            <button type="submit">Login</button>
          </form>
          <p>{message}</p>
          <button onClick={() => setMode(null)}>Back</button>
        </>
      )}

      {loggedInEmail && (
        <>
          <h2>Welcome, {loggedInEmail}</h2>
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
