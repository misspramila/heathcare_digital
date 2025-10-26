// FIX: Using Firebase v9 compat library for app initialization, as modular `initializeApp` is not found.
import firebase from 'firebase/compat/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  Auth,
  sendPasswordResetEmail,
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  getDocs,
  Timestamp,
  Firestore,
  where,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { UserType, Doctor, Patient, MedicalRecord, Appointment, AppointmentStatus } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyB_ajy18w9POeq_PyiIOJa_xC8mkETfUkQ",
  authDomain: "abc2345-a2311.firebaseapp.com",
  projectId: "abc2345-a2311",
  storageBucket: "abc2345-a2311.appspot.com",
  messagingSenderId: "1093811156643",
  appId: "1:1093811156643:web:5ad1b1271d1693a471f116",
  measurementId: "G-FS53Q8ZNJX"
};

// FIX: Initialize app using the compat library. The 'app' instance is compatible with modular v9 functions.
const app = firebase.initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// --- Auth ---

export const signUp = async (email: string, password: string, name: string, userType: UserType, aadhaar?: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  const collectionName = userType === 'doctor' ? 'doctors' : 'patients';
  const userData = {
    name,
    email: user.email!,
    createdAt: Timestamp.now(),
    ...(userType === 'patient' && { aadhaar: aadhaar!, sharedWith: [] }), // Initialize with empty array
  };

  await setDoc(doc(db, collectionName, user.uid), userData);
  return user;
};

export const signIn = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signOutUser = () => {
  return signOut(auth);
};

export const sendPasswordReset = (email: string) => {
    return sendPasswordResetEmail(auth, email);
};

// --- User Profiles ---

export const getUserProfile = async (uid: string): Promise<{ data: Doctor | Patient, type: UserType } | null> => {
  const doctorRef = doc(db, "doctors", uid);
  const doctorSnap = await getDoc(doctorRef);
  if (doctorSnap.exists()) {
    return { data: { uid, ...doctorSnap.data() } as Doctor, type: 'doctor' };
  }

  const patientRef = doc(db, "patients", uid);
  const patientSnap = await getDoc(patientRef);
  if (patientSnap.exists()) {
    const patientDataFromDb = patientSnap.data();
    // FIX: Handle legacy `sharedWith` map by converting it to an array of keys.
    if (patientDataFromDb.sharedWith && !Array.isArray(patientDataFromDb.sharedWith)) {
        patientDataFromDb.sharedWith = Object.keys(patientDataFromDb.sharedWith);
    }
    const patientProfile = { uid, ...patientDataFromDb } as Patient;
    return { data: patientProfile, type: 'patient' };
  }

  return null;
};

export const getAllDoctors = async (): Promise<Doctor[]> => {
    const doctorsQuery = query(collection(db, "doctors"), orderBy("name"));
    const doctorsSnap = await getDocs(doctorsQuery);
    return doctorsSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Doctor));
};

// --- Patient Data & Permissions ---

export const getPatientWithHistory = async (patientUid: string, doctorId: string): Promise<{patient: Patient, medicalHistory: MedicalRecord[]}| null> => {
    const patientRef = doc(db, "patients", patientUid);
    const patientSnap = await getDoc(patientRef);

    if(!patientSnap.exists()) return null;

    const patientDataFromDb = patientSnap.data();
    // FIX: Handle legacy `sharedWith` map by converting it to an array of keys.
    if (patientDataFromDb.sharedWith && !Array.isArray(patientDataFromDb.sharedWith)) {
        patientDataFromDb.sharedWith = Object.keys(patientDataFromDb.sharedWith);
    }

    const patient = { uid: patientUid, ...patientDataFromDb } as Patient;

    // Permission Check: A patient can always view their own records.
    // Check if doctorId is in the sharedWith array.
    if (patient.uid !== doctorId && (!patient.sharedWith || !patient.sharedWith.includes(doctorId))) {
      throw new Error("Access Denied. This patient has not granted you permission to view their records.");
    }

    const recordsQuery = query(collection(db, `patients/${patientUid}/medicalHistory`), orderBy("date", "desc"));
    const recordsSnap = await getDocs(recordsQuery);
    const medicalHistory: MedicalRecord[] = recordsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MedicalRecord));

    return { patient, medicalHistory };
}

