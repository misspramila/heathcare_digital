
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signOutUser } from '../services/firebase';

const Header: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOutUser();
      navigate('/');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const HeartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
    </svg>
  );

  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <HeartIcon />
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">SmartHealth Card</h1>
        </Link>
        <div className="flex items-center gap-4">
            {userProfile && <span className="hidden sm:block text-slate-600">Welcome, {userProfile.name}</span>}
            {currentUser && (
                <button
                onClick={handleLogout}
                className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition duration-200"
                >
                Logout
                </button>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;
