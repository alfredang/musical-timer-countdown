class Timer {
    constructor() {
        // DOM Elements
        this.timeDisplay = document.getElementById('time-display');
        this.timerStatus = document.getElementById('timer-status');
        this.progressRing = document.querySelector('.progress-ring__circle');
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.inputInputs = {
            h: document.getElementById('input-hours'),
            m: document.getElementById('input-minutes'),
            s: document.getElementById('input-seconds')
        };
        this.inputSection = document.getElementById('input-section');
        this.presetBtns = document.querySelectorAll('.preset-btn');

        // Sound Elements
        this.volumeSlider = document.getElementById('volume-slider');
        this.muteBtn = document.getElementById('mute-btn');

        // Settings Elements
        this.settingsBtn = document.getElementById('settings-btn');
        this.settingsModal = document.getElementById('settings-modal');
        this.closeSettingsBtn = document.getElementById('close-settings');
        this.soundOptions = document.querySelectorAll('.sound-option');
        this.themeOptions = document.querySelectorAll('.theme-option');
        this.previewSoundBtn = document.getElementById('preview-sound');

        // Constants (Radius from SVG)
        this.radius = this.progressRing.r.baseVal.value;
        this.circumference = 2 * Math.PI * this.radius;

        // State
        this.totalSeconds = 0;
        this.remainingSeconds = 0;
        this.interval = null;
        this.isRunning = false;
        this.isPaused = false;
        this.endTime = null;
        this.audioCtx = null; // For simple beep if files missing, or we use Audio
        this.volume = 0.3;
        this.isMuted = false;
        this.selectedSound = 'beep';
        this.selectedTheme = 'default';
        this.alarmInterval = null;
        this.isAlarming = false;

        // Init
        this.init();
    }

    init() {
        this.loadSettings();
        this.setupRing();
        this.addEventListeners();
        this.updateDisplay(0);
        this.loadAudio();
        // Sync volume with slider default
        this.volume = parseFloat(this.volumeSlider.value);
    }

    loadSettings() {
        const savedSound = localStorage.getItem('timerSound');
        const savedTheme = localStorage.getItem('timerTheme');

        if (savedSound) {
            this.selectedSound = savedSound;
            this.soundOptions.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.sound === savedSound);
            });
        }

        if (savedTheme) {
            this.selectedTheme = savedTheme;
            document.body.setAttribute('data-theme', savedTheme === 'default' ? '' : savedTheme);
            if (savedTheme === 'default') {
                document.body.removeAttribute('data-theme');
            }
            this.themeOptions.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === savedTheme);
            });
        }
    }

    saveSettings() {
        localStorage.setItem('timerSound', this.selectedSound);
        localStorage.setItem('timerTheme', this.selectedTheme);
    }

    setupRing() {
        this.progressRing.style.strokeDasharray = `${this.circumference} ${this.circumference}`;
        this.progressRing.style.strokeDashoffset = 0;
    }

    setProgress(percent) {
        const offset = this.circumference - (percent / 100) * this.circumference;
        this.progressRing.style.strokeDashoffset = offset;
    }

    addEventListeners() {
        // Controls
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());

        // Presets
        this.presetBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const seconds = parseInt(e.target.dataset.time);
                this.selectPreset(seconds, e.target);
            });
        });

        // Manual Input Changes
        Object.values(this.inputInputs).forEach(input => {
            input.addEventListener('input', () => this.handleInputChange());
            input.addEventListener('change', () => this.validateInputs());
        });

        // Sound
        this.volumeSlider.addEventListener('input', (e) => {
            this.volume = e.target.value;
            this.playSound('click'); // Feedback
        });

        this.muteBtn.addEventListener('click', () => this.toggleMute());

        // Settings Modal
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.closeSettings();
        });

        // Sound Options
        this.soundOptions.forEach(btn => {
            btn.addEventListener('click', () => {
                this.soundOptions.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedSound = btn.dataset.sound;
                this.saveSettings();
            });
        });

        // Theme Options
        this.themeOptions.forEach(btn => {
            btn.addEventListener('click', () => {
                this.themeOptions.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedTheme = btn.dataset.theme;
                if (this.selectedTheme === 'default') {
                    document.body.removeAttribute('data-theme');
                } else {
                    document.body.setAttribute('data-theme', this.selectedTheme);
                }
                this.saveSettings();
            });
        });

        // Preview Sound
        this.previewSoundBtn.addEventListener('click', () => this.playAlarmSound());
    }

    openSettings() {
        this.settingsModal.classList.add('open');
    }

    closeSettings() {
        this.settingsModal.classList.remove('open');
    }

    handleInputChange() {
        const h = parseInt(this.inputInputs.h.value) || 0;
        const m = parseInt(this.inputInputs.m.value) || 0;
        const s = parseInt(this.inputInputs.s.value) || 0;

        const total = (h * 3600) + (m * 60) + s;
        this.updateDisplay(total, true); // True to not updating ring yet

        // Reset internal state so start() reads from inputs
        this.totalSeconds = 0;
        this.remainingSeconds = 0;

        // Deselect presets
        this.presetBtns.forEach(b => b.classList.remove('active'));
    }

    validateInputs() {
        let h = parseInt(this.inputInputs.h.value) || 0;
        let m = parseInt(this.inputInputs.m.value) || 0;
        let s = parseInt(this.inputInputs.s.value) || 0;

        // Clamping logic if needed, or simple rollover
        if (s > 59) {
            m += Math.floor(s / 60);
            s = s % 60;
        }
        if (m > 59) {
            h += Math.floor(m / 60);
            m = m % 60;
        }

        this.inputInputs.h.value = h.toString().padStart(2, '0');
        this.inputInputs.m.value = m.toString().padStart(2, '0');
        this.inputInputs.s.value = s.toString().padStart(2, '0');

        this.handleInputChange();
    }

    selectPreset(seconds, btn) {
        if (this.isRunning) this.reset();

        this.totalSeconds = seconds;
        this.remainingSeconds = seconds;

        // Update Inputs to match preset
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        this.inputInputs.h.value = h.toString().padStart(2, '0');
        this.inputInputs.m.value = m.toString().padStart(2, '0');
        this.inputInputs.s.value = s.toString().padStart(2, '0');

        this.updateDisplay(seconds);

        // Visuals
        this.presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    start() {
        this.stopAlarm();

        // Get time from inputs if not set via preset (or edited)
        if (this.remainingSeconds === 0 && !this.isPaused) {
            const h = parseInt(this.inputInputs.h.value) || 0;
            const m = parseInt(this.inputInputs.m.value) || 0;
            const s = parseInt(this.inputInputs.s.value) || 0;
            const total = (h * 3600) + (m * 60) + s;

            if (total === 0) return; // Don't start 0

            this.totalSeconds = total;
            this.remainingSeconds = total;
        }

        this.isRunning = true;
        this.isPaused = false;

        // End time calculation for accuracy (vs setInterval drift)
        this.endTime = Date.now() + (this.remainingSeconds * 1000);

        this.updateUIState('running');
        this.playSound('start');

        this.interval = setInterval(() => {
            const now = Date.now();
            const left = Math.ceil((this.endTime - now) / 1000);

            if (left <= 0) {
                this.complete();
            } else {
                this.remainingSeconds = left;
                this.updateDisplay(this.remainingSeconds);
            }
        }, 50); // check frequent for UI smoothness, but logic is based on Date.now()
    }

    pause() {
        if (!this.isRunning) return;

        this.isRunning = false;
        this.isPaused = true;
        clearInterval(this.interval);
        this.updateUIState('paused');
    }

    reset() {
        this.isRunning = false;
        this.isPaused = false;
        clearInterval(this.interval);
        this.stopAlarm();

        this.remainingSeconds = this.totalSeconds;

        this.updateDisplay(this.remainingSeconds);
        this.updateUIState('idle');
        this.setProgress(100);
    }

    complete() {
        this.remainingSeconds = 0;
        this.updateDisplay(0);
        this.isRunning = false;
        this.isPaused = false;
        clearInterval(this.interval);

        this.updateUIState('complete');
        this.startContinuousAlarm();
    }

    startContinuousAlarm() {
        if (this.isMuted) return;

        this.isAlarming = true;
        this.playAlarmSound();

        // Repeat alarm every 2 seconds
        this.alarmInterval = setInterval(() => {
            if (this.isAlarming && !this.isMuted) {
                this.playAlarmSound();
            }
        }, 2000);
    }

    stopAlarm() {
        this.isAlarming = false;
        if (this.alarmInterval) {
            clearInterval(this.alarmInterval);
            this.alarmInterval = null;
        }
    }

    updateDisplay(seconds, isPreview = false) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        const str = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        this.timeDisplay.textContent = str;
        document.title = `${str} - Class Break Timer`;

        // Ring progress
        if (this.totalSeconds > 0 && !isPreview) {
            const percent = (seconds / this.totalSeconds) * 100;
            this.setProgress(percent);
        } else if (isPreview) {
            this.setProgress(100);
        }
    }

    updateUIState(state) {
        // 'idle', 'running', 'paused', 'complete'
        this.inputSection.style.opacity = state === 'running' ? '0.2' : '1';
        this.inputSection.style.pointerEvents = state === 'running' ? 'none' : 'auto';

        if (state === 'running') {
            this.startBtn.disabled = true;
            this.pauseBtn.disabled = false;
            this.resetBtn.disabled = false;
            this.timerStatus.textContent = "Running...";
            this.timerStatus.style.color = "#60a5fa";
        } else if (state === 'paused') {
            this.startBtn.textContent = "Resume";
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.resetBtn.disabled = false;
            this.timerStatus.textContent = "Paused";
            this.timerStatus.style.color = "#fbbf24";
        } else if (state === 'idle') {
            this.startBtn.textContent = "Start";
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.resetBtn.disabled = true;
            this.timerStatus.textContent = "Ready";
            this.timerStatus.style.color = "#94a3b8";
        } else if (state === 'complete') {
            this.startBtn.textContent = "Start";
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.resetBtn.disabled = false;
            this.timerStatus.textContent = "Time's Up!";
            this.timerStatus.style.color = "#ef4444";
            document.title = "Time's Up!";
        }
    }

    // Sound Manager
    loadAudio() {
        // In real app, load files. Here we just setup placeholders or synth
        // We will try to load files, if fail, fallback to synth (oscillator)
        this.sounds = {
            click: new Audio('assets/sounds/click.mp3'),
            start: new Audio('assets/sounds/start.mp3'),
            alarm: new Audio('assets/sounds/alarm.mp3')
        };

        // Error handling for missing files (so code doesn't break)
        Object.values(this.sounds).forEach(audio => {
            audio.addEventListener('error', () => {
                audio.dataset.missing = 'true';
            });
        });
    }

    playSound(name) {
        if (this.isMuted) return;

        const sound = this.sounds[name];
        if (sound) {
            sound.volume = this.volume;
            if (sound.dataset.missing) {
                // Fallback beep
                this.beep(name === 'alarm' ? 440 : 880, name === 'alarm' ? 1000 : 100);
            } else {
                sound.currentTime = 0;
                sound.play().catch(e => console.log('Audio play failed', e));
            }
        }
    }

    playAlarmSound() {
        if (this.isMuted) return;

        // Different synthesized sounds based on selection
        const soundConfigs = {
            beep: { freq: 440, duration: 800, pattern: [1] },
            bell: { freq: 880, duration: 600, pattern: [1, 0.5, 1] },
            chime: { freq: 660, duration: 400, pattern: [1, 0.8, 0.6, 0.4] },
            alarm: { freq: 520, duration: 200, pattern: [1, 1, 1, 1, 1, 1] }
        };

        const config = soundConfigs[this.selectedSound] || soundConfigs.beep;
        this.playPatternedSound(config.freq, config.duration, config.pattern);
    }

    playPatternedSound(baseFreq, duration, pattern) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        let time = ctx.currentTime;

        pattern.forEach((multiplier) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.frequency.value = baseFreq * multiplier;
            osc.type = this.selectedSound === 'bell' ? 'sine' :
                       this.selectedSound === 'chime' ? 'triangle' : 'square';

            osc.connect(gain);
            gain.connect(ctx.destination);

            gain.gain.setValueAtTime(this.volume * 0.15, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration / 1000);

            osc.start(time);
            osc.stop(time + duration / 1000);

            time += (duration / 1000) + 0.05;
        });

        setTimeout(() => ctx.close(), pattern.length * (duration + 50) + 100);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.muteBtn.innerHTML = this.isMuted
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
    }

    beep(freq = 440, duration = 200) {
        // Simple Oscillator Fallback
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);

        gain.gain.value = this.volume * 0.1; // lower volume for synth

        osc.start();
        setTimeout(() => {
            osc.stop();
            ctx.close();
        }, duration);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const timer = new Timer();
});
