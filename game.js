class Game {
    constructor() {
        // Define selectDropType directly as a property
        this.selectDropType = () => {
            const random = Math.random();
            let cumulativeProbability = 0;
            
            for (const type in this.sauceTypes) {
                cumulativeProbability += this.sauceTypes[type].probability;
                if (random <= cumulativeProbability) {
                    return type;
                }
            }
            
            return 'mild'; // Fallback
        };

        // Remove the bind since we're using an arrow function
        // this.selectDropType = this.selectDropType.bind(this);
        this.createSauceDrop = this.createSauceDrop.bind(this);
        
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

        // Set up restart button
        const restartButton = document.getElementById('restart-button');
        restartButton.addEventListener('click', () => this.restart());

        // Initialize game objects but don't start the game loop yet
        this.initializeGame();

        this.isPaused = false;
    }

    setPaused(paused) {
        this.isPaused = paused;
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
                width: 20,
                height: 30,
                speedRange: { min: 3, max: 4 },
                points: 1,
                probability: 0.6
            },
            hot: {
                color: '#ff2d2d',
                width: 20,
                height: 30,
                speedRange: { min: 4, max: 5.5 },
                points: 2,
                probability: 0.3
            },
            extraHot: {
                color: '#cc0000',
                width: 20,
                height: 30,
                speedRange: { min: 5, max: 7 },
                points: 3,
                probability: 0.1
            }
        };

        // Increase base drop rate from 0.006 to 0.02 (2% chance per frame)
        this.dropRate = 0.02;

        // Initialize sauce types with base values
        this.sauceTypes = JSON.parse(JSON.stringify(this.baseSauceTypes));
        
        // Add score animation array
        this.scoreAnimations = [];
        
        // In the initializeGame method, add these properties
        this.lives = 3;
        this.missedDrops = 0;
        this.missTimer = 30000; // 30 seconds in milliseconds
        this.lastMissTime = Date.now();

        // In the initializeGame method, add overlay opacity
        this.overlayOpacity = 0;

        // In the initializeGame method, add heart power-up properties
        this.heartPowerup = {
            active: false,
            x: 0,
            y: 0,
            width: 30,
            height: 30,
            speed: 2,
            spawnRate: 0.0003  // 0.03% chance per frame
        };

        // Add these properties to initializeGame method
        this.lifeWarning = {
            active: false,
            opacity: 0,
            message: '',
            timer: 0
        };

        // In the initializeGame method, add these properties
        this.catchStreak = 0;
        this.multiplier = 1;
        this.multiplierActive = false;
        this.requiredStreak = 50;
        this.multiplierTimer = 0;  // Add timer for multiplier duration
        this.multiplierDuration = 30 * 60;  // 30 seconds at 60fps
    }

    startGame() {
        const startScreen = document.getElementById('start-screen');
        startScreen.style.display = 'none';

        this.gameStarted = true;
        
        window.addEventListener('resize', () => this.setCanvasSize());
        this.canvas.addEventListener('touchmove', (e) => this.handleTouch(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouse(e));
        
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
        if (typeof this.selectDropType !== 'function') {
            console.error('selectDropType not properly initialized');
            return;
        }
        
        // Try to spawn heart power-up if not active
        if (!this.heartPowerup.active && Math.random() < this.heartPowerup.spawnRate) {
            const maxX = this.canvas.width - this.heartPowerup.width - 70;
            this.heartPowerup.active = true;
            this.heartPowerup.x = Math.random() * maxX;
            this.heartPowerup.y = 0;
        }

        if (Math.random() < this.dropRate) {
            const sauceType = this.selectDropType();
            const typeProps = this.sauceTypes[sauceType];
            const maxX = this.canvas.width - typeProps.width - 70;
            
            this.sauceDrops.push({
                x: Math.random() * maxX,
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
        if (this.isPaused) return;
        
        // Update heart power-up if active
        if (this.heartPowerup.active) {
            this.heartPowerup.y += this.heartPowerup.speed;
            
            // Check collision with player
            if (this.checkCollision(this.heartPowerup, this.taco)) {
                if (this.lives < 5) {  // Cap at 5 lives
                    this.lives++;
                    // Create score animation for extra life
                    this.scoreAnimations.push({
                        x: this.heartPowerup.x,
                        y: this.heartPowerup.y,
                        points: '+1 LIFE',
                        life: 1.0
                    });
                } else {
                    // Show message that max lives reached
                    this.scoreAnimations.push({
                        x: this.heartPowerup.x,
                        y: this.heartPowerup.y,
                        points: 'MAX LIVES',
                        life: 1.0
                    });
                }
                this.heartPowerup.active = false;
            }
            
            // Remove if missed (without penalty)
            if (this.heartPowerup.y >= this.canvas.height) {
                this.heartPowerup.active = false;
                // No handleMissedDrop() call here
            }
        }

        // Create new sauce drops
        this.createSauceDrop();

        // Update sauce drops positions
        this.sauceDrops = this.sauceDrops.filter(drop => {
            drop.y += drop.speed;

            // Check collision with taco
            if (this.checkCollision(drop, this.taco)) {
                // Increase catch streak
                this.catchStreak++;
                
                // Check if we've reached a new multiplier level (every 50 catches)
                if (this.catchStreak >= this.requiredStreak && this.catchStreak % 50 === 0) {
                    this.multiplierActive = true;
                    this.multiplier = 1 + Math.floor(this.catchStreak / 50);
                    this.multiplierTimer = this.multiplierDuration;  // Reset timer
                    
                    // Create multiplier activation animation
                    this.scoreAnimations.push({
                        x: this.canvas.width / 2,
                        y: this.canvas.height / 2,
                        points: `${this.multiplier}X MULTIPLIER!`,
                        life: 2.0
                    });
                }
                
                // Update multiplier timer if active
                if (this.multiplierActive) {
                    this.multiplierTimer--;
                    if (this.multiplierTimer <= 0) {
                        this.multiplierActive = false;
                        this.multiplier = 1;
                        // Show multiplier expired message
                        this.scoreAnimations.push({
                            x: this.canvas.width / 2,
                            y: this.canvas.height / 2,
                            points: 'MULTIPLIER EXPIRED!',
                            life: 1.0
                        });
                    }
                }
                
                // Apply multiplier to points
                const pointsEarned = drop.points * (this.multiplierActive ? this.multiplier : 1);
                this.score += pointsEarned;
                
                this.scoreAnimations.push({
                    x: drop.x,
                    y: drop.y,
                    points: pointsEarned,
                    life: 1.0
                });
                return false;
            }

            // Check if drop was missed
            if (drop.y >= this.canvas.height) {
                this.handleMissedDrop();
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
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw the background
        this.ctx.fillStyle = '#34495e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw the taco/player
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
            if (this.spritesReady.sauceDrops[drop.type]) {
                this.ctx.drawImage(
                    this.sprites.sauceDrops[drop.type],
                    drop.x,
                    drop.y,
                    drop.width,
                    drop.height
                );
            }
        });

        // Draw game elements (score, lives, progress bar, etc.)
        this.drawGameElements();

        // Draw red overlay based on missed drops
        if (this.overlayOpacity > 0) {
            this.ctx.fillStyle = `rgba(255, 0, 0, ${this.overlayOpacity})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Gradually fade out the overlay
            this.overlayOpacity = Math.max(0, this.overlayOpacity - 0.002);
        }

        // Draw life warning overlay if active
        if (this.lifeWarning.active) {
            // Draw red flash
            this.ctx.fillStyle = `rgba(255, 0, 0, ${this.lifeWarning.opacity * 0.3})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw warning text with smaller font
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.lifeWarning.opacity})`;
            this.ctx.font = 'bold 32px Arial';  // Reduced from 48px to 32px
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.lifeWarning.message, this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.textAlign = 'left';
            
            // Update warning state
            this.lifeWarning.timer--;
            this.lifeWarning.opacity = this.lifeWarning.timer / 60;
            
            if (this.lifeWarning.timer <= 0) {
                this.lifeWarning.active = false;
            }
        }

        // Draw pause overlay if paused
        if (this.isPaused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.textAlign = 'left'; // Reset text align
        }
    }

    drawGameElements() {
        // Draw score animations
        this.scoreAnimations.forEach(anim => {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${anim.life})`;
            this.ctx.font = 'bold 20px Rubik, sans-serif';
            this.ctx.fillText(typeof anim.points === 'string' ? anim.points : `+${anim.points}`, anim.x, anim.y);
        });

        // Draw score and level
        this.ctx.font = 'bold 20px Rubik, sans-serif';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#FFFFFF';

        // Adjust vertical spacing
        const scoreY = 30;
        const levelY = 60;  // Was 70
        const livesY = 110;  // Was 100, increased gap between level and lives

        // Draw text
        const scoreText = `Score: ${this.score}`;
        const levelText = `Level ${this.level}`;
        const padding = 15;
        this.ctx.fillText(scoreText, padding, scoreY);
        this.ctx.fillText(levelText, padding, levelY);

        // Draw lives with updated Y position
        this.ctx.font = '24px Arial';
        const livesX = 10;
        const heartSpacing = 30;
        const heartsPerRow = 10;

        // Draw hearts with wrapping
        for (let i = 0; i < this.lives; i++) {
            const row = Math.floor(i / heartsPerRow);
            const col = i % heartsPerRow;
            this.ctx.fillText('❤️', 
                livesX + (col * heartSpacing), 
                livesY + (row * heartSpacing)
            );
        }

        // Draw heart power-up if active
        if (this.heartPowerup.active) {
            this.ctx.font = '24px Arial';
            this.ctx.fillText('❤️', this.heartPowerup.x, this.heartPowerup.y);
        }

        // Add multiplier display
        if (this.multiplierActive) {
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 24px Rubik, sans-serif';
            const secondsLeft = Math.ceil(this.multiplierTimer / 60);
            this.ctx.fillText(`${this.multiplier}X MULTIPLIER! (${secondsLeft}s)`, 10, 140);
        }

        // Show catch streak when getting close
        if (!this.multiplierActive && this.catchStreak > 30) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.font = '20px Rubik, sans-serif';
            this.ctx.fillText(`Streak: ${this.catchStreak}/${this.requiredStreak}`, 10, 140);
        }

        // Draw progress bar
        const progressBarWidth = 200;
        const progressBarHeight = 20;
        const progressBarX = this.canvas.width - progressBarWidth - 20; // 20px margin from right
        const progressBarY = 20; // 20px from top

        // Draw background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

        // Draw progress
        const progress = this.levelScore / this.scoreToNextLevel;
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillRect(
            progressBarX, 
            progressBarY, 
            progressBarWidth * progress, 
            progressBarHeight
        );

        // Draw border
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

        // Draw level text
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 20px Rubik, sans-serif';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Level ${this.level}`, progressBarX - 10, progressBarY + 16);
        this.ctx.textAlign = 'left'; // Reset text align for other text
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
        // Calculate new level score
        const newLevelScore = this.score - (this.scoreToNextLevel * (this.level - 1));
        
        if (newLevelScore >= this.scoreToNextLevel) {
            this.level++;
            this.levelScore = newLevelScore - this.scoreToNextLevel;
            this.scoreToNextLevel = Math.floor(this.scoreToNextLevel * 2.5);
            
            this.increaseDifficulty();
            this.showLevelUpMessage();
        } else {
            this.levelScore = newLevelScore;
        }
    }

    increaseDifficulty() {
        // Increase maximum drop rate from 0.03 to 0.06
        this.dropRate = Math.min(0.02 + (this.level - 1) * 0.005, 0.06);

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

    // Update handleMissedDrop method to trigger the warning
    handleMissedDrop() {
        // Reset streak and multiplier when a drop is missed
        if (this.multiplierActive) {
            this.scoreAnimations.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                points: 'MULTIPLIER LOST!',
                life: 1.0
            });
        }
        this.catchStreak = 0;
        this.multiplierActive = false;
        this.multiplier = 1;

        const currentTime = Date.now();
        this.missedDrops++;
        
        // Increase overlay opacity based on number of missed drops
        this.overlayOpacity = Math.min(0.3, (this.missedDrops / 10) * 0.3);
        
        // Check if we've missed 10 drops
        if (this.missedDrops >= 10) {
            this.lives--;
            this.missedDrops = 0;  // Reset counter
            
            if (this.lives <= 0) {
                this.gameOver();
            } else {
                // Trigger life lost warning
                this.lifeWarning = {
                    active: true,
                    opacity: 1,
                    message: `${this.lives} ${this.lives === 1 ? 'LIFE' : 'LIVES'} REMAINING!`,
                    timer: 60  // Show warning for 60 frames (about 1 second)
                };
            }
        }
        
        // Reset counter if 30 seconds have passed
        if (currentTime - this.lastMissTime >= this.missTimer) {
            this.missedDrops = 0;
            this.lastMissTime = currentTime;
        }
    }

    // Add gameOver method
    gameOver() {
        this.gameStarted = false;
        const gameOverScreen = document.getElementById('game-over-screen');
        const finalScore = document.getElementById('final-score');
        finalScore.textContent = this.score;
        gameOverScreen.style.display = 'flex';

        // Set up share button
        const shareButton = document.getElementById('share-button');
        shareButton.addEventListener('click', async () => {
            try {
                if (navigator.share) {
                    await navigator.share({
                        title: 'Catch the Heat!',
                        text: `I scored ${this.score} points in Catch the Heat! Can you beat my score?`,
                        url: window.location.href
                    });
                } else {
                    // Fallback for browsers that don't support Web Share API
                    alert('Share not supported on this browser');
                }
            } catch (err) {
                console.log('Error sharing:', err);
            }
        });
    }

    restart() {
        const gameOverScreen = document.getElementById('game-over-screen');
        gameOverScreen.style.display = 'none';
        this.initializeGame();
        this.gameStarted = true;
        this.gameLoop();
    }
}

// Add this after the class definition
console.log('Game class defined'); 