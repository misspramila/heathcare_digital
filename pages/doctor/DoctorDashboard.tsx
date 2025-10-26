import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Patient, MedicalRecord, Doctor, Appointment, AppointmentStatus } from '../../types';
import { getPatientWithHistory, addPatientMedicalRecord, getAppointmentsForUser } from '../../services/firebase';
import { Timestamp } from 'firebase/firestore';
import Modal from '../../components/Modal';
import QrCodeScanner from '../../components/QrCodeScanner';
import Spinner from '../../components/Spinner';
import MedicalRecordCard from '../../components/MedicalRecordCard';
import ReminderBanner from '../../components/ReminderBanner';

const StatusBadge: React.FC<{ status: AppointmentStatus }> = ({ status }) => {
    const colors = {
        scheduled: 'bg-blue-100 text-blue-800',
        completed: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${colors[status]}`}>
            {status}
        </span>
    );
};


const DoctorDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [isScannerOpen, setScannerOpen] = useState(false);
  const [scannedPatient, setScannedPatient] = useState<Patient | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<MedicalRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Reminder state
  const [reminders, setReminders] = useState<Appointment[]>([]);
  const [dismissedReminders, setDismissedReminders] = useState<string[]>([]);

  // New record form state
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Appointment list state
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const doctor = userProfile as Doctor;
  
  useEffect(() => {
    if (doctor) {
        const fetchAppointments = async () => {
            setLoading(true);
            try {
                const appointmentData = await getAppointmentsForUser(doctor.uid, 'doctor');
                setAppointments(appointmentData);
            } catch (err) {
                console.error("Failed to fetch appointments", err);
                setError("Could not load appointments.");
            }
            setLoading(false);
        };
        fetchAppointments();
    }
  }, [doctor]);

  // Effect to check for reminders
  useEffect(() => {
    if (appointments.length > 0) {
      const now = new Date();
      const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const upcomingReminders = appointments.filter(app => {
        const appTime = new Date(app.dateTime.seconds * 1000);
        return (
          app.status === 'scheduled' &&
          appTime > now &&
          appTime <= twentyFourHoursLater
        );
      });
      setReminders(upcomingReminders);
    }
  }, [appointments]);


  const handleScanSuccess = useCallback(async (decodedText: string) => {
    setScannerOpen(false);
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setScannedPatient(null);
    setMedicalHistory([]);

    try {
      const data = await getPatientWithHistory(decodedText, doctor.uid);
      if (data) {
        setScannedPatient(data.patient);
        setMedicalHistory(data.medicalHistory);
      } else {
        setError("No patient found for the scanned QR code.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch patient data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [doctor]);
  
  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!scannedPatient || !visitDate || !diagnosis.trim() || !prescription.trim()) {
        setError("Visit Date, Diagnosis, and Prescription are required.");
        return;
    }
    setSubmitting(true);

    // Convert "YYYY-MM-DD" string to a local Date object to avoid timezone issues, then to a Timestamp.
    const visitDateTime = new Date(visitDate + 'T00:00:00');

    const newRecord: Omit<MedicalRecord, 'id'> & { notes?: string } = {
        date: Timestamp.fromDate(visitDateTime),
        type: 'consultation',
        doctorId: doctor.uid,
        doctorName: doctor.name,
        diagnosis: diagnosis.trim(),
        prescription: prescription.trim(),
    };

    if (notes.trim()) {
        newRecord.notes = notes.trim();
    }

    try {
        const addedRecord = await addPatientMedicalRecord(scannedPatient.uid, newRecord);
        // Add the new record and re-sort the history by date to maintain order
        setMedicalHistory(prev => [...prev, addedRecord as MedicalRecord].sort((a, b) => b.date.seconds - a.date.seconds));
        
        // Reset form fields
        setVisitDate(new Date().toISOString().split('T')[0]);
        setDiagnosis('');
        setPrescription('');
        setNotes('');
        setSuccessMessage("Record added successfully!");
        setTimeout(() => setSuccessMessage(null), 3000); // Clear message after 3 seconds
    } catch (err) {
        setError("Failed to add medical record. Please check permissions and try again.");
    } finally {
        setSubmitting(false);
    }
  }
  
  const formatDateTime = (timestamp: any) => new Date(timestamp.seconds * 1000).toLocaleString();
  const formatTime = (timestamp: any) => new Date(timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const upcomingAppointments = appointments.filter(a => a.dateTime.seconds * 1000 > Date.now() && a.status === 'scheduled');

  const filteredAndSortedAppointments = appointments
    .filter(app => filterStatus === 'all' || app.status === filterStatus)
    .sort((a, b) => {
        if (sortOrder === 'desc') {
            return b.dateTime.seconds - a.dateTime.seconds;
        }
        return a.dateTime.seconds - b.dateTime.seconds;
    });

  const FilterButton: React.FC<{ value: AppointmentStatus | 'all', label: string }> = ({ value, label }) => (
    <button
      onClick={() => setFilterStatus(value)}
      className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${
        filterStatus === value
          ? 'bg-indigo-600 text-white'
          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="container mx-auto">
      <h2 className="text-3xl font-bold mb-6">Doctor Dashboard</h2>

      {reminders
        .filter(r => !dismissedReminders.includes(r.id))
        .map(reminder => (
          <ReminderBanner
            key={reminder.id}
            message={`Reminder: You have an appointment with ${reminder.patientName} tomorrow at ${formatTime(reminder.dateTime)}.`}
            onDismiss={() => setDismissedReminders(prev => [...prev, reminder.id])}
          />
        ))}

      {loading && <div className="flex justify-center"><Spinner/></div>}

      {!loading && (
          <>
            <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-2">Upcoming Appointments</h3>
                    {upcomingAppointments.length > 0 ? (
                        <div className="space-y-3">
                            {upcomingAppointments.slice(0, 3).map(app => (
                                <div key={app.id} className="p-3 border rounded-lg flex justify-between items-center bg-slate-50">
                                    <div>
                                        <p className="font-semibold">{app.patientName}</p>
                                        <p className="text-sm text-slate-600">{formatDateTime(app.dateTime)}</p>
                                    </div>
                                    <StatusBadge status={app.status} />
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-slate-600 my-2">No upcoming appointments.</p>}
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold">Access Patient Record</h3>
                    <p className="text-slate-600 my-2">Scan a patient's QR code to view their medical history and add new records.</p>
                    <button 
                    onClick={() => setScannerOpen(true)}
                    className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition duration-200"
                    >
                    Scan QR Code
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <h3 className="text-xl font-semibold">All Appointments</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold mr-2">Filter:</span>
                        <FilterButton value="all" label="All" />
                        <FilterButton value="scheduled" label="Scheduled" />
                        <FilterButton value="completed" label="Completed" />
                        <FilterButton value="cancelled" label="Cancelled" />
                        <button onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')} className="flex items-center gap-1 text-sm font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-full px-3 py-1 ml-4">
                            <span>Sort</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {filteredAndSortedAppointments.length > 0 ? (
                        filteredAndSortedAppointments.map(app => (
                            <div key={app.id} className="border p-4 rounded-lg bg-slate-50 flex flex-wrap justify-between items-start gap-4">
                                <div>
                                    <p className="font-semibold">{app.patientName}</p>
                                    <p className="text-sm text-slate-600">{formatDateTime(app.dateTime)}</p>
                                    <p className="text-sm mt-1"><strong>Reason:</strong> {app.reason}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <StatusBadge status={app.status} />
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-slate-500">No appointments match the current filter.</p>
                    )}
                </div>
            </div>
          </>
      )}

      {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg my-4">{error}</p>}
      {successMessage && <p className="text-green-600 bg-green-100 p-3 rounded-lg my-4">{successMessage}</p>}
      
      {scannedPatient && (
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-6">
             <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Patient Details</h3>
                <p><strong>Name:</strong> {scannedPatient.name}</p>
                <p><strong>Email:</strong> {scannedPatient.email}</p>
                <p><strong>Patient ID:</strong> <span className="text-sm font-mono bg-slate-100 p-1 rounded">{scannedPatient.uid}</span></p>
             </div>
             <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Add New Consultation Record</h3>
                <form onSubmit={handleAddRecord} className="space-y-4">
                    <div>
                        <label htmlFor="visitDate" className="block text-sm font-medium text-gray-700">Visit Date</label>
                        <input type="date" id="visitDate" value={visitDate} onChange={e => setVisitDate(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                    </div>
                    <div>
                        <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700">Diagnosis</label>
                        <input type="text" id="diagnosis" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                    </div>
                     <div>
                        <label htmlFor="prescription" className="block text-sm font-medium text-gray-700">Prescription</label>
                        <textarea id="prescription" value={prescription} onChange={e => setPrescription(e.target.value)} required rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                    </div>
                     <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                        <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                    </div>
                    <button type="submit" disabled={submitting} className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200 disabled:bg-blue-300">
                        {submitting ? 'Saving...' : 'Add Record'}
                    </button>
                </form>
             </div>
          </div>
          <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-md">
             <h3 className="text-xl font-semibold mb-4">Patient Medical History</h3>
             {medicalHistory.length > 0 ? (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {medicalHistory.map((record) => (
                    <MedicalRecordCard key={record.id} record={record} />
                ))}
                </div>
            ) : (
                <p className="text-slate-500">No medical records found for this patient.</p>
            )}
          </div>
        </div>
      )}

      <Modal isOpen={isScannerOpen} onClose={() => setScannerOpen(false)} title="Scan Patient QR Code">
        {isScannerOpen && <QrCodeScanner onScanSuccess={handleScanSuccess} onScanFailure={(err) => console.log(err)} />}
      </Modal>
    </div>
  );
};

export default DoctorDashboard;