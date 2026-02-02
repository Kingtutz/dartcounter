import { useState } from 'react';

interface DartboardCalibrationProps {
  onCalibrate: (centerX: number, centerY: number, radius: number) => void;
  onAutoCalibrate: () => void;
  isCalibrated: boolean;
}

export const DartboardCalibration: React.FC<DartboardCalibrationProps> = ({ 
  onAutoCalibrate,
  onCalibrate,
  isCalibrated 
}) => {
  const [centerX, setCenterX] = useState(640);
  const [centerY, setCenterY] = useState(360);
  const [radius, setRadius] = useState(200);

  const handleCalibrate = () => {
    onCalibrate(centerX, centerY, radius);
  };

  return (
    <div className="calibration-panel">
      <h3>Dartboard Calibration</h3>
      <p className="calibration-status">
        {isCalibrated ? '✓ Calibrated' : '⚠ Not Calibrated'}
      </p>
      
      <div className="calibration-controls">
        <div className="control-group">
          <label>Center X:</label>
          <input
            type="number"
            value={centerX}
            onChange={(e) => setCenterX(Number(e.target.value))}
            step="10"
          />
        </div>
        
        <div className="control-group">
          <label>Center Y:</label>
          <input
            type="number"
            value={centerY}
            onChange={(e) => setCenterY(Number(e.target.value))}
            step="10"
          />
        </div>
        
        <div className="control-group">
          <label>Radius:</label>
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            min="50"
            max="500"
            step="10"
          />
        </div>
      </div>

      <button onClick={handleCalibrate} className="calibrate-btn">
        {isCalibrated ? 'Recalibrate' : 'Calibrate Dartboard'}
      </button>

      <button onClick={onAutoCalibrate} className="calibrate-btn auto">
        🤖 Auto-Calibrate (AI Detection)
      </button>

      <div className="calibration-help">
        <p><strong>Calibration Tips:</strong></p>
        <ul>
          <li>Position camera to clearly see the entire dartboard</li>
          <li>Adjust Center X and Y to match dartboard center</li>
          <li>Set Radius to match the outer edge of the dartboard</li>
          <li>Yellow overlay will show calibrated area</li>
        </ul>
      </div>
    </div>
  );
};
