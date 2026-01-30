# Musical Class Break Timer

A sleek, modern countdown timer built with vanilla HTML, CSS, and JavaScript. Designed for classrooms, study sessions, and productivity breaks.

<p align="center">
  <img src="assets/image1.jpeg" alt="Timer Interface" width="400"/>
  <img src="assets/image2.jpeg" alt="Settings Panel" width="400"/>
</p>

## Demo

[**Live Demo**](https://alfredang.github.io/musical-timer-countdown/)

[**User Guide**](https://alfredang.github.io/musical-timer-countdown/docs/)

## Features

### Timer Functionality
- **Preset Times**: Quick-start buttons for 15m, 30m, 45m, 1h, 1h 15m, and 1h 30m
- **Manual Input**: Enter custom hours, minutes, and seconds
- **Accurate Timing**: Uses `Date.now()` for drift-free countdown accuracy
- **Visual Progress Ring**: Animated circular progress indicator shows remaining time
- **Pause & Resume**: Pause the timer and resume from where you left off
- **Reset**: Always-available reset button clears the timer back to 00:00:00

### Sound Alerts
- **3 Built-in Alarm Sounds**: Choose from Dream, Inspire, or Wing
- **Custom MP3 Upload**: Upload your own MP3 file (up to 5MB) as a custom alarm sound
- **Continuous Alert**: Alarm loops until manually stopped when timer reaches zero
- **Volume Control**: Adjustable volume slider from silent to maximum
- **Mute Toggle**: Quick mute/unmute button
- **Preview Sound**: Test your selected alarm sound before starting

### Customization
- **6 Color Themes**: Default (Blue), Ocean, Forest, Sunset, Purple, and Rose
- **Settings Persist**: Your sound, theme, and custom audio preferences are saved in localStorage
- **Mobile Responsive**: Fully optimized for all screen sizes

## How to Use

### Setting a Timer
1. **Using Presets**: Click any preset button (15m, 30m, 45m, 1h, 1h 15m, 1h 30m)
2. **Manual Entry**: Type your desired time in the HR:MIN:SEC input fields

### Timer Controls
- **Start**: Begins the countdown
- **Pause**: Pauses the timer (button changes to "Resume")
- **Reset**: Clears the timer and all inputs back to 00:00:00

### When Timer Completes
- The display shows "Time's Up!" with a flashing animation
- Your selected alarm sound plays continuously
- Click **Stop Alarm** to silence the alarm and reset

### Customizing Settings
1. Click the **gear icon** (top right) to open Settings
2. **Alarm Sound**: Select from built-in sounds or choose "Custom" to upload your own MP3
3. **Custom Upload**: Click "Upload MP3" to select a file (max 5MB)
4. **Color Theme**: Choose from 6 beautiful color schemes
5. Settings are automatically saved

## Project Structure

```
musical-timer-countdown/
├── index.html          # Main HTML structure
├── css/
│   └── style.css       # Styling, themes, and responsive design
├── javascript/
│   └── script.js       # Timer logic and audio handling
├── assets/
│   ├── image1.jpeg     # Timer interface preview
│   ├── image2.jpeg     # Settings panel preview
│   └── sounds/         # Built-in audio files
├── docs/
│   └── index.html      # User guide (GitHub Pages)
└── README.md
```

## Technologies

- **HTML5**: Semantic markup with SVG progress ring
- **CSS3**: CSS Variables for theming, Flexbox/Grid layouts, animations
- **JavaScript (ES6+)**: Class-based architecture, Web Audio API for sound synthesis
- **No Dependencies**: Pure vanilla implementation, no frameworks required

## Browser Support

Works on all modern browsers that support:
- CSS Custom Properties (CSS Variables)
- Web Audio API
- ES6+ JavaScript features
- File API (for custom MP3 upload)

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/alfredang/musical-timer-countdown.git
   ```
2. Open `index.html` in your browser
3. No build process or server required!

## Sound System

The app includes 3 built-in alarm sounds:
- **Dream**: `Dream.mp3` - Calm, dreamy melody
- **Inspire**: `Inspire.mp3` - Uplifting tune
- **Wing**: `Wing.mp3` - Light, airy sound

**Custom Audio**: Upload your own MP3 file (up to 5MB) which will be stored in your browser's localStorage for future use.

## License

MIT License - Feel free to use and modify for your own projects.

---

Powered by **Tertiary Infotech Academy Pte Ltd**
