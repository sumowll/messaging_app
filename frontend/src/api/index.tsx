
const API = "http://localhost:3000/api";


export async function getMessages(from: string, to: string): Promise<any> {
  const res = await fetch(`${API}/messages?with=${encodeURIComponent(to)}`);
  return res.json();
}


export async function sendMessage(from: string, to: string, text: string): Promise<any>
{
  const res = await fetch(`${API}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, text })
  });
  return res.json();
}
