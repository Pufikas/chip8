class Speaker {
    constructor() {
        const AudioContext = window.AudioContext;

        this.audioCtx = new AudioContext();

        this.gain = this.audioCtx.createGain();
        this.finish = this.audioCtx.destination;
        this.muted = false;

        this.gain.connect(this.finish);
    }

    mute() {
        this.gain.setValueAtTime(0, this.audioCtx.currentTime);
        this.muted = true;
    }

    unmute() {
        this.gain.setValueAtTime(1, this.audioCtx.currentTime);
        this.muted = false;
    }

    play(freq) {
        if (this.audioCtx && !this.oscillator && !this.muted) {
            this.oscillator = this.audioCtx.createOscillator();

            this.oscillator.frequency.setValueAtTime(freq || 440, this.audioCtx.currentTime);
            this.oscillator.type = "square";

            this.oscillator.connect(this.gain);
            this.oscillator.start();
            
        }
    }

    stop() {
        if (this.oscillator) {
            this.oscillator.stop();
            this.oscillator.disconnect();
            this.oscillator = null;
        }
    }
}

export default Speaker;