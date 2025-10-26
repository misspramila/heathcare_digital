
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth, getUserProfile } from '../services/firebase';
import { UserType, Doctor, Patient } from '../types';
import Spinner from '../components/Spinner';

interface AuthContextType {
  currentUser: User | null;
  userProfile: Doctor | Patient | null;
  userType: UserType | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  userType: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<Doctor | Patient | null>(null);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setUserProfile(profile.data);
          setUserType(profile.type);
        } else {
          // Handle case where user exists in Auth but not Firestore
          setUserProfile(null);
          setUserType(null);
        }
      } else {
        setUserProfile(null);
        setUserType(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner />
      </div>
    );
  }

  const value = {
    currentUser,
    userProfile,
    userType,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
