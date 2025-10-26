
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import PatientDashboard from './pages/patient/PatientDashboard';
import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <div className="min-h-screen font-sans bg-slate-50">
          <Header />
          <main className="p-4 sm:p-6 md:p-8">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login/doctor" element={<AuthPage mode="login" userType="doctor" />} />
              <Route path="/login/patient" element={<AuthPage mode="login" userType="patient" />} />
              <Route path="/register/doctor" element={<AuthPage mode="register" userType="doctor" />} />
              <Route path="/register/patient" element={<AuthPage mode="register" userType="patient" />} />

              {/* Protected Routes */}
              <Route 
                path="/doctor/dashboard"
                element={
                  <ProtectedRoute allowedUserType="doctor">
                    <DoctorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/patient/dashboard"
                element={
                  <ProtectedRoute allowedUserType="patient">
                    <PatientDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
