import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, Music, Upload, LayoutDashboard, LogOut, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { useNotificationStore } from '../store/notificationStore';
import NotificationDropdown from './NotificationDropdown';

export const Navbar = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { socket } = useSocket();
  const { unreadCount } = useNotificationStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">MelodAI</span>
            </Link>

            {isAuthenticated && (
              <div className="hidden md:flex items-center gap-6">
                <Link
                  to="/dashboard"
                  className="text-zinc-300 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  to="/upload"
                  className="text-zinc-300 hover:text-white transition-colors"
                >
                  Upload
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <div className="relative" ref={notificationRef}>
                  <button
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className="relative p-2 text-zinc-400 hover:text-white transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-purple-500 rounded-full text-xs text-white flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {isNotificationOpen && (
                    <NotificationDropdown onClose={() => setIsNotificationOpen(false)} />
                  )}
                </div>

                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-zinc-800 transition-colors"
                  >
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user?.username?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-zinc-800 rounded-lg shadow-lg border border-zinc-700 py-1">
                      <div className="px-4 py-2 border-b border-zinc-700">
                        <p className="text-sm font-medium text-white">{user?.displayName}</p>
                        <p className="text-xs text-zinc-400">@{user?.username}</p>
                      </div>
                      <button
                        onClick={() => { navigate('/dashboard'); setIsUserMenuOpen(false); }}
                        className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </button>
                      <button
                        onClick={() => { navigate('/upload'); setIsUserMenuOpen(false); }}
                        className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Upload
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 text-zinc-400 hover:text-white"
                >
                  {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  to="/login"
                  className="text-zinc-300 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>

        {isMobileMenuOpen && isAuthenticated && (
          <div className="md:hidden py-4 border-t border-zinc-800">
            <div className="flex flex-col gap-2">
              <Link
                to="/dashboard"
                className="px-4 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg flex items-center gap-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <Link
                to="/upload"
                className="px-4 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg flex items-center gap-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Upload className="w-4 h-4" />
                Upload
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
