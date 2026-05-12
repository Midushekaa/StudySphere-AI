import { useState } from "react";
import LandingPage  from "./components/LandingPage";
import AuthPage     from "./components/AuthPage";
import ChatApp      from "./components/ChatApp";

export default function App() {
  const [screen,   setScreen]   = useState("landing");
  const [authMode, setAuthMode] = useState("login");
  const [user,     setUser]     = useState(null);

  const goAuth     = (mode) => { setAuthMode(mode); setScreen("auth"); };
  const handleLogin = (u)   => { setUser(u); setScreen("app"); };
  const handleLogout = ()   => { setUser(null); setScreen("landing"); };

  if (screen === "landing") return <LandingPage onGoLogin={() => goAuth("login")} onGoRegister={() => goAuth("register")} />;
  if (screen === "auth")    return <AuthPage initialMode={authMode} onLogin={handleLogin} onBack={() => setScreen("landing")} />;
  return <ChatApp user={user} onLogout={handleLogout} />;
}
