import React, { useState } from 'react';
import Modal from './Modal';
import Spinner from './Spinner';
import { sendPasswordReset } from '../services/firebase';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PasswordResetModal: React.FC<PasswordResetModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await sendPasswordReset(email);
      setSuccessMessage('Password reset email sent! Please check your inbox.');
      setEmail('');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('No user found with this email address.');
      } else {
        setError('Failed to send password reset email. Please try again.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state on close
    setEmail('');
    setError('');
    setSuccessMessage('');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reset Your Password">
      <form onSubmit={handleSubmit} className="space-y-4">
        {successMessage ? (
          <p className="text-green-600 bg-green-100 p-3 rounded-md">{successMessage}</p>
        ) : (
          <>
            <p className="text-sm text-slate-600">Enter your email address and we will send you a link to reset your password.</p>
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700">Email address</label>
              <input 
                id="reset-email" 
                name="email" 
                type="email" 
                autoComplete="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end pt-2">
              <button 
                type="button" 
                onClick={handleClose} 
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 mr-2"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="w-40 flex justify-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300"
              >
                {loading ? <Spinner /> : 'Send Reset Link'}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};

export default PasswordResetModal;
