import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getPatientWithHistory, getAppointmentsForUser, getAllDoctors, createAppointment, updatePatientSharingPermissions, addPatientMedicalRecord, updateAppointmentStatus } from '../../services/firebase';
import { Patient, MedicalRecord, Appointment, Doctor, RecordType, AppointmentStatus } from '../../types';
import QrCodeDisplay from '../../components/QrCodeDisplay';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';
import { Timestamp } from 'firebase/firestore';
import MedicalRecordCard from '../../components/MedicalRecordCard';
import ReminderBanner from '../../components/ReminderBanner';
import { parseDateTime } from '../../utils/dateParser';

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

const PatientDashboard: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [patientData, setPatientData] = useState<Patient | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<MedicalRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');

  // Reminder state
  const [reminders, setReminders] = useState<Appointment[]>([]);
  const [dismissedReminders, setDismissedReminders] = useState<string[]>([]);

  // Appointment Modal State
  const [isBookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingDoctorId, setBookingDoctorId] = useState('');
  const [bookingDateStr, setBookingDateStr] = useState('');
  const [bookingTimeStr, setBookingTimeStr] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingError, setBookingError] = useState('');
  
  // Add Record Modal State
  const [isAddRecordModalOpen, setAddRecordModalOpen] = useState(false);
  const [newRecordType, setNewRecordType] = useState<RecordType>('allergy_note');
  const [allergen, setAllergen] = useState('');
  const [reaction, setReaction] = useState('');
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe'>('mild');
  const [testName, setTestName] = useState('');
  const [resultSummary, setResultSummary] = useState('');
  const [recordNotes, setRecordNotes] = useState('');

  // Cancel Appointment Modal State
  const [isCancelModalOpen, setCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (currentUser && userProfile) {
        try {
          setLoading(true);
          const data = await getPatientWithHistory(currentUser.uid, currentUser.uid); // Patient can always view their own data
          if(data) {
            setPatientData(data.patient);
            setMedicalHistory(data.medicalHistory);
          } else {
            setError("Could not find patient profile.");
          }
          const [appointmentData, doctorsData] = await Promise.all([
            getAppointmentsForUser(currentUser.uid, 'patient'),
            getAllDoctors()
          ]);
          setAppointments(appointmentData);
          setAllDoctors(doctorsData);
        } catch (err: any) {
          setError(err.message.includes("Access Denied") ? "An error occurred fetching data." : err.message);
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchData();
  }, [currentUser, userProfile]);

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


  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setBookingError('');

    if (!bookingDoctorId || !bookingDateStr || !bookingReason) {
        setBookingError("Please select a doctor, enter a date, and provide a reason.");
        setIsSubmitting(false);
        return;
    }

    const jsDate = parseDateTime(bookingDateStr, bookingTimeStr, { defaultTime: "09:00" });

    if (!jsDate) {
        setBookingError("Invalid date/time. Use dd-mm-yyyy or yyyy-mm-dd format and HH:MM for time.");
        setIsSubmitting(false);
        return;
    }

    if (jsDate.getTime() < Date.now() - 60000) { // allow 1 minute clock skew
        setBookingError("Please choose a future date and time for the appointment.");
        setIsSubmitting(false);
        return;
    }

    const selectedDoctor = allDoctors.find(d => d.uid === bookingDoctorId);
    if (!selectedDoctor || !patientData || !patientData.email) {
        setBookingError("Could not find selected doctor or patient information.");
        setIsSubmitting(false);
        return;
    }

    const newAppointment: Omit<Appointment, 'id'> = {
        patientId: patientData.uid,
        patientName: patientData.name,
        patientEmail: patientData.email,
        doctorId: selectedDoctor.uid,
        doctorName: selectedDoctor.name,
        dateTime: Timestamp.fromDate(jsDate),
        reason: bookingReason,
        status: 'scheduled',
        createdAt: Timestamp.now(),
    };

    try {
        const created = await createAppointment(newAppointment);
        setAppointments(prev => [created as Appointment, ...prev].sort((a,b) => b.dateTime.seconds - a.dateTime.seconds));
        setBookingModalOpen(false);
        setBookingDoctorId('');
        setBookingDateStr('');
        setBookingTimeStr('');
        setBookingReason('');
    } catch (error) {
        console.error("Failed to book appointment", error);
        setBookingError("Failed to book appointment. Please try again.");
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const handleConfirmCancelAppointment = async () => {
    if (!appointmentToCancel) return;

    try {
        await updateAppointmentStatus(appointmentToCancel, 'cancelled');
        setAppointments(prev => prev.map(app => 
            app.id === appointmentToCancel ? { ...app, status: 'cancelled' } : app
        ));
    } catch (error) {
        console.error("Failed to cancel appointment", error);
        alert("Could not cancel the appointment. Please try again.");
    } finally {
        setCancelModalOpen(false);
        setAppointmentToCancel(null);
    }
  };

  const openCancelConfirmationModal = (appointmentId: string) => {
    setAppointmentToCancel(appointmentId);
    setCancelModalOpen(true);
  }

  const handleAddNewRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setIsSubmitting(true);
    let recordData: Partial<MedicalRecord> = {};

    if (newRecordType === 'allergy_note') {
        if (!allergen.trim() || !reaction.trim()) {
            alert("Please fill all allergy fields.");
            setIsSubmitting(false);
            return;
        }
        recordData = { allergen, reaction, severity };
    } else if (newRecordType === 'lab_result') {
        if (!testName.trim() || !resultSummary.trim()) {
            alert("Please fill all lab result fields.");
            setIsSubmitting(false);
            return;
        }
        recordData = { testName, resultSummary };
    }

    const newRecord: Omit<MedicalRecord, 'id'> & { notes?: string } = {
        date: Timestamp.now(),
        type: newRecordType,
        ...recordData,
    };

    if (recordNotes.trim()) {
        newRecord.notes = recordNotes.trim();
    }

    try {
        const addedRecord = await addPatientMedicalRecord(currentUser.uid, newRecord);
        // Add new record and re-sort by date
        setMedicalHistory(prev => [...prev, addedRecord as MedicalRecord].sort((a, b) => b.date.seconds - a.date.seconds));
        
        // Close and reset form
        setAddRecordModalOpen(false);
        setAllergen('');
        setReaction('');
        setSeverity('mild');
        setTestName('');
        setResultSummary('');
        setRecordNotes('');

    } catch (error) {
        console.error("Failed to add record", error);
        alert("Failed to add new record.");
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const handlePermissionToggle = async (doctorId: string, hasPermission: boolean) => {
    if (!patientData) return;
    
    const originalState = patientData;
    // Optimistic UI update
    setPatientData(prev => {
        if (!prev) return null;
        const currentSharedWith = prev.sharedWith || [];
        const newSharedWith = hasPermission 
            ? [...currentSharedWith, doctorId]
            : currentSharedWith.filter(id => id !== doctorId);
        return { ...prev, sharedWith: newSharedWith };
    });

    try {
      await updatePatientSharingPermissions(patientData.uid, doctorId, hasPermission);
    } catch (error) {
       console.error("Failed to update permission", error);
       // Revert UI on error
       setPatientData(originalState);
       alert("Failed to update permission.");
    }
  }

  const TabButton = ({ name, label }: {name: string, label: string}) => (
    <button onClick={() => setActiveTab(name)} className={`px-4 py-2 text-sm font-semibold rounded-md ${activeTab === name ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>
        {label}
    </button>
  );

  const formatDateTime = (timestamp: any) => new Date(timestamp.seconds * 1000).toLocaleString();
  const formatTime = (timestamp: any) => new Date(timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const upcomingAppointments = appointments.filter(a => a.dateTime.seconds * 1000 > Date.now());
  const pastAppointments = appointments.filter(a => a.dateTime.seconds * 1000 <= Date.now());


  if (loading) return <div className="flex justify-center mt-10"><Spinner /></div>;
  if (error) return <div className="text-center text-red-500 mt-10">{error}</div>;
  if (!patientData) return <div className="text-center mt-10">No patient data available.</div>;

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-6 border-b pb-3">
        <h2 className="text-3xl font-bold">Patient Dashboard</h2>
        <div className="flex space-x-2 p-1 bg-slate-100 rounded-lg">
           <TabButton name="profile" label="My Profile & History" />
           <TabButton name="appointments" label="Appointments" />
           <TabButton name="permissions" label="Sharing Permissions" />
        </div>
      </div>
      
      {reminders
        .filter(r => !dismissedReminders.includes(r.id))
        .map(reminder => (
          <ReminderBanner
            key={reminder.id}
            message={`Reminder: You have an appointment with Dr. ${reminder.doctorName} tomorrow at ${formatTime(reminder.dateTime)}.`}
            onDismiss={() => setDismissedReminders(prev => [...prev, reminder.id])}
          />
        ))}

      {activeTab === 'profile' && (
        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Your Health QR Code</h3>
                <div className="flex justify-center">
                <QrCodeDisplay value={patientData.uid} size={200} />
                </div>
                <p className="text-center text-sm text-slate-500 mt-4">Show this to your doctor to securely share your medical history.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Personal Information</h3>
                <div className="space-y-2">
                <p><strong>Name:</strong> {patientData.name}</p>
                <p><strong>Email:</strong> {patientData.email}</p>
                <p><strong>Patient ID:</strong> <span className="text-sm font-mono bg-slate-100 p-1 rounded">{patientData.uid}</span></p>
                </div>
            </div>
            </div>
            <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Medical History</h3>
                    <button onClick={() => setAddRecordModalOpen(true)} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition duration-200">
                        + Add Record
                    </button>
                </div>
            {medicalHistory.length > 0 ? (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {medicalHistory.map((record) => (
                    <MedicalRecordCard key={record.id} record={record} />
                ))}
                </div>
            ) : <p className="text-slate-500">No medical records found.</p> }
            </div>
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-xl font-semibold">My Appointments</h3>
             <button onClick={() => setBookingModalOpen(true)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700">
                Book New Appointment
             </button>
           </div>
           <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold text-lg mb-2">Upcoming</h4>
                    {upcomingAppointments.length > 0 ? (
                        <div className="space-y-3">
                            {upcomingAppointments.map(app => (
                                <div key={app.id} className="border p-4 rounded-lg bg-slate-50 flex justify-between items-start gap-4">
                                    <div>
                                        <p className="font-semibold">Dr. {app.doctorName}</p>
                                        <p className="text-sm text-slate-600">{formatDateTime(app.dateTime)}</p>
                                        <p className="text-sm mt-1"><strong>Reason:</strong> {app.reason}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <StatusBadge status={app.status} />
                                        {app.status === 'scheduled' && (
                                            <button
                                                onClick={() => openCancelConfirmationModal(app.id)}
                                                className="mt-2 text-xs bg-red-100 text-red-700 hover:bg-red-200 font-semibold py-1 px-3 rounded-full transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-slate-500">No upcoming appointments.</p>}
                </div>
                <div>
                    <h4 className="font-semibold text-lg mb-2">Past</h4>
                    {pastAppointments.length > 0 ? (
                         <div className="space-y-3">
                            {pastAppointments.map(app => (
                                <div key={app.id} className="border p-4 rounded-lg bg-slate-50 opacity-80 flex justify-between items-center gap-4">
                                    <div>
                                        <p className="font-semibold">Dr. {app.doctorName}</p>
                                        <p className="text-sm text-slate-600">{formatDateTime(app.dateTime)}</p>
                                        <p className="text-sm mt-1"><strong>Reason:</strong> {app.reason}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <StatusBadge status={app.status} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ): <p className="text-slate-500">No past appointments.</p>}
                </div>
           </div>
        </div>
      )}

      {activeTab === 'permissions' && (
         <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">Data Sharing Permissions</h3>
            <p className="text-slate-600 mb-4">Control which doctors can access your medical records.</p>
            <div className="space-y-3">
                {allDoctors.map(doctor => (
                    <div key={doctor.uid} className="flex justify-between items-center p-3 border rounded-lg">
                        <p>Dr. {doctor.name}</p>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={patientData.sharedWith?.includes(doctor.uid) ?? false} onChange={(e) => handlePermissionToggle(doctor.uid, e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                ))}
            </div>
         </div>
      )}

      <Modal isOpen={isBookingModalOpen} onClose={() => setBookingModalOpen(false)} title="Book an Appointment">
        <form onSubmit={handleBookAppointment} className="space-y-4">
            <div>
                <label htmlFor="doctor" className="block text-sm font-medium text-gray-700">Doctor</label>
                <select id="doctor" value={bookingDoctorId} onChange={e => setBookingDoctorId(e.target.value)} required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                    <option value="" disabled>Select a doctor</option>
                    {allDoctors.map(doc => <option key={doc.uid} value={doc.uid}>Dr. {doc.name}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
                <input type="text" id="date" placeholder="e.g., dd-mm-yyyy or yyyy-mm-dd" value={bookingDateStr} onChange={e => setBookingDateStr(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
            </div>
             <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700">Time (Optional)</label>
                <input type="text" id="time" placeholder="e.g., 14:30 (defaults to 09:00)" value={bookingTimeStr} onChange={e => setBookingTimeStr(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
            </div>
            <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Reason for Visit</label>
                <textarea id="reason" value={bookingReason} onChange={e => setBookingReason(e.target.value)} required rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></textarea>
            </div>

            {bookingError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">{bookingError}</p>}
            
            <div className="flex justify-end pt-2">
                <button type="button" onClick={() => setBookingModalOpen(false)} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 mr-2">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="w-48 flex justify-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300">
                    {isSubmitting ? <Spinner /> : 'Confirm Appointment'}
                </button>
            </div>
        </form>
      </Modal>

      <Modal isOpen={isAddRecordModalOpen} onClose={() => setAddRecordModalOpen(false)} title="Add New Medical Record">
        <form onSubmit={handleAddNewRecord} className="space-y-4">
            <div>
                <label htmlFor="recordType" className="block text-sm font-medium text-gray-700">Record Type</label>
                <select id="recordType" value={newRecordType} onChange={e => setNewRecordType(e.target.value as RecordType)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                    <option value="allergy_note">Allergy Note</option>
                    <option value="lab_result">Lab Result</option>
                </select>
            </div>
            
            {newRecordType === 'allergy_note' && (
                <>
                    <div>
                        <label htmlFor="allergen" className="block text-sm font-medium text-gray-700">Allergen</label>
                        <input type="text" id="allergen" value={allergen} onChange={e => setAllergen(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                    </div>
                     <div>
                        <label htmlFor="severity" className="block text-sm font-medium text-gray-700">Severity</label>
                        <select id="severity" value={severity} onChange={e => setSeverity(e.target.value as any)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                            <option value="mild">Mild</option>
                            <option value="moderate">Moderate</option>
                            <option value="severe">Severe</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="reaction" className="block text-sm font-medium text-gray-700">Reaction</label>
                        <textarea id="reaction" value={reaction} onChange={e => setReaction(e.target.value)} required rows={2} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"></textarea>
                    </div>
                </>
            )}

            {newRecordType === 'lab_result' && (
                <>
                     <div>
                        <label htmlFor="testName" className="block text-sm font-medium text-gray-700">Test Name</label>
                        <input type="text" id="testName" value={testName} onChange={e => setTestName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                    </div>
                    <div>
                        <label htmlFor="resultSummary" className="block text-sm font-medium text-gray-700">Result Summary</label>
                        <textarea id="resultSummary" value={resultSummary} onChange={e => setResultSummary(e.target.value)} required rows={2} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"></textarea>
                    </div>
                </>
            )}
             <div>
                <label htmlFor="recordNotes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                <textarea id="recordNotes" value={recordNotes} onChange={e => setRecordNotes(e.target.value)} rows={2} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"></textarea>
            </div>

            <div className="flex justify-end pt-2">
                <button type="button" onClick={() => setAddRecordModalOpen(false)} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 mr-2">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-green-300">
                    {isSubmitting ? 'Saving...' : 'Save Record'}
                </button>
            </div>
        </form>
      </Modal>

      <Modal isOpen={isCancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Confirm Cancellation">
        <div className="space-y-4">
            <p>Are you sure you want to cancel this appointment? This action cannot be undone.</p>
            <div className="flex justify-end space-x-2 pt-2">
                <button 
                    onClick={() => setCancelModalOpen(false)} 
                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Keep Appointment
                </button>
                <button 
                    onClick={handleConfirmCancelAppointment} 
                    className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700"
                >
                    Confirm Cancellation
                </button>
            </div>
        </div>
      </Modal>

    </div>
  );
};

export default PatientDashboard;