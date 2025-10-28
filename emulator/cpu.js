class CPU {
    constructor(renderer, keyboard, speaker) {
        this.renderer = renderer;
        this.keyboard = keyboard;
        this.speaker = speaker;

        // 4KB
        this.memory = new Uint8Array(4096);

        // 16 8bit registers
        this.v = new Uint8Array(16);

        // stores mem addresses
        this.i = 0;

        this.delayTimer = 0;
        this.soundTimer = 0;

        // prgoram counter, stores the current executing address
        this.pc = 0x200;

        this.stack = new Array();

        // for some instructions that need to be paused, (Fx0A)
        this.paused = false;

        this.speed = 10;
    }

    loadSpritesIntoMemory() {
        // hex values for each sprite, each sprite is 5 bytes.
        const sprites = [
            0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
            0x20, 0x60, 0x20, 0x20, 0x70, // 1
            0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
            0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
            0x90, 0x90, 0xF0, 0x10, 0x10, // 4
            0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
            0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
            0xF0, 0x10, 0x20, 0x40, 0x40, // 7
            0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
            0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
            0xF0, 0x90, 0xF0, 0x90, 0x90, // A
            0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
            0xF0, 0x80, 0x80, 0x80, 0xF0, // C
            0xE0, 0x90, 0x90, 0x90, 0xE0, // D
            0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
            0xF0, 0x80, 0xF0, 0x80, 0x80  // F
        ];

        // stored it in memory starting at hex 0x000
        for (let i = 0; i < sprites.length; i++) {
            this.memory[i] = sprites[i];
        }
    }

    loadProgramIntoMemory(program) {
        // most chip8 programs start at location 0x200
        // load all sprites from 0x200 from ROM
        for (let loc = 0; loc < program.length; loc++) {
            this.memory[0x200 + loc] = program[loc];
        }
    }

    loadRom(name) {
        let req = new XMLHttpRequest;
        let self = this;

        req.onload = function() {
            if (req.response) {
                let program = new Uint8Array(req.response);
                self.loadProgramIntoMemory(program);
            }
        }

        req.open('GET', 'roms/' + name);
        req.responseType = 'arraybuffer';

        req.send();
        console.log(req)
    }

    updateTimers() {
        if (this.delayTimer > 0) {
            this.delayTimer -= 1;
        }

        if (this.soundTimer > 0) {
            this.soundTimer -= 1;
        }
    }

    playSound() {
        if (this.soundTimer > 0) {
            this.speaker.play(440); // freq 440
        } else {
            this.speaker.stop();
        }
    }

    executeInstruction(opcode) {
        // increment the program counter, each instruction is 2 bytes long
        this.pc += 2;
        /*
            opcode = 0x5460
            high byte => 0x54
            low byte => 0x60
            lower 4 bits => 0x4
            upper 4 bits => 0x6  
        */

        let x = (opcode & 0x0F00) >> 8;
        let y = (opcode & 0x00F0) >> 4;

        switch (opcode & 0xF000) {
            case 0x0000:
                switch (opcode) {
                    case 0x00E0: // CLS (clear the display)
                        this.renderer.clear();
                        break;
                    case 0x00EE: // RET (return from a subroutine)
                        this.pc = this.stack.pop();
                        // "subtracts 1 from the stack pointer", is skipped because
                        // stack pointer is used to point to the topmost level of the stack
                        // but our stack array is already handled by the array itself
                        break;
                }
                break;
            case 0x1000: // 1nnn JP addr
                this.pc = (opcode & 0xFFF);
                // 0xFFF grabs the value of nnn, so (0x1426 & 0xFFF) gives 0x426
                break;
            case 0x2000: // 2nnn CALL addr
                this.stack.push(this.pc);
                this.pc = (opcode & 0xFFF);
                break;
            case 0x3000: // 3xkk SE Vx, byte (V is register)
                if (this.v[x] === (opcode & 0xFF)) {
                    this.pc += 2;
                }
                break;
            case 0x4000: // 4xkk SNE Vx, byte
                if (this.v[x] !== (opcode & 0xFF)) {
                    this.pc += 2;
                }
                break;
            case 0x5000: // 5xy0 SE Vx, Vy
                if (this.v[x] === this.v[y]) {
                    this.pc += 2;
                }
                break;
            case 0x6000: // 6xkk LD Vx, byte
                this.v[x] = (opcode & 0xFF)
                break;
            case 0x7000: // ADD Vxm byte
                this.v[x] += (opcode & 0xFF);
                break;
            case 0x8000:
                // for last nibble that ends with a value 0-7 or E
                switch (opcode & 0xF) {
                    case 0x0: // 8xy0 LD Vx, Vy
                        this.v[x] = this.v[y];
                        break;
                    case 0x1: // 8xy1 OR Vx, Vy
                        this.v[x] |= this.v[y];
                        break;
                    case 0x2: // 8xy2 AND Vx, Vy
                        this.v[x] &= this.v[y];
                        break;
                    case 0x3: // 8xy3 XOR Vx, Vy
                        this.v[x] ^= this.v[y];
                        break;
                    case 0x4: // 8xy4 - ADD Vx, Vy
                        // add only if the result is greater then 8 bits VF(carry) is set to 1 else 0
                        // only lowest 8 bits of results are kept, stored in Vx
                        let sum = (this.v[x] += this.v[y]);
                        this.v[0xF] = 0; // VF

                        if (sum > 0xFF) { // sum > 255
                            this.v[0xF] = 1; 
                        }

                        /* "only the lowest 8 bits of the result are kept, and stored in Vx"
                            this.v is a Uint8Array so any value over 8 bits automatically has the lower
                            adding 257 into this.v new value would be 100000001 (9bit)
                            it then takes the lower 8 bits in this case 00000001 which is 1
                         */
                        break;
                    case 0x5: // 8xy5 SUB Vx, Vy
                        this.v[0xF] = 0;

                        if (this.v[x] > this.v[y]) {
                            this.v[0xF] = 1;
                        }
                        
                        this.v[x] -= this.v[y];
                        
                        break;
                    case 0x6: // 8xy6 SHR Vx {, Vy}
                        this.v[0xF] = (this.v[x] & 0x1); // least-significant bit
                        this.v[x] >>= 1;
                        break;
                    case 0x7: // 8xy7 SUBN Vx, Vy
                        this.v[0xF] = 0;

                        if (this.v[y] > this.v[x]) {
                            this.v[0xF] = 1;
                        }
                        this.v[x] = this.v[y] - this.v[x];

                        break;
                    case 0xE: // 8xyE SHL Vx {, Vy}
                        this.v[0xF] = (this.v[x] & 0x80); // most-significant bit
                        this.v[x] <<= 1;
                        break;
                }

                break;
            case 0x9000: // 9xy0 SNE Vx, Vy
                if (this.v[x] !==  this.v[y]) {
                    this.pc += 2;
                }
                break;
            case 0xA000: // Annn  LD I, addr
                // if opcode is 0xA740 this returns 0x740
                this.i = (opcode & 0xFFF);
                break;
            case 0xB000: // Bnnn JP V0, addr
                this.pc = (opcode & 0xFFF) + this.v[0];
                break;
            case 0xC000: // Cxkk RND Vx, byte
                let rand = Math.floor(Math.random() * 0xFF); // 0 - 255
                this.v[x] = rand & (opcode & 0xFF);
                break;
            case 0xD000: // DRW Vx, Vy, nibble
                let width = 8; // sprite is 8 pixels wide
                let height = (opcode & 0xF); // last nibble of of opcode (0xD235 => 5)

                this.v[0xF] = 0;

                for (let row = 0; row < height; row++) {
                    let sprite = this.memory[this.i + row];

                    for (let col = 0; col < width; col++) {
                        // if sprite is not 0, render/erase the pixel
                        if ((sprite & 0x80) > 0) {
                            // if setPixel returns 1, this means pixel was erased setting VF = 1
                            if (this.renderer.setPixel(this.v[x] + col, this.v[y] + row)) {
                                this.v[0xF] = 1;
                            }
                        }

                        // shift the sprite left 1
                        // 10010000 << 1 will become 0010000
                        sprite <<= 1;
                    }
                }

                break;
            case 0xE000:
                switch (opcode & 0xFF) {
                    case 0x9E: // Ex9E SKP Vx
                        if (this.keyboard.isKeyPressed(this.v[x])) {
                            this.pc += 2;
                        }
                        break;
                    case 0xA1: // ExA1 SKNP Vx
                        if (!this.keyboard.isKeyPressed(this.v[x])) {
                            this.pc += 2;
                        }
                        break;
                }

                break;
            case 0xF000:
                switch (opcode & 0xFF) {
                    case 0x07: // Fx07 LD Vx, DT
                        this.v[x] = this.delayTimer;
                        break;
                    case 0x0A: // Fx0A LD Vx, K
                        this.paused = true;

                        this.keyboard.onNextKeyPress = function(key) {
                            this.v[x] = key;
                            this.paused = false;
                        }.bind(this);
                        break;
                    case 0x15: // Fx15 LD DT, Vx
                        this.delayTimer = this.v[x];
                        break;
                    case 0x18: // Fx18 LD ST, Vx
                        this.soundTimer = this.v[x];
                        break;
                    case 0x1E: // Fx1E ADD I, Vx
                        this.i += this.v[x];
                        break;
                    case 0x29: // Fx29 LD F, Vx
                        this.i = this.v[x] * 5; // *5 because each sprite is 5 bytes long
                        break;
                    case 0x33: // Fx33 LD B, Vx
                        // grab hundreds, tens and ones digit from register Vx
                        this.memory[this.i] = parseInt(this.v[x] / 1000);
                        this.memory[this.i + 1] = parseInt((this.v[x] % 100) / 10);
                        this.memory[this.i + 2] = parseInt(this.v[x] % 10);
                        break;
                    case 0x55: // Fx55 LD [I], Vx
                        // loop through registers V0 through Vx and store it
                        for (let regI = 0; regI <= x; regI++) {
                            this.memory[this.i + regI] = this.v[regI];
                        }
                        break;
                    case 0x65: // Fx65 LD Vx, [I]
                        for (let regI = 0; regI <= x; regI++) {
                            this.v[regI] = this.memory[this.i + regI];
                        }
                        break;
                }

                break;

            default:
                throw new Error('Unknown opcode ' + opcode);
        }
    }

    cycle() {
        for (let i = 0; i < this.speed; i++) {
            if (!this.paused) {
                // bitwise operation
                // because of "All instructions are 2 bytes long and are stored most-significant-byte first."
                // need to combine two pieces of memory to get full opcode
                // 0x1000 | 0xF0 = 0x10F0
                let opcode = (this.memory[this.pc] << 8 | this.memory[this.pc + 1]);
                this.executeInstruction(opcode);
            };
        }
        
        if (!this.paused) {
            this.updateTimers();
        }

        this.playSound();
        this.renderer.render();
    }

}

export default CPU;