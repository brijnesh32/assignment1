import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">●</span>
          EventGo
        </Link>
        <nav className="topbar-nav">
          {user ? (
            <>
              <span className="topbar-user">{user.name}</span>
              <button className="btn btn-ghost" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-ghost">
              Log in
            </Link>
          )}
        </nav>
      </header>
      <main className="content">{children}</main>
      <footer className="footer">EventGo — sample booking flow built for assignment review</footer>
    </div>
  );
}
