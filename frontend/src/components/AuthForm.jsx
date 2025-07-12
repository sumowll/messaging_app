import { useState } from "react";

function AuthForm({ mode, setMode, onLogin }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    console.log("Submitting form:", form);
    e.preventDefault();

    if (mode === "login" && (!form.email || !form.password)) {
      return setMessage("Please enter both email and password");
    }

    const endpoint = mode === "register" ? "register" : "login";
    const res = await fetch(`http://localhost:3000/api/auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (res.ok) {
      onLogin(form.email, data.name);
      setMessage(`${mode === "register" ? "Registration" : "Login"} successful`);
    } else {
      setMessage(`Error: ${data.error}`);
    }
  };

  return (
    <div>
      <h2>{mode === "register" ? "Register" : "Login"}</h2>
      <form onSubmit={handleSubmit}>
        {mode === "register" && (
          <>
            <input name="name" placeholder="Name" onChange={handleChange} /><br /><br />
          </>
        )}
        <input name="email" type="email" placeholder="Email" onChange={handleChange} /><br /><br />
        <input name="password" type="password" placeholder="Password" onChange={handleChange} /><br /><br />
        <button type="submit">{mode === "register" ? "Register" : "Login"}</button>
      </form>
      <p>{message}</p>
      <button onClick={() => setMode(null)}>Back</button>
    </div>
  );
}

export default AuthForm;
