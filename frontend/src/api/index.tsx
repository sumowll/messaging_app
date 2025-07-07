const API = "http://localhost:3000/api";

interface Message {
  from: string;
  to: string;
  text: string;
  timestamp: string; // or Date
}

export async function getMessages(from: string, to: string): Promise<Message> 
{ 
  const res = await fetch(`${API}/messages?from=${encodeURIComponent(from)}&with=${encodeURIComponent(to)}`);
  return res.json();
 }


export async function sendMessage(from: string, to: string, text: string): Promise<Message>
{
  const res = await fetch(`${API}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, text })
  });
  return res.json();
}

export async function getAllUsers(user: string): Promise<any[]> {
  const res = await fetch(`${API}/users/search?name=${encodeURIComponent(user)}`);
  if (!res.ok) throw new Error("Failed to fetch users");
  console.log("getAllUsers response:", res.json);
  return res.json();
}


// Send friend connection request
export async function sendFriendRequest(userEmail: string, friendEmail: string): Promise<any> {
  const res = await fetch(`${API}/users/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userEmail, friendEmail }),
  });
  if (!res.ok) throw new Error("Failed to send connection request");
  return res.json();
}


export async function getContacts(email: string): Promise<any[]> {
  const res = await fetch(`${API}/users/contacts?email=${encodeURIComponent(email)}`);
  if (!res.ok) throw new Error("Failed to fetch contacts");
  return res.json();
}


// unreadCounts === { "alice@example.com": 2, "pixel_raven@example.com": 5 }
export async function getUnreadCounts(userEmail: string): Promise<Record<string, number>> {
  const res = await fetch(`${API}/messages/unread?user=${encodeURIComponent(userEmail)}`);
  if (!res.ok) throw new Error("Failed to fetch unread counts");
  return res.json();  
}

export const markMessagesAsRead = async (from: string, to: string): Promise<void> => {
  try {
    const res = await fetch('/api/messages/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Unknown error');
    }
  } catch (err) {
    console.error("Failed to mark messages as read:", err);
    throw err;
  }
};