export const addPatientMedicalRecord = async (patientUid: string, record: Omit<MedicalRecord, 'id'>) => {
    const recordsCollection = collection(db, `patients/${patientUid}/medicalHistory`);
    const docRef = await addDoc(recordsCollection, record);
    return { id: docRef.id, ...record };
};

export const updatePatientSharingPermissions = async (patientId: string, doctorId: string, hasPermission: boolean) => {
    const patientRef = doc(db, "patients", patientId);
    if (hasPermission) {
        await updateDoc(patientRef, { sharedWith: arrayUnion(doctorId) });
    } else {
        await updateDoc(patientRef, { sharedWith: arrayRemove(doctorId) });
    }
};


// --- Aadhaar Verification ---

// Verhoeff algorithm for Aadhaar validation
const verhoeff = (() => {
    const multiplicationTable = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
        [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
        [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
        [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
        [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
        [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
        [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
        [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
        [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
    ];

    const permutationTable = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
        [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
        [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
        [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
        [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
        [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
        [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
    ];

    function validate(array: number[]): boolean {
        let checksum = 0;
        // The Verhoeff algorithm processes digits from right to left.
        // We reverse the array to achieve this.
        const reversedArray = array.slice().reverse();
        for (let i = 0; i < reversedArray.length; i++) {
            checksum = multiplicationTable[checksum][permutationTable[i % 8][reversedArray[i]]];
        }
        return checksum === 0;
    }
    
    return { validate };
})();

// Updated Aadhaar verification using the Verhoeff algorithm.
export const verifyAadhaar = (aadhaar: string): Promise<{ success: boolean; message: string }> => {
  return new Promise(resolve => {
    setTimeout(() => {
      if (!/^\d{12}$/.test(aadhaar)) {
        resolve({ success: false, message: "Invalid Aadhaar format. Must be 12 digits." });
        return;
      }
      
      const aadhaarArray = aadhaar.split('').map(Number);
      const isValid = verhoeff.validate(aadhaarArray);

      if (isValid) {
        resolve({ success: true, message: "Aadhaar number verified successfully." });
      } else {
        resolve({ success: false, message: "Invalid Aadhaar number. Please check the number and try again." });
      }
    }, 1000); // Simulate API delay
  });
};

// --- Appointments ---

export const updateAppointmentStatus = async (appointmentId: string, status: AppointmentStatus) => {
    const appointmentRef = doc(db, "appointments", appointmentId);
    await updateDoc(appointmentRef, { status: status });
};

export const createAppointment = async (appointmentData: Omit<Appointment, 'id'>) => {
    const appointmentsCollection = collection(db, "appointments");
    const docRef = await addDoc(appointmentsCollection, appointmentData);
    return { id: docRef.id, ...appointmentData };
};


// NOTE: This function previously used a Firestore `orderBy` clause which required
// composite indexes. To resolve the "index required" error without manual
// intervention in the Firebase console, the sorting logic has been moved
// to the client-side. This approach works but may be less performant on
// very large datasets.
//
// For production environments, the recommended solution is to create these
// two composite indexes in Firestore:
// 1. Collection: appointments, Fields: patientId (Ascending), dateTime (Descending)
// 2. Collection: appointments, Fields: doctorId (Ascending), dateTime (Descending)
export const getAppointmentsForUser = async (
    uid: string,
    userType: UserType,
    sortOrder: 'asc' | 'desc' = 'desc'
): Promise<Appointment[]> => {
    const idField = userType === 'doctor' ? 'doctorId' : 'patientId';
    const appointmentsQuery = query(collection(db, "appointments"), where(idField, "==", uid));
    const appointmentsSnap = await getDocs(appointmentsQuery);
    
    const appointments = appointmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
    
    // Sort appointments by date based on the sortOrder parameter
    appointments.sort((a, b) => {
        if (sortOrder === 'asc') {
            return a.dateTime.seconds - b.dateTime.seconds; // Oldest first
        }
        return b.dateTime.seconds - a.dateTime.seconds; // Newest first
    });

    return appointments;
};