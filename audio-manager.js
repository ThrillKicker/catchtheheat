class AudioManager {
    constructor() {
        try {
            this.sounds = {
                music: new Audio('assets/background-music.mp3'),
                catch: {
                    mild: new Audio('assets/catch-mild.mp3'),
                    hot: new Audio('assets/catch-hot.mp3'),
                    extraHot: new Audio('assets/catch-extra-hot.mp3')
                },
                miss: new Audio('assets/miss.mp3'),
                levelUp: new Audio('assets/level-up.mp3')
            };

            // Set up music
            this.sounds.music.loop = true;
        } catch (error) {
            console.log("Audio initialization failed:", error);
            // Create dummy audio objects if files are missing
            this.sounds = {
                music: { play: () => {}, volume: 1, muted: false },
                catch: {
                    mild: { play: () => {}, volume: 1 },
                    hot: { play: () => {}, volume: 1 },
                    extraHot: { play: () => {}, volume: 1 }
                },
                miss: { play: () => {}, volume: 1 },
                levelUp: { play: () => {}, volume: 1 }
            };
        }

        // Initialize volume levels
        this.musicVolume = 0.5;
        this.sfxVolume = 0.7;
        this.musicMuted = false;
        this.sfxMuted = false;

        // Set up controls
        this.setupControls();
    }

    setupControls() {
        // Music controls
        const musicMute = document.getElementById('musicMute');
        const musicVolume = document.getElementById('musicVolume');
        
        musicMute.addEventListener('click', () => {
            this.musicMuted = !this.musicMuted;
            this.sounds.music.muted = this.musicMuted;
            musicMute.classList.toggle('muted');
        });

        musicVolume.addEventListener('input', (e) => {
            this.musicVolume = e.target.value / 100;
            this.sounds.music.volume = this.musicVolume;
        });

        // SFX controls
        const sfxMute = document.getElementById('sfxMute');
        const sfxVolume = document.getElementById('sfxVolume');
        
        sfxMute.addEventListener('click', () => {
            this.sfxMuted = !this.sfxMuted;
            sfxMute.classList.toggle('muted');
        });

        sfxVolume.addEventListener('input', (e) => {
            this.sfxVolume = e.target.value / 100;
        });
    }

    startMusic() {
        this.sounds.music.play().catch(error => {
            console.log("Audio playback failed:", error);
        });
    }

    playCatchSound(sauceType) {
        if (!this.sfxMuted) {
            const sound = this.sounds.catch[sauceType];
            sound.volume = this.sfxVolume;
            sound.currentTime = 0;
            sound.play().catch(error => {
                console.log("Audio playback failed:", error);
            });
        }
    }

    playMissSound() {
        if (!this.sfxMuted) {
            this.sounds.miss.volume = this.sfxVolume;
            this.sounds.miss.currentTime = 0;
            this.sounds.miss.play().catch(error => {
                console.log("Audio playback failed:", error);
            });
        }
    }

    playLevelUp() {
        if (!this.sfxMuted) {
            this.sounds.levelUp.volume = this.sfxVolume;
            this.sounds.levelUp.currentTime = 0;
            this.sounds.levelUp.play().catch(error => {
                console.log("Audio playback failed:", error);
            });
        }
    }
} 