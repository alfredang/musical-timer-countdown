class Timer {
    constructor() {
        // DOM Elements
        this.timeDisplay = document.getElementById('time-display');
        this.timerStatus = document.getElementById('timer-status');
        this.progressRing = document.querySelector('.progress-ring__circle');
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.stopAlarmBtn = document.getElementById('stop-alarm-btn');
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
        // Preview controls
        this.previewing = false;
        this.previewCtx = null;
        this.previewAudio = null;
        this.previewTimeouts = [];

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
        this.stopAlarmBtn.addEventListener('click', () => this.stopAlarmAndReset());

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
        this.previewSoundBtn.addEventListener('click', () => this.togglePreview());
    }

    togglePreview() {
        if (this.previewing) {
            this.stopPreview();
        } else {
            this.previewing = true;
            this.previewTimeouts = [];
            this.playAlarmSound(true);
            this.previewSoundBtn.textContent = 'Stop Preview';
        }
    }

    stopPreview() {
        this.previewing = false;
        // Stop any playing audio element
        if (this.previewAudio) {
            try {
                this.previewAudio.pause();
                this.previewAudio.currentTime = 0;
            } catch (e) {}
            this.previewAudio = null;
        }

        // Clear timeouts and close audio context
        this.previewTimeouts.forEach(id => clearTimeout(id));
        this.previewTimeouts = [];
        if (this.previewCtx) {
            try { this.previewCtx.close(); } catch (e) {}
            this.previewCtx = null;
        }

        this.previewSoundBtn.textContent = 'Preview Sound';
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

        // Update internal state so start() uses the new values
        this.totalSeconds = total;
        this.remainingSeconds = total;

        this.updateDisplay(total, true); // True to not updating ring yet

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

        // Reset everything to 0
        this.totalSeconds = 0;
        this.remainingSeconds = 0;

        this.updateDisplay(0);
        this.syncInputsToTime(0);
        this.presetBtns.forEach(b => b.classList.remove('active'));
        this.updateUIState('idle');
        this.setProgress(100);
    }

    syncInputsToTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (seconds === 0) {
            this.inputInputs.h.value = '';
            this.inputInputs.m.value = '';
            this.inputInputs.s.value = '';
        } else {
            this.inputInputs.h.value = h > 0 ? h.toString().padStart(2, '0') : '';
            this.inputInputs.m.value = (m > 0 || h > 0) ? m.toString().padStart(2, '0') : '';
            this.inputInputs.s.value = s.toString().padStart(2, '0');
        }
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
        this.isAlarming = true;
        this.stopAlarmBtn.classList.remove('hidden');
        this.timerStatus.classList.add('complete');

        if (this.isMuted) return;

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
        this.stopAlarmBtn.classList.add('hidden');
        this.timerStatus.classList.remove('complete');
    }

    stopAlarmAndReset() {
        this.stopAlarm();
        this.totalSeconds = 0;
        this.remainingSeconds = 0;
        this.updateDisplay(0);
        this.syncInputsToTime(0);
        this.updateUIState('idle');
        this.setProgress(100);
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

        // Reset button is always enabled
        this.resetBtn.disabled = false;

        if (state === 'running') {
            this.startBtn.disabled = true;
            this.pauseBtn.disabled = false;
            this.timerStatus.textContent = "Running...";
            this.timerStatus.style.color = "#60a5fa";
        } else if (state === 'paused') {
            this.startBtn.textContent = "Resume";
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.timerStatus.textContent = "Paused";
            this.timerStatus.style.color = "#fbbf24";
        } else if (state === 'idle') {
            this.startBtn.textContent = "Start";
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.timerStatus.textContent = "Ready";
            this.timerStatus.style.color = "#94a3b8";
        } else if (state === 'complete') {
            this.startBtn.textContent = "Start";
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.timerStatus.textContent = "Time's Up!";
            this.timerStatus.style.color = "#ef4444";
            document.title = "Time's Up!";
        }
    }

    // Sound Manager
    loadAudio() {
        // Load audio files, fallback to synth if missing
        this.sounds = {
            click: new Audio('assets/sounds/click.mp3'),
            start: new Audio('assets/sounds/start.mp3'),
            alarm: new Audio('assets/sounds/alarm.mp3'),
            bark: new Audio('assets/sounds/Portugal de Maria Luiza 2.mp3')
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

        // preview flag if provided as first argument
        const isPreview = arguments[0] === true;

        // For preview control we keep references to audio/context/timeouts
        const ctx = new (window.AudioContext || window.webkitAudioContext)();

        switch (this.selectedSound) {
            case 'bell':
                if (isPreview) this.previewCtx = ctx;
                this.playBellSound(ctx);
                break;
            case 'chime':
                if (isPreview) this.previewCtx = ctx;
                this.playChimeSound(ctx);
                break;
            case 'alarm':
                if (isPreview) this.previewCtx = ctx;
                this.playUrgentAlarm(ctx);
                break;
            default:
                // Default maps to the 'bark' audio/synth
                const barkAudio = this.sounds.bark;
                if (barkAudio && !barkAudio.dataset.missing) {
                    // Play the file directly (don't need ctx)
                    if (isPreview) {
                        this.previewAudio = barkAudio;
                        barkAudio.volume = this.volume;
                        barkAudio.currentTime = 0;
                        barkAudio.play().catch(e => console.log('Audio play failed', e));
                        barkAudio.onended = () => { if (this.previewing) this.stopPreview(); };
                    } else {
                        barkAudio.volume = this.volume;
                        barkAudio.currentTime = 0;
                        barkAudio.play().catch(e => console.log('Bark audio failed', e));
                    }
                } else {
                    if (isPreview) this.previewCtx = ctx;
                    this.playBarkSound(ctx);
                }
        }
    }

    playBarkSound(ctx) {
        // Try to play bark audio file first (synth fallback if missing)
        const barkAudio = this.sounds.bark;
        if (barkAudio && !barkAudio.dataset.missing) {
            // When file exists the caller handles playing (so just return)
            return;
        }

        // Fallback: synthesized bark using noise + formants
        let time = ctx.currentTime;

        for (let bark = 0; bark < 3; bark++) {
            const bufferSize = ctx.sampleRate * 0.3;
            const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const noise = ctx.createBufferSource();
            noise.buffer = noiseBuffer;

            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(350, time);
            osc.frequency.exponentialRampToValueAtTime(180, time + 0.08);
            osc.frequency.exponentialRampToValueAtTime(120, time + 0.15);

            const formant1 = ctx.createBiquadFilter();
            formant1.type = 'bandpass';
            formant1.frequency.value = 600;
            formant1.Q.value = 5;

            const formant2 = ctx.createBiquadFilter();
            formant2.type = 'bandpass';
            formant2.frequency.value = 1200;
            formant2.Q.value = 5;

            const oscGain = ctx.createGain();
            const noiseGain = ctx.createGain();
            const masterGain = ctx.createGain();

            osc.connect(formant1);
            formant1.connect(oscGain);
            oscGain.connect(masterGain);

            noise.connect(formant2);
            formant2.connect(noiseGain);
            noiseGain.connect(masterGain);

            masterGain.connect(ctx.destination);

            oscGain.gain.setValueAtTime(0, time);
            oscGain.gain.linearRampToValueAtTime(this.volume * 0.5, time + 0.015);
            oscGain.gain.exponentialRampToValueAtTime(this.volume * 0.3, time + 0.06);
            oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

            noiseGain.gain.setValueAtTime(0, time);
            noiseGain.gain.linearRampToValueAtTime(this.volume * 0.15, time + 0.01);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

            masterGain.gain.value = 1;

            osc.start(time);
            osc.stop(time + 0.2);
            noise.start(time);
            noise.stop(time + 0.2);

            time += 0.35;
        }

        const t = setTimeout(() => {
            try { ctx.close(); } catch (e) {}
            if (this.previewing) this.stopPreview();
        }, 1800);
        if (this.previewing) this.previewTimeouts.push(t);
    }

    playBellSound(ctx) {
        // Rich bell with harmonics
        const baseFreq = 440;
        const harmonics = [1, 2, 3, 4.2, 5.4];
        const time = ctx.currentTime;

        harmonics.forEach((mult, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.frequency.value = baseFreq * mult;
            osc.type = 'sine';
            osc.connect(gain);
            gain.connect(ctx.destination);

            const amplitude = this.volume * 0.2 / (idx + 1);
            gain.gain.setValueAtTime(amplitude, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 1.5);

            osc.start(time);
            osc.stop(time + 1.5);
        });

        const t = setTimeout(() => {
            try { ctx.close(); } catch (e) {}
            if (this.previewing) this.stopPreview();
        }, 2000);
        if (this.previewing) this.previewTimeouts.push(t);
    }

    playChimeSound(ctx) {
        // Descending wind chime pattern
        const notes = [1318.51, 1174.66, 987.77, 880, 783.99]; // E6, D6, B5, A5, G5
        let time = ctx.currentTime;

        notes.forEach((freq) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.frequency.value = freq;
            osc.type = 'triangle';
            osc.connect(gain);
            gain.connect(ctx.destination);

            gain.gain.setValueAtTime(this.volume * 0.25, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);

            osc.start(time);
            osc.stop(time + 0.6);
            time += 0.12;
        });

        const t = setTimeout(() => {
            try { ctx.close(); } catch (e) {}
            if (this.previewing) this.stopPreview();
        }, 1500);
        if (this.previewing) this.previewTimeouts.push(t);
    }

    playUrgentAlarm(ctx) {
        // Urgent two-tone alarm like emergency alert
        const time = ctx.currentTime;

        for (let n = 0; n < 4; n++) {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.frequency.value = 880;
            osc2.frequency.value = 698.46;
            osc1.type = 'square';
            osc2.type = 'square';

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            const startTime = time + (n * 0.25);
            gain.gain.setValueAtTime(this.volume * 0.1, startTime);
            gain.gain.setValueAtTime(0, startTime + 0.12);

            osc1.start(startTime);
            osc1.stop(startTime + 0.12);
            osc2.start(startTime + 0.12);
            osc2.stop(startTime + 0.24);
        }

        const t = setTimeout(() => {
            try { ctx.close(); } catch (e) {}
            if (this.previewing) this.stopPreview();
        }, 1500);
        if (this.previewing) this.previewTimeouts.push(t);
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
