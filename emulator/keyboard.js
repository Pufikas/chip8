class Keyboard {
    constructor() {
        this.KEYMAP = {
            "Digit1": 0x1,
            "Digit2": 0x2,
            "Digit3": 0x3,
            "Digit4": 0xC,
            "KeyQ": 0x4,
            "KeyW": 0x5,
            "KeyE": 0x6,
            "KeyR": 0xD,
            "KeyA": 0x7,
            "KeyS": 0x8,
            "KeyD": 0x9,
            "KeyF": 0xE,
            "KeyZ": 0xA,
            "KeyX": 0x0,
            "KeyC": 0xB,
            "KeyV": 0xF
        }

        this.keyPressed = [];
        // some chip8 instructions require waiting for the next keypress
        this.onNextKeyPressed = null;

        window.addEventListener("keydown", this.onKeyDown.bind(this), false);
        window.addEventListener("keyup", this.onKeyUp.bind(this), false);
    }

    isKeyPressed(keyCode) {
        return this.keyPressed[keyCode];
    }

    onKeyUp(e) {
        let key = this.KEYMAP[e.code];
        this.keyPressed[key] = false;
    }

    onKeyDown(e) {
        let key = this.KEYMAP[e.code];
        this.keyPressed[key] = true;

        if (this.onNextKeyPressed !== null && key) {
            this.onNextKeyPressed(parseInt(key));
            this.onNextKeyPressed = null;
        }
    }
}

export default Keyboard;