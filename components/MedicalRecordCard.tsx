import React from 'react';
import { MedicalRecord, RecordType } from '../types';
import { Timestamp } from 'firebase/firestore';

const formatDate = (timestamp: Timestamp) => new Date(timestamp.seconds * 1000).toLocaleDateString();

const ConsultationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

const LabIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
);

const AllergyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);


const ICONS: Record<RecordType, React.ReactNode> = {
    consultation: <ConsultationIcon />,
    lab_result: <LabIcon />,
    allergy_note: <AllergyIcon />,
};

const TITLES: Record<RecordType, string> = {
    consultation: "Doctor Consultation",
    lab_result: "Lab Result",
    allergy_note: "Allergy Note"
};

const MedicalRecordCard: React.FC<{ record: MedicalRecord }> = ({ record }) => {
    return (
        <div className="border border-slate-200 p-4 rounded-lg bg-slate-50">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-500">{ICONS[record.type]}</span>
                    </div>
                    <div>
                        <p className="font-bold text-lg text-slate-800">{TITLES[record.type]}</p>
                        <p className="text-sm text-slate-500">{formatDate(record.date)}</p>
                    </div>
                </div>
            </div>

            <div className="pl-4 border-l-2 border-indigo-200 ml-6 space-y-2 text-slate-700">
                {record.type === 'consultation' && (
                    <>
                        <p><strong>Doctor:</strong> Dr. {record.doctorName}</p>
                        <p><strong>Diagnosis:</strong> {record.diagnosis}</p>
                        <p><strong>Prescription:</strong> {record.prescription}</p>
                    </>
                )}
                {record.type === 'lab_result' && (
                    <>
                        <p><strong>Test:</strong> {record.testName}</p>
                        <p><strong>Result:</strong> {record.resultSummary}</p>
                    </>
                )}
                {record.type === 'allergy_note' && (
                     <>
                        <p><strong>Allergen:</strong> {record.allergen}</p>
                        <p><strong>Severity:</strong> <span className="capitalize font-medium">{record.severity}</span></p>
                        <p><strong>Reaction:</strong> {record.reaction}</p>
                    </>
                )}
                {record.notes && <p className="mt-2 pt-2 border-t border-slate-200 text-sm italic"><strong>Notes:</strong> {record.notes}</p>}
            </div>
        </div>
    );
};

export default MedicalRecordCard;