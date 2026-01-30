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

        // Custom Audio Elements
        this.customSoundBtn = document.getElementById('custom-sound-btn');
        this.customUploadSection = document.getElementById('custom-upload-section');
        this.customAudioInput = document.getElementById('custom-audio-input');
        this.uploadAudioBtn = document.getElementById('upload-audio-btn');
        this.customAudioNameSpan = document.getElementById('custom-audio-name');

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
        this.selectedSound = 'dream';
        this.selectedTheme = 'default';
        this.customAudioData = null;
        this.customAudioName = null;
        this.customAudio = null;
        this.alarmInterval = null;
        this.isAlarming = false;
        // Preview controls
        this.previewing = false;
        this.previewCtx = null;
        this.previewAudio = null;
        this.previewTimeouts = [];
        // Active playback trackers (so stopAlarm can cancel everything)
        this.activeContexts = [];
        this.activeTimeouts = [];
        this.activeAudio = null;

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
        this.applyVolumeToAudio();
    }

    loadSettings() {
        const savedSound = this.safeStorageGet('timerSound');
        const savedTheme = this.safeStorageGet('timerTheme');
        const savedCustomAudio = this.safeStorageGet('timerCustomAudio');
        const savedCustomAudioName = this.safeStorageGet('timerCustomAudioName');

        // Load custom audio if saved
        if (savedCustomAudio) {
            this.customAudioData = savedCustomAudio;
            this.customAudioName = savedCustomAudioName || 'Custom Audio';
            this.loadCustomAudioFromData();
        }

        if (savedSound) {
            this.selectedSound = savedSound;
            this.soundOptions.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.sound === savedSound);
            });
            // Show custom upload section if custom is selected
            if (savedSound === 'custom') {
                this.showCustomUploadSection();
            }
        } else {
            // No saved sound: ensure the UI reflects the default `this.selectedSound`
            this.soundOptions.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.sound === this.selectedSound);
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

    loadCustomAudioFromData() {
        if (!this.customAudioData) return;
        this.customAudio = new Audio(this.customAudioData);
        this.customAudio.addEventListener('error', () => {
            this.customAudio.dataset.missing = 'true';
        });
        if (this.customAudioNameSpan) {
            this.customAudioNameSpan.textContent = this.customAudioName;
        }
    }

    showCustomUploadSection() {
        if (this.customUploadSection) {
            this.customUploadSection.classList.remove('hidden');
        }
    }

    hideCustomUploadSection() {
        if (this.customUploadSection) {
            this.customUploadSection.classList.add('hidden');
        }
    }

    handleCustomAudioUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.match(/audio\/(mp3|mpeg)/)) {
            alert('Please select an MP3 file.');
            return;
        }

        // Limit file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            this.customAudioData = event.target.result;
            this.customAudioName = file.name;
            this.loadCustomAudioFromData();
            this.saveSettings();
        };
        reader.readAsDataURL(file);
    }

    saveSettings() {
        this.safeStorageSet('timerSound', this.selectedSound);
        this.safeStorageSet('timerTheme', this.selectedTheme);
        if (this.customAudioData) {
            this.safeStorageSet('timerCustomAudio', this.customAudioData);
            this.safeStorageSet('timerCustomAudioName', this.customAudioName);
        }
    }

    safeStorageGet(key) {
        try {
            return localStorage.getItem(key);
        } catch (err) {
            return null;
        }
    }

    safeStorageSet(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (err) {
            // Storage unavailable (e.g., file:// sandbox); silently ignore.
        }
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
            this.handleVolumeChange(e.target.value, false);
        });
        this.volumeSlider.addEventListener('change', (e) => {
            this.handleVolumeChange(e.target.value, true);
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

                // Show/hide custom upload section
                if (btn.dataset.sound === 'custom') {
                    this.showCustomUploadSection();
                } else {
                    this.hideCustomUploadSection();
                }

                this.saveSettings();
            });
        });

        // Custom Audio Upload
        if (this.uploadAudioBtn) {
            this.uploadAudioBtn.addEventListener('click', () => {
                this.customAudioInput.click();
            });
        }

        if (this.customAudioInput) {
            this.customAudioInput.addEventListener('change', (e) => {
                this.handleCustomAudioUpload(e);
            });
        }

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
            // Silent mode has no sound to preview
            if (this.selectedSound === 'silent') {
                this.previewSoundBtn.textContent = 'No Sound';
                setTimeout(() => {
                    this.previewSoundBtn.textContent = 'Preview Sound';
                }, 1000);
                return;
            }
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

        // Silent mode - no audio plays
        if (this.selectedSound === 'silent') return;

        // Muted - no audio plays
        if (this.isMuted) return;

        const alarmAudio = this.getSelectedSoundAudio();
        if (alarmAudio) {
            this.startLoopingAlarm(alarmAudio);
            return;
        }

        // Fallback to repeating synth when audio files are missing
        this.playAlarmSound();
        this.alarmInterval = setInterval(() => {
            if (this.isAlarming && !this.isMuted && this.selectedSound !== 'silent') {
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
        // Pause/rewind any HTMLAudio elements
        if (this.sounds) {
            Object.values(this.sounds).forEach(a => {
                try { a.pause(); a.currentTime = 0; } catch (e) {}
            });
        }

        // Stop custom audio
        if (this.customAudio) {
            try { this.customAudio.pause(); this.customAudio.currentTime = 0; } catch (e) {}
        }

        // Stop any active audio that was started by playAlarmSound
        if (this.activeAudio) {
            try {
                this.activeAudio.loop = false;
                this.activeAudio.pause();
                this.activeAudio.currentTime = 0;
            } catch (e) {}
            this.activeAudio = null;
        }

        // Clear scheduled timeouts and close audio contexts
        this.activeTimeouts.forEach(id => clearTimeout(id));
        this.activeTimeouts = [];
        this.activeContexts.forEach(ctx => { try { ctx.close(); } catch (e) {} });
        this.activeContexts = [];

        // Also stop any preview state
        if (this.previewing) this.stopPreview();
        if (this.previewCtx) { try { this.previewCtx.close(); } catch (e) {} this.previewCtx = null; }
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
        document.title = `${str} - Musical Class Break Timer`;

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
            dream: new Audio('assets/sounds/Dream.mp3'),
            inspire: new Audio('assets/sounds/Inspire.mp3'),
            wing: new Audio('assets/sounds/Wing.mp3'),
            morning: new Audio('assets/sounds/Morning.mp3')
        };

        // Error handling and preloading for audio files
        Object.values(this.sounds).forEach(audio => {
            audio.addEventListener('error', () => {
                audio.dataset.missing = 'true';
            });
            // Preload the audio
            audio.preload = 'auto';
            audio.load();
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
        if (this.selectedSound === 'silent') return;

        // preview flag if provided as first argument
        const isPreview = arguments[0] === true;

        // For preview control we keep references to audio/context/timeouts
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        // track context so we can close it if alarm is stopped
        this.activeContexts.push(ctx);

        switch (this.selectedSound) {
            case 'custom': {
                const a = this.customAudio;
                if (a && !a.dataset.missing) {
                    if (isPreview) { this.previewAudio = a; a.volume = this.volume; a.currentTime = 0; a.play().catch(()=>{}); a.onended = () => { if (this.previewing) this.stopPreview(); }; }
                    else { this.activeAudio = a; a.volume = this.volume; a.currentTime = 0; a.play().catch(()=>{}); a.onended = () => { this.activeAudio = null; }; }
                } else {
                    // No custom audio uploaded, fallback to chime
                    if (isPreview) this.previewCtx = ctx;
                    this.playChimeSound(ctx);
                }
                break;
            }
            case 'dream': {
                const a = this.sounds.dream;
                if (a && !a.dataset.missing) {
                    if (isPreview) { this.previewAudio = a; a.volume = this.volume; a.currentTime = 0; a.play().catch(()=>{}); a.onended = () => { if (this.previewing) this.stopPreview(); }; }
                    else { this.activeAudio = a; a.volume = this.volume; a.currentTime = 0; a.play().catch(()=>{}); a.onended = () => { this.activeAudio = null; }; }
                } else {
                    if (isPreview) this.previewCtx = ctx;
                    this.playChimeSound(ctx);
                }
                break;
            }
            case 'inspire': {
                const a = this.sounds.inspire;
                if (a && !a.dataset.missing) {
                    if (isPreview) { this.previewAudio = a; a.volume = this.volume; a.currentTime = 0; a.play().catch(()=>{}); a.onended = () => { if (this.previewing) this.stopPreview(); }; }
                    else { this.activeAudio = a; a.volume = this.volume; a.currentTime = 0; a.play().catch(()=>{}); a.onended = () => { this.activeAudio = null; }; }
                } else {
                    if (isPreview) this.previewCtx = ctx;
                    this.playBellSound(ctx);
                }
                break;
            }
            case 'wing': {
                const a = this.sounds.wing;
                if (a && !a.dataset.missing) {
                    if (isPreview) { this.previewAudio = a; a.volume = this.volume; a.currentTime = 0; a.play().catch(()=>{}); a.onended = () => { if (this.previewing) this.stopPreview(); }; }
                    else { this.activeAudio = a; a.volume = this.volume; a.currentTime = 0; a.play().catch(()=>{}); a.onended = () => { this.activeAudio = null; }; }
                } else {
                    if (isPreview) this.previewCtx = ctx;
                    this.playBarkSound(ctx);
                }
                break;
            }
            default:
                // fallback to chime
                if (isPreview) this.previewCtx = ctx;
                this.playChimeSound(ctx);
        }
    }

    getSelectedSoundAudio() {
        // Silent mode - no audio
        if (this.selectedSound === 'silent') {
            return null;
        }

        // Handle custom audio
        if (this.selectedSound === 'custom') {
            if (this.customAudio && !this.customAudio.dataset.missing) {
                return this.customAudio;
            }
            return null;
        }

        const audio = this.sounds ? this.sounds[this.selectedSound] : null;
        if (!audio || audio.dataset.missing) return null;
        return audio;
    }

    startLoopingAlarm(audio) {
        this.activeAudio = audio;
        audio.loop = true;
        audio.volume = this.volume;
        audio.currentTime = 0;

        // Try to play the audio, with retry on failure
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch((error) => {
                console.log('Audio play failed, retrying...', error);
                // Retry after a short delay (helps with autoplay restrictions)
                setTimeout(() => {
                    audio.play().catch(() => {
                        // Final fallback to synth alarm
                        this.playAlarmSound();
                        this.alarmInterval = setInterval(() => {
                            if (this.isAlarming && !this.isMuted && this.selectedSound !== 'silent') {
                                this.playAlarmSound();
                            }
                        }, 2000);
                    });
                }, 100);
            });
        }
    }

    applyVolumeToAudio() {
        if (this.sounds) {
            Object.values(this.sounds).forEach(audio => {
                try { audio.volume = this.volume; } catch (e) {}
            });
        }

        if (this.customAudio) {
            try { this.customAudio.volume = this.volume; } catch (e) {}
        }

        if (this.activeAudio) {
            try { this.activeAudio.volume = this.volume; } catch (e) {}
        }

        if (this.previewAudio) {
            try { this.previewAudio.volume = this.volume; } catch (e) {}
        }
    }

    playBarkSound(ctx) {
        // track ctx so stopAlarm can close it
        this.activeContexts.push(ctx);
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
        this.activeTimeouts.push(t);
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
        this.activeTimeouts.push(t);
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
        this.activeTimeouts.push(t);
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
        this.activeTimeouts.push(t);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.muteBtn.innerHTML = this.isMuted
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
    }

    handleVolumeChange(value, playFeedback) {
        const nextVolume = Math.min(1, Math.max(0, parseFloat(value)));
        if (Number.isNaN(nextVolume)) return;
        this.volume = nextVolume;
        this.applyVolumeToAudio();
        if (playFeedback) {
            this.playSound('click');
        }
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
