class Renderer {
    // scale the display up or down and make pixels smaller or larger
    constructor(scale) {
        // screen 64x32
        this.cols = 64;
        this.rows = 32;

        this.scale = scale;
        this.canvas = document.querySelector("canvas");
        this.ctx = this.canvas.getContext("2d");

        this.canvas.width = this.cols * this.scale;
        this.canvas.height = this.rows * this.scale;
    
        this.display = new Array(this.cols * this.rows); // 2048 pixels
    }

    // toggle off/on pixel
    setPixel(x, y) {
        // wrap pixel if it goes out of bounds
        if (x > this.cols) {
            x -= this.cols;
        } else if (x < 0) {
            x += this.cols;
        }

        if (y > this.rows) {
            y -= this.rows;
        } else if (y < 0) {
            y += this.rows;
        }

        let pixelLoc = x + (y * this.cols);

        // XOR, toggle pixel 0 or 1
        this.display[pixelLoc] ^= 1;

        // erases the pixel if it is 0
        return !this.display[pixelLoc];
    }

    render() {
        // clear the canvas each render loop
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
        // loop through all display
        for (let i = 0; i < this.cols * this.rows; i++) {
            let x = (i % this.cols) * this.scale;
            let y = Math.floor(i / this.cols) * this.scale;
        
            // when pixel is on draw it
            if (this.display[i]) {
                this.ctx.fillStyle = "#000";

                this.ctx.fillRect(x, y, this.scale, this.scale);
            }
        }
    }

    clear() {
        this.display = new Array(this.cols * this.rows);
    }

    testRender() {
        this.setPixel(0, 0);
        this.setPixel(6, 2);
    }
}

export default Renderer;