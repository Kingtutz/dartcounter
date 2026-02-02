# 🎯 Auto Dart Counter - User Guide

An AI-powered automatic dart counter that uses computer vision to detect darts and track scores in real-time.

## Features

- **Camera Integration**: Live camera feed to capture dart throws
- **AI Detection**: TensorFlow.js powered object detection for dart recognition
- **Multiple Game Modes**: 301, 501, Cricket, and Practice modes
- **Score Tracking**: Automatic score calculation and player management
- **Dartboard Calibration**: Adjustable calibration system for accurate scoring
- **Manual Entry**: Fallback manual score entry for testing or when auto-detection needs assistance

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A webcam or camera device
- Modern web browser with camera permissions

### Installation

Dependencies are already installed! The project includes:
- React 19 for UI
- TensorFlow.js for machine learning
- COCO-SSD for object detection
- Vite for fast development

### Running the App

The development server is already running at **http://localhost:5173/**

Visit the URL in your browser and grant camera permissions when prompted.

## How to Use

### 1. **Calibrate the Dartboard**
   - Position your camera to clearly see the entire dartboard
   - Adjust the Center X, Center Y, and Radius values in the calibration panel
   - Click "Calibrate Dartboard" to save settings
   - A yellow overlay will show the calibrated area

### 2. **Start a Game**
   - Select your preferred game mode (301, 501, Cricket, or Practice)
   - Click "Start Game" to begin
   - The camera will start detecting darts

### 3. **Play**
   - The system will attempt to auto-detect darts
   - Use manual entry to register throws:
     - Enter score (1-20)
     - Select multiplier (Single, Double, Triple)
     - Click "Register Throw"
   - Quick buttons available for Bull 25, Bull 50, and Miss

### 4. **Track Scores**
   - View real-time scores for all players
   - See the last 3 throws for each player
   - Current player is highlighted with a yellow border

## Game Modes

- **301/501**: Classic countdown games - first to reach exactly zero wins
- **Cricket**: Score on numbers 15-20 and bulls
- **Practice**: Free practice mode with unlimited throws

## Technical Details

### Architecture

- **Frontend**: React + TypeScript
- **Computer Vision**: TensorFlow.js + COCO-SSD model
- **Scoring Algorithm**: Geometric calculation based on dartboard position
- **Camera API**: MediaDevices getUserMedia API

### Detection Logic

The system uses:
1. Real-time object detection via TensorFlow.js
2. Geometric calculations to determine dart position
3. Dartboard zone mapping (singles, doubles, triples, bulls)
4. Angle-based segment scoring (1-20 segments)

### Calibration

Proper calibration is essential for accurate scoring:
- **Center X/Y**: Pixel coordinates of dartboard center
- **Radius**: Distance from center to outer edge in pixels
- The overlay helps visualize the calibration

## Development

### Project Structure

```
src/
├── components/
│   ├── CameraFeed.tsx          # Camera access and video stream
│   ├── DartboardCalibration.tsx # Calibration controls
│   ├── GameControls.tsx         # Game mode and manual entry
│   └── ScoreBoard.tsx           # Score display
├── services/
│   └── dartDetection.ts         # AI detection logic
├── types/
│   └── dart.ts                  # TypeScript interfaces
├── App.tsx                      # Main application
└── App.css                      # Styling
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Notes

- The COCO-SSD model is optimized for general object detection and may need fine-tuning for optimal dart detection
- For best results, ensure good lighting and a clear view of the dartboard
- Manual entry is recommended until the detection model is further trained with dart-specific data
- Camera must be granted permissions in browser

## Future Enhancements

- Custom dart detection model training
- Multiple camera angles
- Game statistics and history
- Player profiles and rankings
- Sound effects and announcements
- Tournament mode

## Troubleshooting

**Camera not working?**
- Check browser permissions
- Ensure no other app is using the camera
- Try refreshing the page

**Detection not accurate?**
- Recalibrate the dartboard
- Improve lighting conditions
- Use manual entry as backup

**Performance issues?**
- Close other browser tabs
- Ensure sufficient hardware resources
- Reduce video resolution if needed

---

Built with ❤️ using React, TypeScript, and TensorFlow.js
