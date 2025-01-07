class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setCanvasSize();
        this.gameStarted = false;
        
        // Add these debug logs
        console.log('Document base URI:', document.baseURI);
        console.log('Attempting to load taco sprite from:', '/assets/taco.png');
        
        // Load all sprites
        this.sprites = {
            players: {
                taco: new Image(),
                wing: new Image()
            },
            sauceDrops: {
                mild: new Image(),
                hot: new Image(),
                extraHot: new Image()
            }
        };

        this.sprites.players.taco.src = 'assets/taco.png';
        this.sprites.players.wing.src = 'assets/wing.png';
        this.sprites.sauceDrops.mild.src = 'assets/milddrip.png';
        this.sprites.sauceDrops.hot.src = 'assets/mediumdrip.png';
        this.sprites.sauceDrops.extraHot.src = 'assets/hotdrip.png';

        // Track loaded state of sprites
        this.spritesReady = {
            players: {
                taco: false,
                wing: false
            },
            sauceDrops: {
                mild: false,
                hot: false,
                extraHot: false
            }
        };

        // Track total sprites to load
        this.totalSprites = 5; // taco + wing + 3 sauce types
        this.loadedSprites = 0;

        // Set up sprite load handlers
        this.sprites.players.taco.onload = () => {
            this.spritesReady.players.taco = true;
            this.handleSpriteLoad();
        };
        this.sprites.players.wing.onload = () => {
            this.spritesReady.players.wing = true;
            this.handleSpriteLoad();
        };
        this.sprites.sauceDrops.mild.onload = () => {
            this.spritesReady.sauceDrops.mild = true;
            this.handleSpriteLoad();
        };
        this.sprites.sauceDrops.hot.onload = () => {
            this.spritesReady.sauceDrops.hot = true;
            this.handleSpriteLoad();
        };
        this.sprites.sauceDrops.extraHot.onload = () => {
            this.spritesReady.sauceDrops.extraHot = true;
            this.handleSpriteLoad();
        };

        // Set up sprite selection handler
        const spriteInputs = document.querySelectorAll('input[name="sprite"]');
        spriteInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.currentSprite = input.value;
            });
        });
        this.currentSprite = 'taco'; // default sprite

        // Set up start button
        const startButton = document.getElementById('start-button');
        startButton.addEventListener('click', () => this.startGame());

        // Initialize game objects but don't start the game loop yet
        this.initializeGame();
    }

    initializeGame() {
        // Move initialization code here from constructor
        this.taco = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 60,
            width: 80,
            height: 60,
            ready: false
        };
        
        this.sauceDrops = [];
        this.score = 0;
        this.level = 1;
        this.levelScore = 0;
        this.scoreToNextLevel = 200;
        this.scoreMultiplier = 1.0;
        
        // Base sauce types - will be modified by level
        this.baseSauceTypes = {
            mild: {
                color: '#ff6b6b',
                width: 15,
                height: 25,
                speedRange: { min: 2, max: 3 },
                points: 1,
                probability: 0.6
            },
            hot: {
                color: '#ff2d2d',
                width: 20,
                height: 30,
                speedRange: { min: 3, max: 4.5 },
                points: 2,
                probability: 0.3
            },
            extraHot: {
                color: '#cc0000',
                width: 25,
                height: 35,
                speedRange: { min: 4, max: 6 },
                points: 5,
                probability: 0.1
            }
        };

        // Initialize sauce types with base values
        this.sauceTypes = JSON.parse(JSON.stringify(this.baseSauceTypes));
        
        // Drop frequency increases with level
        this.dropRate = 0.03;
        
        // Add score animation array
        this.scoreAnimations = [];
        
        // Initialize audio manager
        this.audio = new AudioManager();
    }

    startGame() {
        // Hide start screen
        const startScreen = document.getElementById('start-screen');
        startScreen.style.display = 'none';

        // Start the game
        this.gameStarted = true;
        
        // Add event listeners
        window.addEventListener('resize', () => this.setCanvasSize());
        this.canvas.addEventListener('touchmove', (e) => this.handleTouch(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouse(e));
        
        // Start music and game loop
        this.audio.startMusic();
        this.gameLoop();
    }

    setCanvasSize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.taco.x = touch.clientX - rect.left - this.taco.width / 2;
        this.taco.y = touch.clientY - rect.top - this.taco.height / 2;
    }

    handleMouse(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.taco.x = e.clientX - rect.left - this.taco.width / 2;
        this.taco.y = e.clientY - rect.top - this.taco.height / 2;
    }

    createSauceDrop() {
        if (Math.random() < this.dropRate) {
            // Determine sauce type based on probability
            const random = Math.random();
            let sauceType;
            
            if (random < this.sauceTypes.mild.probability) {
                sauceType = 'mild';
            } else if (random < this.sauceTypes.mild.probability + this.sauceTypes.hot.probability) {
                sauceType = 'hot';
            } else {
                sauceType = 'extraHot';
            }

            const typeProps = this.sauceTypes[sauceType];
            
            this.sauceDrops.push({
                x: Math.random() * (this.canvas.width - typeProps.width),
                y: 0,
                width: typeProps.width,
                height: typeProps.height,
                speed: typeProps.speedRange.min + 
                       Math.random() * (typeProps.speedRange.max - typeProps.speedRange.min),
                type: sauceType,
                points: typeProps.points
            });
        }
    }

    update() {
        // Create new sauce drops
        this.createSauceDrop();

        // Update sauce drops positions
        this.sauceDrops = this.sauceDrops.filter(drop => {
            drop.y += drop.speed;

            // Check collision with taco
            if (this.checkCollision(drop, this.taco)) {
                this.score += drop.points;
                // Play catch sound
                this.audio.playCatchSound(drop.type);
                // Create score animation
                this.scoreAnimations.push({
                    x: drop.x,
                    y: drop.y,
                    points: drop.points,
                    life: 1.0
                });
                return false;
            }

            // Check if drop was missed
            if (drop.y >= this.canvas.height) {
                this.audio.playMissSound();
                return false;
            }

            return true;
        });

        // Update score animations
        this.scoreAnimations = this.scoreAnimations.filter(anim => {
            anim.y -= 1;  // Move up
            anim.life -= 0.02;  // Fade out
            return anim.life > 0;
        });

        // Update level up message if exists
        if (this.levelUpMessage) {
            this.levelUpMessage.life -= 0.016;  // Decrease at 60fps
            if (this.levelUpMessage.life <= 0) {
                this.levelUpMessage = null;
            }
        }

        // Check for level up
        this.updateLevel();
    }

    checkCollision(drop, taco) {
        return drop.x < taco.x + taco.width &&
               drop.x + drop.width > taco.x &&
               drop.y < taco.y + taco.height &&
               drop.y + drop.height > taco.y;
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw player sprite
        if (this.spritesReady.players[this.currentSprite]) {
            this.ctx.drawImage(
                this.sprites.players[this.currentSprite],
                this.taco.x,
                this.taco.y,
                this.taco.width,
                this.taco.height
            );
        } else {
            this.fallbackTacoDraw();
        }

        // Draw sauce drops
        this.sauceDrops.forEach(drop => {
            const sprite = this.sprites.sauceDrops[drop.type];
            if (this.spritesReady.sauceDrops[drop.type]) {
                this.ctx.drawImage(
                    sprite,
                    drop.x,
                    drop.y,
                    drop.width,
                    drop.height
                );
            } else {
                // Fallback to colored triangle if sprite not loaded
                const typeProps = this.sauceTypes[drop.type];
                this.ctx.fillStyle = typeProps.color;
                this.ctx.beginPath();
                this.ctx.moveTo(drop.x + drop.width/2, drop.y);
                this.ctx.lineTo(drop.x + drop.width, drop.y + drop.height);
                this.ctx.lineTo(drop.x, drop.y + drop.height);
                this.ctx.closePath();
                this.ctx.fill();
            }
        });

        // Draw score animations
        this.scoreAnimations.forEach(anim => {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${anim.life})`;
            this.ctx.font = '20px Arial';
            this.ctx.fillText(`+${anim.points}`, anim.x, anim.y);
        });

        // Draw score and level with simplified progress bar
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Score: ${this.score}`, 10, 30);
        this.ctx.fillText(`Level ${this.level}`, 10, 60);
        
        // Draw progress bar directly under level
        const progressWidth = 200;
        const progressHeight = 10;
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(10, 70, progressWidth, progressHeight);
        this.ctx.fillStyle = '#27ae60';
        this.ctx.fillRect(10, 70, 
            (this.levelScore / this.scoreToNextLevel) * progressWidth, 
            progressHeight
        );

        // Draw level up message if exists
        if (this.levelUpMessage) {
            this.ctx.save();
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.levelUpMessage.life})`;
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                this.levelUpMessage.text, 
                this.canvas.width / 2, 
                this.levelUpMessage.y
            );
            this.ctx.restore();
        }
    }

    fallbackTacoDraw() {
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.fillRect(this.taco.x, this.taco.y, this.taco.width, this.taco.height);
    }

    gameLoop() {
        if (!this.gameStarted) return;
        
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    updateLevel() {
        this.levelScore += this.score - this.levelScore;
        
        if (this.levelScore >= this.scoreToNextLevel) {
            this.level++;
            this.levelScore = 0;
            // Make each level require significantly more points
            this.scoreToNextLevel = Math.floor(this.scoreToNextLevel * 1.8);  // Increased from 1.5
            
            // Play level up sound
            this.audio.playLevelUp();
            
            // Increase difficulty
            this.increaseDifficulty();
            
            // Show level up message
            this.showLevelUpMessage();
        }
    }

    increaseDifficulty() {
        // Slower increase in drop rate (cap at 0.08 instead of 0.1)
        this.dropRate = Math.min(0.03 + (this.level - 1) * 0.003, 0.08);

        // Increase speeds and points for all sauce types
        for (let type in this.sauceTypes) {
            const sauce = this.sauceTypes[type];
            const base = this.baseSauceTypes[type];
            
            // More gradual speed increase
            sauce.speedRange.min = Math.min(
                base.speedRange.min * (1 + (this.level - 1) * 0.15),  // Reduced from 0.2
                base.speedRange.min * 2.5  // Reduced max speed multiplier from 3
            );
            sauce.speedRange.max = Math.min(
                base.speedRange.max * (1 + (this.level - 1) * 0.15),  // Reduced from 0.2
                base.speedRange.max * 2.5  // Reduced max speed multiplier from 3
            );
            
            // More gradual points increase
            sauce.points = Math.floor(base.points * (1 + (this.level - 1) * 0.3));  // Reduced from 0.5
        }

        // Adjust sauce probabilities based on level
        if (this.level > 1) {
            // Gradually decrease mild sauce probability and increase others
            this.sauceTypes.mild.probability = Math.max(0.3, this.baseSauceTypes.mild.probability - (this.level - 1) * 0.05);
            this.sauceTypes.hot.probability = Math.min(0.5, this.baseSauceTypes.hot.probability + (this.level - 1) * 0.03);
            this.sauceTypes.extraHot.probability = Math.min(0.2, this.baseSauceTypes.extraHot.probability + (this.level - 1) * 0.02);
            
            // Normalize probabilities to ensure they sum to 1
            const total = this.sauceTypes.mild.probability + 
                         this.sauceTypes.hot.probability + 
                         this.sauceTypes.extraHot.probability;
            
            this.sauceTypes.mild.probability /= total;
            this.sauceTypes.hot.probability /= total;
            this.sauceTypes.extraHot.probability /= total;
        }
    }

    showLevelUpMessage() {
        this.levelUpMessage = {
            text: `Level ${this.level}!`,
            life: 2.0,  // Message will show for 2 seconds
            y: this.canvas.height / 2
        };
    }

    handleSpriteLoad() {
        this.loadedSprites++;
        if (this.loadedSprites >= this.totalSprites) {
            // All sprites loaded, hide loading screen
            const loadingScreen = document.getElementById('loading');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
        }
    }
}

// Initialize game when page loads, but don't start it
window.onload = () => new Game(); 