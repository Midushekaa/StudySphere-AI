import { useState } from "react";
import ChatPage    from "./ChatPage";
import AdminPage   from "./AdminPage";
import CoursesPage from "./CoursesPage";
import "./ChatApp.css";

export default function ChatApp({ user, onLogout }) {
  const isAdmin = user?.role === "admin";
  const [page, setPage] = useState(isAdmin ? "admin_dashboard" : "chat");
  const [chatKey, setChatKey] = useState(0);

  const startNewChat = () => {
    setChatKey(k => k + 1);
    setPage("chat");
  };

  return (
    <div className="chatapp-root-clean">
      {/* ══════════ MAIN CONTENT ══════════ */}
      <main className="chatapp-main-full">
        {page === "chat"    && <ChatPage key={chatKey} user={user} onLogout={onLogout} />}
        {page === "courses" && <CoursesPage user={user} onLogout={onLogout} />}
        {page.startsWith("admin_") && (
          <AdminPage 
            user={user} 
            activeTab={page.replace("admin_", "")} 
            onTabChange={(tab) => setPage("admin_" + tab)} 
            onLogout={onLogout}
          />
        )}
      </main>
    </div>
  );
}
