import { Timestamp } from "firebase/firestore";

export type UserType = 'doctor' | 'patient';

export interface BaseUser {
  uid: string;
  email: string | null;
  name: string;
}

export interface Patient extends BaseUser {
  aadhaar: string;
  createdAt: Timestamp;
  sharedWith?: string[]; // Changed from map to array
}

export interface Doctor extends BaseUser {
   createdAt: Timestamp;
}

export type RecordType = 'consultation' | 'lab_result' | 'allergy_note';

export interface MedicalRecord {
    id: string;
    date: Timestamp;
    type: RecordType;
    
    // Common
    notes?: string;

    // For 'consultation'
    doctorName?: string;
    doctorId?: string;
    diagnosis?: string;
    prescription?: string;

    // For 'lab_result'
    testName?: string;
    resultSummary?: string; 

    // For 'allergy_note'
    allergen?: string;
    severity?: 'mild' | 'moderate' | 'severe';
    reaction?: string;
}


export interface PatientProfile extends Patient {
    medicalHistory: MedicalRecord[];
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  doctorId: string;
  doctorName: string;
  dateTime: Timestamp;
  reason: string;
  status: AppointmentStatus;
  createdAt: Timestamp;
}