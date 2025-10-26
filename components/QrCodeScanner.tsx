
import React, { useEffect, useRef } from 'react';

declare const Html5QrcodeScanner: any;

interface QrCodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: string) => void;
}

const QrCodeScanner: React.FC<QrCodeScannerProps> = ({ onScanSuccess, onScanFailure }) => {
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader', 
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false // verbose
    );
    scannerRef.current = scanner;

    const successCallback = (decodedText: string, decodedResult: any) => {
      scanner.clear();
      onScanSuccess(decodedText);
    };

    const errorCallback = (error: string) => {
        if (onScanFailure) {
            onScanFailure(error);
        }
    };
    
    scanner.render(successCallback, errorCallback);

    return () => {
      if(scannerRef.current) {
         scannerRef.current.clear().catch((error:any) => {
            console.error("Failed to clear html5-qrcode-scanner.", error);
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div id="qr-reader" className="w-full"></div>;
};

export default QrCodeScanner;
