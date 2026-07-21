import { useAuth } from "../context/AuthContext";
import { User, Clock } from "lucide-react";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { user } = useAuth();
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!user) return null;

  return (
    <header className="navbar">
      {/* Left: greeting (with space for hamburger on mobile) */}
      <div className="navbar-left">
        <h2 className="navbar-greeting">
          Welcome back, <span className="highlight">{user.username}</span>
        </h2>
      </div>

      <div className="navbar-right">
        <div className="navbar-clock">
          <Clock size={16} />
          <span className="clock-text">{time}</span>
        </div>

        <div className="navbar-divider" />

        <div className="navbar-profile">
          <User size={16} />
          <span>{user.role}</span>
        </div>
      </div>
    </header>
  );
}
