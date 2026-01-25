# Class Break Timer

A sleek, modern countdown timer built with vanilla HTML, CSS, and JavaScript. Designed for classrooms, study sessions, and productivity breaks.

![App Preview](assets/preview.png)

## Demo

[**Live Demo**](https://alfredang.github.io/timer-countdown/)

## Features

### Timer Functionality
- **Preset Times**: Quick-start buttons for 15m, 30m, 45m, 1h, 1h 15m, and 1h 30m
- **Manual Input**: Enter custom hours, minutes, and seconds
- **Accurate Timing**: Uses `Date.now()` for drift-free countdown accuracy
- **Visual Progress Ring**: Animated circular progress indicator shows remaining time
- **Pause & Resume**: Pause the timer and resume from where you left off
- **Reset**: Always-available reset button clears the timer back to 00:00:00

### Sound Alerts
- **4 Alarm Sounds**: Choose from Dream, Inspire, Wing, or Morning
- **Continuous Alert**: Alarm loops until manually stopped when timer reaches zero
- **Volume Control**: Adjustable volume slider from silent to maximum
- **Mute Toggle**: Quick mute/unmute button
- **Preview Sound**: Test your selected alarm sound before starting

### Customization
- **6 Color Themes**: Default (Blue), Ocean, Forest, Sunset, Purple, and Rose
- **Settings Persist**: Your sound and theme preferences are saved in localStorage
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
2. **Alarm Sound**: Select your preferred sound and click "Preview Sound" to test
3. **Color Theme**: Choose from 6 beautiful color schemes
4. Settings are automatically saved

## Project Structure

```
timer-countdown/
├── index.html          # Main HTML structure
├── css/
│   └── style.css       # Styling, themes, and responsive design
├── javascript/
│   └── script.js       # Timer logic and audio synthesis
├── assets/
│   ├── preview.png     # Preview image for README
│   └── sounds/         # Optional audio files (falls back to Web Audio API)
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

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/alfredang/timer-countdown.git
   ```
2. Open `index.html` in your browser
3. No build process or server required!

## Sound System

The app plays audio tracks from `assets/sounds/` and loops the selected track on completion:
- **Dream**: `Dream.mp3`
- **Inspire**: `Inspire.mp3`
- **Wing**: `Wing.mp3`
- **Morning**: `Morning.mp3`

Optional: Add `click.mp3` and `start.mp3` to `assets/sounds/` for UI feedback sounds.

## License

MIT License - Feel free to use and modify for your own projects.

---

Powered by **Tertiary Infotech Academy Pte Ltd**
