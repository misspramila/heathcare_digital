
import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
);

const DoctorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);


const HomePage: React.FC = () => {
    const { currentUser, userType } = useAuth();

    if (currentUser && userType) {
        return <Navigate to={`/${userType}/dashboard`} />;
    }

    return (
        <div className="container mx-auto text-center py-16">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Welcome to SmartHealth</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12">Your digital health record, accessible anytime, anywhere. Choose your role to get started.</p>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <Link to="/login/doctor" className="group block p-8 bg-white rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                    <DoctorIcon />
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Doctor Portal</h3>
                    <p className="text-slate-500 mb-4">Access patient records, update medical history, and manage appointments.</p>
                    <span className="font-semibold text-indigo-600 group-hover:underline">Login as Doctor &rarr;</span>
                </Link>

                <Link to="/login/patient" className="group block p-8 bg-white rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                    <UserIcon />
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Patient Portal</h3>
                    <p className="text-slate-500 mb-4">View your medical history, prescriptions, and share your health QR code.</p>
                    <span className="font-semibold text-indigo-600 group-hover:underline">Login as Patient &rarr;</span>
                </Link>
            </div>
        </div>
    );
};

export default HomePage;
