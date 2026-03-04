import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function App() {
  const [msg, setMsg] = useState("Loading...");

  useEffect(() => {
    fetch(`${API}/api/health`)
      .then((r) => r.json())
      .then((d) => setMsg(d.message))
      .catch(() => setMsg("API not reachable"));
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "Arial" }}>
      <h1>WISDOM</h1>
      <p>{msg}</p>
    </div>
  );
}