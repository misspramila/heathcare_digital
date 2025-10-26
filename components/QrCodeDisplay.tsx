import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QrCodeDisplayProps {
  value: string;
  size?: number;
}

const QrCodeDisplay: React.FC<QrCodeDisplayProps> = ({ value, size = 256 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, { width: size }, (error: Error | null) => {
        if (error) console.error(error);
      });
    }
  }, [value, size]);

  return <canvas ref={canvasRef} />;
};

export default QrCodeDisplay;