import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserType } from '../types';
import { signIn, signUp, verifyAadhaar } from '../services/firebase';
import Spinner from '../components/Spinner';
import PasswordResetModal from '../components/PasswordResetModal';

interface AuthPageProps {
  mode: 'login' | 'register';
  userType: UserType;
}

const AuthPage: React.FC<AuthPageProps> = ({ mode, userType }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Modal State
  const [isResetModalOpen, setResetModalOpen] = useState(false);

  // Aadhaar state
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAadhaarVerified, setIsAadhaarVerified] = useState(false);
  const [aadhaarError, setAadhaarError] = useState('');
  const [aadhaarSuccess, setAadhaarSuccess] = useState('');

  const isRegister = mode === 'register';
  const isPatient = userType === 'patient';
  
  const title = `${isRegister ? 'Register' : 'Login'} as a ${userType.charAt(0).toUpperCase() + userType.slice(1)}`;
  const linkText = isRegister ? 'Already have an account? Login' : "Don't have an account? Register";
  const linkTo = `/${isRegister ? 'login' : 'register'}/${userType}`;

  const handleVerifyAadhaar = async () => {
    if (!aadhaar) {
        setAadhaarError('Please enter your Aadhaar number.');
        return;
    }
    setIsVerifying(true);
    setAadhaarError('');
    setAadhaarSuccess('');
    
    const result = await verifyAadhaar(aadhaar);
    if (result.success) {
        setIsAadhaarVerified(true);
        setAadhaarSuccess(result.message);
    } else {
        setIsAadhaarVerified(false);
        setAadhaarError(result.message);
    }
    setIsVerifying(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        if (isPatient && !isAadhaarVerified) {
           setError('Please verify your Aadhaar number before registering.');
           setLoading(false);
           return;
        }
        await signUp(email, password, name, userType, isPatient ? aadhaar : undefined);
      } else {
        await signIn(email, password);
      }
      navigate(`/${userType}/dashboard`);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex justify-center items-center py-12">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold text-center text-slate-900">{title}</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {isRegister && (
              <div>
                <label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</label>
                <input id="name" name="name" type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
              </div>
            )}
            {isRegister && isPatient && (
              <div>
                <label htmlFor="aadhaar" className="text-sm font-medium text-gray-700">Aadhaar Number</label>
                <div className="flex items-center space-x-2 mt-1">
                  <input id="aadhaar" name="aadhaar" type="text" required value={aadhaar} onChange={(e) => setAadhaar(e.target.value)} disabled={isAadhaarVerified || isVerifying}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100"/>
                  <button type="button" onClick={handleVerifyAadhaar} disabled={isVerifying || isAadhaarVerified}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300 whitespace-nowrap">
                      {isVerifying ? <Spinner /> : (isAadhaarVerified ? '✓ Verified' : 'Verify')}
                  </button>
                </div>
                {aadhaarError && <p className="text-sm text-red-600 mt-1">{aadhaarError}</p>}
                {aadhaarSuccess && <p className="text-sm text-green-600 mt-1">{aadhaarSuccess}</p>}
              </div>
            )}
            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-700">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
            </div>
            <div>
              <div className="flex justify-between items-center">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
                  {mode === 'login' && (
                      <button
                          type="button"
                          onClick={() => setResetModalOpen(true)}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
                      >
                          Forgot password?
                      </button>
                  )}
              </div>
              <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div>
              <button type="submit" disabled={loading || (isRegister && isPatient && !isAadhaarVerified)}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300">
                {loading ? <Spinner /> : (isRegister ? 'Create Account' : 'Sign In')}
              </button>
            </div>
          </form>
          <div className="text-sm text-center">
            <Link to={linkTo} className="font-medium text-indigo-600 hover:text-indigo-500">
              {linkText}
            </Link>
          </div>
        </div>
      </div>
      <PasswordResetModal 
        isOpen={isResetModalOpen}
        onClose={() => setResetModalOpen(false)}
      />
    </>
  );
};

export default AuthPage;