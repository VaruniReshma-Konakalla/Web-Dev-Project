window.addEventListener('load', function() {
    // Canvas setup
    const canvas = document.getElementById('canvas1');
    const ctx = canvas.getContext('2d'); // Drawing context [4]
    canvas.width = 700; // Final game width
    canvas.height = 500;
    
    // --- 1. Input Handler Class (Handles user key presses/releases) [8] ---
    class InputHandler {
        constructor(game) {
            this.game = game;

            window.addEventListener('keydown', e => {
                const key = e.key;
                
                // Add key only if it's Arrow Up/Down and not already present [9]
                if ((key === 'ArrowUp' || key === 'ArrowDown') && this.game.keys.indexOf(key) === -1) { 
                    this.game.keys.push(key);
                } 
                // Handle Spacebar for shooting [10]
                else if (key === ' ') { 
                    this.game.player.shootTop();
                }
                // Toggle Debug mode [11]
                else if (key === 'd') {
                    this.game.debug = !this.game.debug;
                }
            });

            window.addEventListener('keyup', e => {
                const key = e.key;
                const index = this.game.keys.indexOf(key);
                
                // Remove key if it exists in the array [12]
                if (index > -1) { 
                    this.game.keys.splice(index, 1); 
                }
            });
        }
    }
    
    // --- 2. Projectile Class (Player's laser attack) [13] ---
    class Projectile {
        constructor(game, x, y) {
            this.game = game;
            this.x = x;
            this.y = y;
            this.width = 36; 
            this.height = 10;
            this.speed = 5;
            this.markedForDeletion = false; 
            this.image = document.getElementById('projectile'); // Load projectile image [14]
        }
        
        update() {
            this.x += this.speed;
            // Mark for deletion if it moves past 80% of the screen [15]
            if (this.x > this.game.width * 0.8) { 
                this.markedForDeletion = true;
            }
        }
        
        draw(context) {
            context.drawImage(this.image, this.x, this.y); 
        }
    }

    // --- 3. Particle Class (Falling mechanical debris/gears) [16] ---
    class Particle {
        constructor(game, x, y) {
            this.game = game;
            this.x = x;
            this.y = y;
            this.image = document.getElementById('gears'); // Load gears sprite sheet [16]
            this.frameX = Math.floor(Math.random() * 3); // Randomly choose image column (0-2) [17]
            this.frameY = Math.floor(Math.random() * 3); // Randomly choose image row (0-2) [17]
            this.spriteSize = 50; 
            this.sizeModifier = (Math.random() * 0.5 + 0.5); 
            this.size = this.spriteSize * this.sizeModifier;
            this.speedX = Math.random() * 6 - 3; // Horizontal speed: -3 to +3 [18]
            this.speedY = Math.random() * -15; // Vertical speed: always starts upward [18]
            this.gravity = 0.5; // [18]
            this.markedForDeletion = false;
            this.angle = 0; 
            this.va = Math.random() * 0.2 - 0.1; // Velocity of angle (rotation speed) [18]
            this.bounced = 0; // Tracks number of bounces [19]
            this.bottomBoundary = Math.random() * 80 + 60; // Random bounce height (60-140 pixels) [19, 20]
        }
        
        update() {
            this.angle += this.va; // Update rotation [21]
            this.speedY += this.gravity; // Apply gravity [21]
            this.x += this.speedX - this.game.speed; // Move horizontally, accounting for game speed [22]
            this.y += this.speedY; 

            // Bounce logic [19, 23]
            if (this.y > this.game.height - this.bottomBoundary && this.bounced < 2) { 
                this.bounced++;
                this.speedY *= -0.5; // Reverse vertical speed and dampen it 
            }
            
            // Mark for deletion if off screen [21]
            if (this.y > this.game.height || this.x < 0 - this.size) {
                this.markedForDeletion = true;
            }
        }
        
        draw(context) {
            context.save(); // Save canvas state for rotation [24]
            // Translate origin (0,0) to particle center for rotation [24, 25]
            context.translate(this.x + this.size/2, this.y + this.size/2);
            context.rotate(this.angle);

            // Draw cropped sprite frame [26]
            context.drawImage(this.image, 
                this.frameX * this.spriteSize, this.frameY * this.spriteSize, 
                this.spriteSize, this.spriteSize, 
                -this.size/2, -this.size/2, // Destination X, Y (centered on translated origin) [22]
                this.size, this.size
            );

            context.restore(); // Restore canvas state [24]
        }
    }

    // --- 4. Player Class (The main character, seahorse sentinel) [7, 27] ---
    class Player {
        constructor(game) {
            this.game = game;
            this.width = 120; // Sprite frame width [28]
            this.height = 190; // Sprite frame height [28]
            this.x = 20; 
            this.y = 100;
            this.speedY = 0; // Current vertical speed [29]
            this.maxSpeed = 2; // Maximum vertical speed [13]
            this.projectiles = []; // Array of active projectile objects [10]
            this.image = document.getElementById('seahorse'); // Load player image [27]
            this.frameX = 0;
            this.frameY = 0;
            this.maxFrame = 37; // Max frame for swimming animation [30]
            this.powerUp = false; // Power up state [31]
            this.powerUpTimer = 0;
            this.powerUpLimit = 10000; // 10 seconds [31]
        }
        
        update(deltaTime) {
            // Power Up Logic [31, 32]
            if (this.powerUp) {
                if (this.powerUpTimer > this.powerUpLimit) {
                    this.powerUpTimer = 0;
                    this.powerUp = false;
                    this.frameY = 0; // Return to default animation row [31]
                } else {
                    this.powerUpTimer += deltaTime;
                    this.frameY = 1; // Use powerup animation row [32]
                    this.game.ammo += 0.1; // Fast ammo recharge [32]
                }
            }

            // Input handling and movement [13, 33]
            if (this.game.keys.includes('ArrowUp')) {
                this.speedY = -this.maxSpeed;
            } else if (this.game.keys.includes('ArrowDown')) {
                this.speedY = this.maxSpeed;
            } else {
                this.speedY = 0;
            }
            this.y += this.speedY; // Apply vertical movement [29]
            
            // Vertical Boundaries [34]
            if (this.y > this.game.height - this.height * 0.5) {
                this.y = this.game.height - this.height * 0.5;
            } else if (this.y < -this.height * 0.5) {
                this.y = -this.height * 0.5;
            }

            // Update projectiles [35]
            this.projectiles.forEach(projectile => projectile.update());
            this.projectiles = this.projectiles.filter(p => !p.markedForDeletion); 

            // Sprite Animation Logic [30]
            if (this.frameX < this.maxFrame) {
                this.frameX++;
            } else {
                this.frameX = 0;
            }
        }
        
        draw(context) {
            // Draw hitbox if debug mode is active [11]
            if (this.game.debug) {
                context.strokeStyle = 'black';
                context.strokeRect(this.x, this.y, this.width, this.height);
            }
            
            // Draw player sprite sheet frame (9 arguments) [36, 37]
            context.drawImage(this.image, 
                this.frameX * this.width, this.frameY * this.height, // Source X, Y
                this.width, this.height,                             // Source Width, Height
                this.x, this.y,                                      // Destination X, Y
                this.width, this.height
            );
        }
        
        shootTop() {
            // Check if ammo is available [38]
            if (this.game.ammo > 0) {
                // Creates new projectile starting near the player's mouth (x+80, y+30 offset)
                this.projectiles.push(new Projectile(this.game, this.x + 80, this.y + 30)); 
                this.game.ammo--;
            }
            // If in powerup mode, also shoot from the tail [39]
            if (this.powerUp) {
                this.shootBottom();
            }
        }

        shootBottom() {
            // Creates second projectile starting near the player's tail [39]
            if (this.game.ammo > 0) {
                 this.projectiles.push(new Projectile(this.game, this.x + 80, this.y + 175)); 
            }
        }

        // Method called when colliding with a lucky fish [40]
        enterPowerUp() {
            this.powerUpTimer = 0;
            this.powerUp = true;
            // Refill ammo only if current ammo is less than max ammo [20]
            if (this.game.ammo < this.game.maxAmmo) { 
                this.game.ammo = this.game.maxAmmo;
            }
        }
    }
    
    // --- 5. Layer Class (Single Parallax Layer) [3] ---
    class Layer {
        constructor(game, image, speedModifier) {
            this.game = game;
            this.image = image;
            this.speedModifier = speedModifier;
            this.width = 1768; // Image source width [3]
            this.height = 500;
            this.x = 0;
            this.y = 0;
        }

        update() {
            // Calculate movement speed [41]
            const speed = this.game.speed * this.speedModifier; 
            this.x -= speed;

            // Seamless scrolling logic: if image scrolls off screen, reset X to 0 [42, 43]
            if (this.x < -this.width) {
                this.x = 0; 
            }
        }

        draw(context) {
            // Draw the first image [44]
            context.drawImage(this.image, this.x, this.y, this.width, this.height);
            // Draw a second identical image immediately next to the first one for seamless scrolling [42]
            context.drawImage(this.image, this.x + this.width, this.y, this.width, this.height); 
        }
    }

    // --- 6. Background Class (Manages all four layers) [44] ---
    class Background {
        constructor(game) {
            this.game = game;
            
            // Get image elements from HTML
            this.image1 = document.getElementById('layer1');
            this.image2 = document.getElementById('layer2');
            this.image3 = document.getElementById('layer3');
            this.image4 = document.getElementById('layer4');
            
            // Create layer objects with varying speed modifiers for parallax effect [43, 45]
            this.layer1 = new Layer(this.game, this.image1, 0.2);
            this.layer2 = new Layer(this.game, this.image2, 0.4);
            this.layer3 = new Layer(this.game, this.image3, 1); 
            this.layer4 = new Layer(this.game, this.image4, 1.5); 
            
            // Only layers 1, 2, 3 are included in the main background array [46]
            this.layers = [this.layer1, this.layer2, this.layer3]; 
        }

        update() {
            this.layers.forEach(layer => layer.update());
        }

        draw(context) {
            this.layers.forEach(layer => layer.draw(context));
        }
    }
    
    // --- 7. UI Class (User Interface, score, timer, ammo) [47] ---
    class UI {
        constructor(game) {
            this.game = game;
            this.fontSize = 25;
            this.fontFamily = 'Bangers'; 
            this.color = 'white';
        }

        draw(context) {
            context.save(); // Save context before applying shadows [48]
            
            // Shadow settings applied only to UI text and elements [49]
            context.shadowOffsetX = 2;
            context.shadowOffsetY = 2;
            context.shadowColor = 'black';
            
            context.fillStyle = this.color;
            context.textAlign = 'left';
            context.font = this.fontSize + 'px ' + this.fontFamily;

            // Score display [48, 50]
            context.fillText('Score: ' + this.game.score, 20, 40);

            // Timer display [51]
            const formattedTime = (this.game.gameTime * 0.001).toFixed(1); // Format milliseconds to seconds
            context.fillText('Timer: ' + formattedTime, 20, 100);

            // Ammo Bar Display [47]
            // Change color if player is in power up mode [52]
            if (this.game.player.powerUp) {
                 context.fillStyle = 'yellow';
            }
            // Draw small rectangles for each unit of ammo [53]
            for (let i = 0; i < this.game.ammo; i++) {
                context.fillRect(20 + i * 5, 50, 3, 20); // x offset by 5 pixels * index
            }
            context.fillStyle = this.color; // Reset color for other text elements

            // Game Over Messages [54, 55]
            if (this.game.gameOver) {
                context.textAlign = 'center';
                let message1;
                let message2;
                
                if (this.game.score > this.game.winningScore) {
                    message1 = 'MOST WONDERS!'; // [56]
                    message2 = 'Well done, Explorer!';
                } else {
                    message1 = 'BLAZES!'; // [56]
                    message2 = 'Get my repair kit and try again!';
                }
                
                // Draw Message 1 (Large) [55, 57]
                context.font = '70px ' + this.fontFamily; 
                context.fillText(message1, this.game.width * 0.5, this.game.height * 0.5 - 20); 
                
                // Draw Message 2 (Small) [55, 57]
                context.font = '25px ' + this.fontFamily;
                context.fillText(message2, this.game.width * 0.5, this.game.height * 0.5 + 40); 
            }

            context.restore(); // Restore context to original state [48]
        }
    }
    
    // --- 8. Enemy Parent Class (Super Class) [58, 59] ---
    class Enemy {
        constructor(game) {
            this.game = game;
            this.x = this.game.width; // Start behind right edge [58]
            this.speedX = Math.random() * -1.5 - 0.5; // Move left [58]
            this.markedForDeletion = false; 
            this.frameX = 0;
            this.frameY = 0;
            this.lives = 5; // Default lives [50]
            this.score = this.lives; // Default score is equal to lives [50]
        }

        update() {
            // Move enemy left, accounting for game scrolling speed [60]
            this.x += this.speedX - this.game.speed; 
            
            // Sprite animation logic 
            if (this.frameX < this.maxFrame) {
                this.frameX++;
            } else {
                this.frameX = 0;
            }

            // Mark for deletion if enemy scrolls off screen [59]
            if (this.x + this.width < 0) {
                this.markedForDeletion = true;
            }
        }

        draw(context) {
             // Draw cropped sprite sheet frame [61]
             context.drawImage(this.image, 
                this.frameX * this.width, this.frameY * this.height, 
                this.width, this.height,                             
                this.x, this.y,                                      
                this.width, this.height
            );

            // Draw hitbox and lives if debug mode is active [11, 57]
            if (this.game.debug) {
                context.strokeStyle = 'red';
                context.strokeRect(this.x, this.y, this.width, this.height);
                context.font = '20px Helvetica';
                context.fillStyle = 'black';
                context.fillText(this.lives, this.x, this.y); // Draw remaining lives [50]
            }
        }
    }

    // --- 9. Enemy Subclasses (Inheritance) [59] ---

    class Angular1 extends Enemy { 
        constructor(game) {
            super(game); // Call parent constructor [62]
            this.width = 228; // Specific width [62]
            this.height = 169; // Specific height [62]
            // Spawn position: 95% of game height to avoid drawing below the ground graphic [63]
            this.y = Math.random() * (this.game.height * 0.95 - this.height); 
            this.image = document.getElementById('angular1'); 
            this.frameY = Math.floor(Math.random() * 3); // Random animation row (0, 1, or 2) [64]
            this.maxFrame = 37;
            this.lives = 5; // Specific lives [65]
            this.score = 5; 
        }
    }

    class Angular2 extends Enemy { 
        constructor(game) {
            super(game);
            this.width = 213; 
            this.height = 165;
            this.y = Math.random() * (this.game.height * 0.95 - this.height); 
            this.image = document.getElementById('angular2');
            this.frameY = Math.floor(Math.random() * 2); // Random animation row (0 or 1) [60]
            this.maxFrame = 37;
            this.lives = 6; [65]
            this.score = 6;
        }
    }

    class LuckyFish extends Enemy { // Powerup enemy [66]
        constructor(game) {
            super(game);
            this.width = 99; 
            this.height = 95;
            this.y = Math.random() * (this.game.height * 0.95 - this.height);
            this.image = document.getElementById('luckyfish');
            this.frameY = Math.floor(Math.random() * 2); 
            this.maxFrame = 37;
            this.lives = 5; [65]
            this.score = 15; // High score reward [67]
            this.type = 'lucky'; // Used for collision detection [40, 67]
        }
    }

    class HiveWhale extends Enemy { // Massive, slow enemy that spawns drones [68]
        constructor(game) {
            super(game);
            this.width = 400; 
            this.height = 227;
            this.y = Math.random() * (this.game.height * 0.95 - this.height);
            this.image = document.getElementById('hivewhale');
            this.frameY = 0;
            this.maxFrame = 37;
            this.lives = 20; // High lives [65]
            this.score = 15;
            this.type = 'hive'; 
            this.speedX = Math.random() * -1.2 - 0.2; // Very slow movement [63]
        }
    }

    class Drone extends Enemy { // Fast, aggressive enemies spawned by Hive Whale [69, 70]
        constructor(game, x, y) {
            super(game);
            this.width = 115; 
            this.height = 95;
            this.x = x + Math.random() * this.width; // Spawn near the center of destroyed hive [71]
            this.y = y + Math.random() * this.height * 0.5;
            this.image = document.getElementById('drone');
            this.frameY = Math.floor(Math.random() * 2); 
            this.maxFrame = 37;
            this.lives = 3; 
            this.score = 3;
            this.type = 'drone'; 
            this.speedX = Math.random() * -4.2 - 0.5; // Very fast movement [70]
        }
    }
    
    // --- 10. Explosion Parent Class [72] ---
    class Explosion {
        constructor(game, x, y) {
            this.game = game;
            this.x = x;
            this.y = y;
            this.frameX = 0;
            this.spriteHeight = 200; // Shared height [73, 74]
            this.spriteWidth = 200; // Shared width [74]
            this.timer = 0;
            this.fps = 30; // Frames per second for animation [74]
            this.interval = 1000/this.fps; // Interval calculation [73]
            this.markedForDeletion = false;
        }

        update(deltaTime) {
            // Scroll explosion with the game world [75]
            this.x -= this.game.speed; 

            // Handle animation timing using Delta Time [76]
            if (this.timer > this.interval) {
                this.frameX++;
                this.timer = 0;
            } else {
                this.timer += deltaTime;
            }
            
            // Mark for deletion when animation is complete [77]
            if (this.frameX > this.maxFrame) {
                this.markedForDeletion = true;
            }
        }
        
        draw(context) {
            // Draw cropped sprite frame (9 arguments) [78]
            context.drawImage(this.image, 
                this.frameX * this.spriteWidth, 0, // Source X, Y (Y is 0 as single row)
                this.spriteWidth, this.spriteHeight, 
                this.x, this.y, 
                this.spriteWidth, this.spriteHeight
            );
        }
    }

    // --- 11. Explosion Subclasses [79] ---
    class SmokeExplosion extends Explosion {
        constructor(game, x, y) {
            super(game, x, y); // Must call parent constructor first [80]
            this.image = document.getElementById('smokeexplosion');
            this.maxFrame = 8; // [77]
            // Center the explosion on the enemy coordinates [81]
            this.x = x - this.spriteWidth/2; 
            this.y = y - this.spriteHeight/2;
        }
    }

    class FireExplosion extends Explosion {
        constructor(game, x, y) {
            super(game, x, y);
            this.image = document.getElementById('fireexplosion');
            this.maxFrame = 8;
            this.x = x - this.spriteWidth/2; 
            this.y = y - this.spriteHeight/2;
        }
    }


    // --- 12. Main Game Class (The Engine and Orchestrator) [6] ---
    class Game {
        constructor(width, height) {
            this.width = width;
            this.height = height;
            this.speed = 1; // Base game scrolling speed [41]
            
            // Instantiation of core helper classes (triggered by 'new Game') [82]
            this.input = new InputHandler(this); 
            this.background = new Background(this);
            this.player = new Player(this);
            this.ui = new UI(this);

            // Core Game Properties and State
            this.keys = []; // Tracks pressed keys [83]
            this.ammo = 20; [38]
            this.maxAmmo = 50; [84]
            this.ammoTimer = 0; 
            this.ammoInterval = 350; // Ammo replenishment interval in ms [85]
            this.score = 0; [50]
            this.winningScore = 80; [65]
            this.gameOver = false; [86]
            this.gameTime = 0; // Tracks total game time in ms [87]
            this.timeLimit = 30000; // 30 seconds [85]
            this.debug = false; // Initial debug state is off [88]
            
            // Enemy spawning logic
            this.enemyTimer = 0;
            this.enemyInterval = 2000; // Enemies spawn every 2 seconds [85]

            // Object Arrays
            this.enemies = []; [89]
            this.particles = []; [26]
            this.explosions = []; [81]
        }

        update(deltaTime) {
            // Game Time Tracking [87]
            if (!this.gameOver) {
                this.gameTime += deltaTime; 
                if (this.gameTime > this.timeLimit) {
                    this.gameOver = true;
                }
            }
            
            // Background Updates [46, 90]
            this.background.update(); 
            this.background.layer4.update(); // Update foreground layer separately
            this.player.update(deltaTime); 
            
            // Ammo Recharge Logic (Periodic Event) [91]
            if (this.ammoTimer > this.ammoInterval && this.ammo < this.maxAmmo) {
                this.ammo++;
                this.ammoTimer = 0;
            } else {
                this.ammoTimer += deltaTime;
            }

            // Enemy Spawning Logic [86, 92]
            if (this.enemyTimer > this.enemyInterval && !this.gameOver) {
                this.addEnemy();
                this.enemyTimer = 0;
            } else {
                this.enemyTimer += deltaTime;
            }

            // Update all active object arrays
            this.enemies.forEach(enemy => enemy.update());
            this.particles.forEach(particle => particle.update()); 
            this.explosions.forEach(explosion => explosion.update(deltaTime)); 

            // Collision Detection Loop [93]
            this.enemies.forEach(enemy => {
                
                // 1. Player vs Enemy collision 
                if (this.checkCollisions(this.player, enemy)) { 
                    enemy.markedForDeletion = true;
                    
                    if (enemy.type === 'lucky') {
                        this.player.enterPowerUp(); // Activate power up [88]
                    } else if (!this.gameOver) {
                         // Penalty for colliding with regular enemies [40, 85]
                         this.score--; 
                    }

                    this.addExplosion(enemy); // Add explosion [94]
                    this.addParticles(enemy, enemy.score * 2); // Add particles [71]
                }
                
                // 2. Projectile vs Enemy collision [95]
                this.player.projectiles.forEach(projectile => {
                    if (this.checkCollisions(projectile, enemy)) {
                        projectile.markedForDeletion = true;
                        enemy.lives--;
                        this.addParticles(enemy, 1); // Add 1 particle when hit [96]
                        
                        if (enemy.lives <= 0) {
                            enemy.markedForDeletion = true;
                            if (!this.gameOver) this.score += enemy.score; // Increase score [2]
                            this.addExplosion(enemy); 
                            this.addParticles(enemy, enemy.score * 2); // Add particles based on score [71]
                            
                            // Check if destroyed enemy is a Hive Whale (Type: 'hive') [97]
                            if (enemy.type === 'hive') {
                                for (let i = 0; i < 5; i++) { // Spawn 5 drones
                                    this.enemies.push(new Drone(this, enemy.x, enemy.y));
                                }
                            }
                        }
                    }
                });
            });

            // Filtering arrays (removing deleted objects) [35, 81, 98]
            this.enemies = this.enemies.filter(enemy => !enemy.markedForDeletion);
            this.particles = this.particles.filter(particle => !particle.markedForDeletion);
            this.explosions = this.explosions.filter(explosion => !explosion.markedForDeletion);
            
            // Note: Winning score check is intentionally commented out/removed to ensure game runs for 30s [99]
        }

        draw(context) {
            // Draw Order (Back to Front) [20, 46]
            this.background.draw(context); // Layers 1, 2, 3
            this.ui.draw(context); 

            // Projectiles must be drawn before the player [20, 52]
            this.player.projectiles.forEach(projectile => projectile.draw(context));
            this.player.draw(context); 
            
            this.particles.forEach(particle => particle.draw(context));
            this.enemies.forEach(enemy => {
                enemy.draw(context);
            });
            this.explosions.forEach(explosion => explosion.draw(context));
            
            this.background.layer4.draw(context); // Layer 4 (Foreground) drawn last [46]
        }

        // Reusable collision detection method [98, 100]
        checkCollisions(rect1, rect2) { 
            return (
                rect1.x < rect2.x + rect2.width && 
                rect1.x + rect1.width > rect2.x &&
                rect1.y < rect2.y + rect2.height &&
                rect1.y + rect1.height > rect2.y
            );
        }

        // Randomly adds enemy types [60, 67, 85]
        addEnemy() {
            const randomize = Math.random();
            if (randomize < 0.3) { // 30% chance
                this.enemies.push(new Angular1(this));
            } else if (randomize < 0.6) { // 30% chance
                this.enemies.push(new Angular2(this));
            } else if (randomize < 0.7) { // 10% chance (reduced HiveWhale likelihood) [85]
                this.enemies.push(new HiveWhale(this));
            } else { // 30% chance (increased LuckyFish likelihood) [85]
                this.enemies.push(new LuckyFish(this));
            }
        }
        
        // Adds particles (spare parts) [96]
        addParticles(enemy, count) {
            for (let i = 0; i < count; i++) {
                this.particles.push(new Particle(this, 
                    enemy.x + enemy.width * 0.5, // Center particles horizontally
                    enemy.y + enemy.height * 0.5  // Center particles vertically
                ));
            }
        }

        // Adds random explosion type [94]
        addExplosion(enemy) {
            const randomize = Math.random();
            if (randomize < 0.5) {
                this.explosions.push(new SmokeExplosion(this, enemy.x, enemy.y));
            } else {
                this.explosions.push(new FireExplosion(this, enemy.x, enemy.y));
            }
        }
    }

    // --- Main Game Execution ---
    const game = new Game(canvas.width, canvas.height); // Instantiate the game [101]
    let lastTime = 0; 

    function animate(timestamp) {
        // Delta Time calculation (measures milliseconds between frames) [102]
        const deltaTime = timestamp - lastTime; 
        lastTime = timestamp; 
        
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas [103]

        game.update(deltaTime); 
        game.draw(ctx); 

        requestAnimationFrame(animate); // Recursively call for endless loop [104, 105]
    }

    animate(0); // Start the animation loop
});window.addEventListener('load', function() {
    // Canvas setup
    const canvas = document.getElementById('canvas1');
    const ctx = canvas.getContext('2d'); // Drawing context [4]
    canvas.width = 700; // Final game width
    canvas.height = 500;
    
    // --- 1. Input Handler Class (Handles user key presses/releases) [8] ---
    class InputHandler {
        constructor(game) {
            this.game = game;

            window.addEventListener('keydown', e => {
                const key = e.key;
                
                // Add key only if it's Arrow Up/Down and not already present [9]
                if ((key === 'ArrowUp' || key === 'ArrowDown') && this.game.keys.indexOf(key) === -1) { 
                    this.game.keys.push(key);
                } 
                // Handle Spacebar for shooting [10]
                else if (key === ' ') { 
                    this.game.player.shootTop();
                }
                // Toggle Debug mode [11]
                else if (key === 'd') {
                    this.game.debug = !this.game.debug;
                }
            });

            window.addEventListener('keyup', e => {
                const key = e.key;
                const index = this.game.keys.indexOf(key);
                
                // Remove key if it exists in the array [12]
                if (index > -1) { 
                    this.game.keys.splice(index, 1); 
                }
            });
        }
    }
    
    // --- 2. Projectile Class (Player's laser attack) [13] ---
    class Projectile {
        constructor(game, x, y) {
            this.game = game;
            this.x = x;
            this.y = y;
            this.width = 36; 
            this.height = 10;
            this.speed = 5;
            this.markedForDeletion = false; 
            this.image = document.getElementById('projectile'); // Load projectile image [14]
        }
        
        update() {
            this.x += this.speed;
            // Mark for deletion if it moves past 80% of the screen [15]
            if (this.x > this.game.width * 0.8) { 
                this.markedForDeletion = true;
            }
        }
        
        draw(context) {
            context.drawImage(this.image, this.x, this.y); 
        }
    }

    // --- 3. Particle Class (Falling mechanical debris/gears) [16] ---
    class Particle {
        constructor(game, x, y) {
            this.game = game;
            this.x = x;
            this.y = y;
            this.image = document.getElementById('gears'); // Load gears sprite sheet [16]
            this.frameX = Math.floor(Math.random() * 3); // Randomly choose image column (0-2) [17]
            this.frameY = Math.floor(Math.random() * 3); // Randomly choose image row (0-2) [17]
            this.spriteSize = 50; 
            this.sizeModifier = (Math.random() * 0.5 + 0.5); 
            this.size = this.spriteSize * this.sizeModifier;
            this.speedX = Math.random() * 6 - 3; // Horizontal speed: -3 to +3 [18]
            this.speedY = Math.random() * -15; // Vertical speed: always starts upward [18]
            this.gravity = 0.5; // [18]
            this.markedForDeletion = false;
            this.angle = 0; 
            this.va = Math.random() * 0.2 - 0.1; // Velocity of angle (rotation speed) [18]
            this.bounced = 0; // Tracks number of bounces [19]
            this.bottomBoundary = Math.random() * 80 + 60; // Random bounce height (60-140 pixels) [19, 20]
        }
        
        update() {
            this.angle += this.va; // Update rotation [21]
            this.speedY += this.gravity; // Apply gravity [21]
            this.x += this.speedX - this.game.speed; // Move horizontally, accounting for game speed [22]
            this.y += this.speedY; 

            // Bounce logic [19, 23]
            if (this.y > this.game.height - this.bottomBoundary && this.bounced < 2) { 
                this.bounced++;
                this.speedY *= -0.5; // Reverse vertical speed and dampen it 
            }
            
            // Mark for deletion if off screen [21]
            if (this.y > this.game.height || this.x < 0 - this.size) {
                this.markedForDeletion = true;
            }
        }
        
        draw(context) {
            context.save(); // Save canvas state for rotation [24]
            // Translate origin (0,0) to particle center for rotation [24, 25]
            context.translate(this.x + this.size/2, this.y + this.size/2);
            context.rotate(this.angle);

            // Draw cropped sprite frame [26]
            context.drawImage(this.image, 
                this.frameX * this.spriteSize, this.frameY * this.spriteSize, 
                this.spriteSize, this.spriteSize, 
                -this.size/2, -this.size/2, // Destination X, Y (centered on translated origin) [22]
                this.size, this.size
            );

            context.restore(); // Restore canvas state [24]
        }
    }

    // --- 4. Player Class (The main character, seahorse sentinel) [7, 27] ---
    class Player {
        constructor(game) {
            this.game = game;
            this.width = 120; // Sprite frame width [28]
            this.height = 190; // Sprite frame height [28]
            this.x = 20; 
            this.y = 100;
            this.speedY = 0; // Current vertical speed [29]
            this.maxSpeed = 2; // Maximum vertical speed [13]
            this.projectiles = []; // Array of active projectile objects [10]
            this.image = document.getElementById('seahorse'); // Load player image [27]
            this.frameX = 0;
            this.frameY = 0;
            this.maxFrame = 37; // Max frame for swimming animation [30]
            this.powerUp = false; // Power up state [31]
            this.powerUpTimer = 0;
            this.powerUpLimit = 10000; // 10 seconds [31]
        }
        
        update(deltaTime) {
            // Power Up Logic [31, 32]
            if (this.powerUp) {
                if (this.powerUpTimer > this.powerUpLimit) {
                    this.powerUpTimer = 0;
                    this.powerUp = false;
                    this.frameY = 0; // Return to default animation row [31]
                } else {
                    this.powerUpTimer += deltaTime;
                    this.frameY = 1; // Use powerup animation row [32]
                    this.game.ammo += 0.1; // Fast ammo recharge [32]
                }
            }

            // Input handling and movement [13, 33]
            if (this.game.keys.includes('ArrowUp')) {
                this.speedY = -this.maxSpeed;
            } else if (this.game.keys.includes('ArrowDown')) {
                this.speedY = this.maxSpeed;
            } else {
                this.speedY = 0;
            }
            this.y += this.speedY; // Apply vertical movement [29]
            
            // Vertical Boundaries [34]
            if (this.y > this.game.height - this.height * 0.5) {
                this.y = this.game.height - this.height * 0.5;
            } else if (this.y < -this.height * 0.5) {
                this.y = -this.height * 0.5;
            }

            // Update projectiles [35]
            this.projectiles.forEach(projectile => projectile.update());
            this.projectiles = this.projectiles.filter(p => !p.markedForDeletion); 

            // Sprite Animation Logic [30]
            if (this.frameX < this.maxFrame) {
                this.frameX++;
            } else {
                this.frameX = 0;
            }
        }
        
        draw(context) {
            // Draw hitbox if debug mode is active [11]
            if (this.game.debug) {
                context.strokeStyle = 'black';
                context.strokeRect(this.x, this.y, this.width, this.height);
            }
            
            // Draw player sprite sheet frame (9 arguments) [36, 37]
            context.drawImage(this.image, 
                this.frameX * this.width, this.frameY * this.height, // Source X, Y
                this.width, this.height,                             // Source Width, Height
                this.x, this.y,                                      // Destination X, Y
                this.width, this.height
            );
        }
        
        shootTop() {
            // Check if ammo is available [38]
            if (this.game.ammo > 0) {
                // Creates new projectile starting near the player's mouth (x+80, y+30 offset)
                this.projectiles.push(new Projectile(this.game, this.x + 80, this.y + 30)); 
                this.game.ammo--;
            }
            // If in powerup mode, also shoot from the tail [39]
            if (this.powerUp) {
                this.shootBottom();
            }
        }

        shootBottom() {
            // Creates second projectile starting near the player's tail [39]
            if (this.game.ammo > 0) {
                 this.projectiles.push(new Projectile(this.game, this.x + 80, this.y + 175)); 
            }
        }

        // Method called when colliding with a lucky fish [40]
        enterPowerUp() {
            this.powerUpTimer = 0;
            this.powerUp = true;
            // Refill ammo only if current ammo is less than max ammo [20]
            if (this.game.ammo < this.game.maxAmmo) { 
                this.game.ammo = this.game.maxAmmo;
            }
        }
    }
    
    // --- 5. Layer Class (Single Parallax Layer) [3] ---
    class Layer {
        constructor(game, image, speedModifier) {
            this.game = game;
            this.image = image;
            this.speedModifier = speedModifier;
            this.width = 1768; // Image source width [3]
            this.height = 500;
            this.x = 0;
            this.y = 0;
        }

        update() {
            // Calculate movement speed [41]
            const speed = this.game.speed * this.speedModifier; 
            this.x -= speed;

            // Seamless scrolling logic: if image scrolls off screen, reset X to 0 [42, 43]
            if (this.x < -this.width) {
                this.x = 0; 
            }
        }

        draw(context) {
            // Draw the first image [44]
            context.drawImage(this.image, this.x, this.y, this.width, this.height);
            // Draw a second identical image immediately next to the first one for seamless scrolling [42]
            context.drawImage(this.image, this.x + this.width, this.y, this.width, this.height); 
        }
    }

    // --- 6. Background Class (Manages all four layers) [44] ---
    class Background {
        constructor(game) {
            this.game = game;
            
            // Get image elements from HTML
            this.image1 = document.getElementById('layer1');
            this.image2 = document.getElementById('layer2');
            this.image3 = document.getElementById('layer3');
            this.image4 = document.getElementById('layer4');
            
            // Create layer objects with varying speed modifiers for parallax effect [43, 45]
            this.layer1 = new Layer(this.game, this.image1, 0.2);
            this.layer2 = new Layer(this.game, this.image2, 0.4);
            this.layer3 = new Layer(this.game, this.image3, 1); 
            this.layer4 = new Layer(this.game, this.image4, 1.5); 
            
            // Only layers 1, 2, 3 are included in the main background array [46]
            this.layers = [this.layer1, this.layer2, this.layer3]; 
        }

        update() {
            this.layers.forEach(layer => layer.update());
        }

        draw(context) {
            this.layers.forEach(layer => layer.draw(context));
        }
    }
    
    // --- 7. UI Class (User Interface, score, timer, ammo) [47] ---
    class UI {
        constructor(game) {
            this.game = game;
            this.fontSize = 25;
            this.fontFamily = 'Bangers'; 
            this.color = 'white';
        }

        draw(context) {
            context.save(); // Save context before applying shadows [48]
            
            // Shadow settings applied only to UI text and elements [49]
            context.shadowOffsetX = 2;
            context.shadowOffsetY = 2;
            context.shadowColor = 'black';
            
            context.fillStyle = this.color;
            context.textAlign = 'left';
            context.font = this.fontSize + 'px ' + this.fontFamily;

            // Score display [48, 50]
            context.fillText('Score: ' + this.game.score, 20, 40);

            // Timer display [51]
            const formattedTime = (this.game.gameTime * 0.001).toFixed(1); // Format milliseconds to seconds
            context.fillText('Timer: ' + formattedTime, 20, 100);

            // Ammo Bar Display [47]
            // Change color if player is in power up mode [52]
            if (this.game.player.powerUp) {
                 context.fillStyle = 'yellow';
            }
            // Draw small rectangles for each unit of ammo [53]
            for (let i = 0; i < this.game.ammo; i++) {
                context.fillRect(20 + i * 5, 50, 3, 20); // x offset by 5 pixels * index
            }
            context.fillStyle = this.color; // Reset color for other text elements

            // Game Over Messages [54, 55]
            if (this.game.gameOver) {
                context.textAlign = 'center';
                let message1;
                let message2;
                
                if (this.game.score > this.game.winningScore) {
                    message1 = 'MOST WONDERS!'; // [56]
                    message2 = 'Well done, Explorer!';
                } else {
                    message1 = 'BLAZES!'; // [56]
                    message2 = 'Get my repair kit and try again!';
                }
                
                // Draw Message 1 (Large) [55, 57]
                context.font = '70px ' + this.fontFamily; 
                context.fillText(message1, this.game.width * 0.5, this.game.height * 0.5 - 20); 
                
                // Draw Message 2 (Small) [55, 57]
                context.font = '25px ' + this.fontFamily;
                context.fillText(message2, this.game.width * 0.5, this.game.height * 0.5 + 40); 
            }

            context.restore(); // Restore context to original state [48]
        }
    }
    
    // --- 8. Enemy Parent Class (Super Class) [58, 59] ---
    class Enemy {
        constructor(game) {
            this.game = game;
            this.x = this.game.width; // Start behind right edge [58]
            this.speedX = Math.random() * -1.5 - 0.5; // Move left [58]
            this.markedForDeletion = false; 
            this.frameX = 0;
            this.frameY = 0;
            this.lives = 5; // Default lives [50]
            this.score = this.lives; // Default score is equal to lives [50]
        }

        update() {
            // Move enemy left, accounting for game scrolling speed [60]
            this.x += this.speedX - this.game.speed; 
            
            // Sprite animation logic 
            if (this.frameX < this.maxFrame) {
                this.frameX++;
            } else {
                this.frameX = 0;
            }

            // Mark for deletion if enemy scrolls off screen [59]
            if (this.x + this.width < 0) {
                this.markedForDeletion = true;
            }
        }

        draw(context) {
             // Draw cropped sprite sheet frame [61]
             context.drawImage(this.image, 
                this.frameX * this.width, this.frameY * this.height, 
                this.width, this.height,                             
                this.x, this.y,                                      
                this.width, this.height
            );

            // Draw hitbox and lives if debug mode is active [11, 57]
            if (this.game.debug) {
                context.strokeStyle = 'red';
                context.strokeRect(this.x, this.y, this.width, this.height);
                context.font = '20px Helvetica';
                context.fillStyle = 'black';
                context.fillText(this.lives, this.x, this.y); // Draw remaining lives [50]
            }
        }
    }

    // --- 9. Enemy Subclasses (Inheritance) [59] ---

    class Angular1 extends Enemy { 
        constructor(game) {
            super(game); // Call parent constructor [62]
            this.width = 228; // Specific width [62]
            this.height = 169; // Specific height [62]
            // Spawn position: 95% of game height to avoid drawing below the ground graphic [63]
            this.y = Math.random() * (this.game.height * 0.95 - this.height); 
            this.image = document.getElementById('angular1'); 
            this.frameY = Math.floor(Math.random() * 3); // Random animation row (0, 1, or 2) [64]
            this.maxFrame = 37;
            this.lives = 5; // Specific lives [65]
            this.score = 5; 
        }
    }

    class Angular2 extends Enemy { 
        constructor(game) {
            super(game);
            this.width = 213; 
            this.height = 165;
            this.y = Math.random() * (this.game.height * 0.95 - this.height); 
            this.image = document.getElementById('angular2');
            this.frameY = Math.floor(Math.random() * 2); // Random animation row (0 or 1) [60]
            this.maxFrame = 37;
            this.lives = 6; [65]
            this.score = 6;
        }
    }

    class LuckyFish extends Enemy { // Powerup enemy [66]
        constructor(game) {
            super(game);
            this.width = 99; 
            this.height = 95;
            this.y = Math.random() * (this.game.height * 0.95 - this.height);
            this.image = document.getElementById('luckyfish');
            this.frameY = Math.floor(Math.random() * 2); 
            this.maxFrame = 37;
            this.lives = 5; [65]
            this.score = 15; // High score reward [67]
            this.type = 'lucky'; // Used for collision detection [40, 67]
        }
    }

    class HiveWhale extends Enemy { // Massive, slow enemy that spawns drones [68]
        constructor(game) {
            super(game);
            this.width = 400; 
            this.height = 227;
            this.y = Math.random() * (this.game.height * 0.95 - this.height);
            this.image = document.getElementById('hivewhale');
            this.frameY = 0;
            this.maxFrame = 37;
            this.lives = 20; // High lives [65]
            this.score = 15;
            this.type = 'hive'; 
            this.speedX = Math.random() * -1.2 - 0.2; // Very slow movement [63]
        }
    }

    class Drone extends Enemy { // Fast, aggressive enemies spawned by Hive Whale [69, 70]
        constructor(game, x, y) {
            super(game);
            this.width = 115; 
            this.height = 95;
            this.x = x + Math.random() * this.width; // Spawn near the center of destroyed hive [71]
            this.y = y + Math.random() * this.height * 0.5;
            this.image = document.getElementById('drone');
            this.frameY = Math.floor(Math.random() * 2); 
            this.maxFrame = 37;
            this.lives = 3; 
            this.score = 3;
            this.type = 'drone'; 
            this.speedX = Math.random() * -4.2 - 0.5; // Very fast movement [70]
        }
    }
    
    // --- 10. Explosion Parent Class [72] ---
    class Explosion {
        constructor(game, x, y) {
            this.game = game;
            this.x = x;
            this.y = y;
            this.frameX = 0;
            this.spriteHeight = 200; // Shared height [73, 74]
            this.spriteWidth = 200; // Shared width [74]
            this.timer = 0;
            this.fps = 30; // Frames per second for animation [74]
            this.interval = 1000/this.fps; // Interval calculation [73]
            this.markedForDeletion = false;
        }

        update(deltaTime) {
            // Scroll explosion with the game world [75]
            this.x -= this.game.speed; 

            // Handle animation timing using Delta Time [76]
            if (this.timer > this.interval) {
                this.frameX++;
                this.timer = 0;
            } else {
                this.timer += deltaTime;
            }
            
            // Mark for deletion when animation is complete [77]
            if (this.frameX > this.maxFrame) {
                this.markedForDeletion = true;
            }
        }
        
        draw(context) {
            // Draw cropped sprite frame (9 arguments) [78]
            context.drawImage(this.image, 
                this.frameX * this.spriteWidth, 0, // Source X, Y (Y is 0 as single row)
                this.spriteWidth, this.spriteHeight, 
                this.x, this.y, 
                this.spriteWidth, this.spriteHeight
            );
        }
    }

    // --- 11. Explosion Subclasses [79] ---
    class SmokeExplosion extends Explosion {
        constructor(game, x, y) {
            super(game, x, y); // Must call parent constructor first [80]
            this.image = document.getElementById('smokeexplosion');
            this.maxFrame = 8; // [77]
            // Center the explosion on the enemy coordinates [81]
            this.x = x - this.spriteWidth/2; 
            this.y = y - this.spriteHeight/2;
        }
    }

    class FireExplosion extends Explosion {
        constructor(game, x, y) {
            super(game, x, y);
            this.image = document.getElementById('fireexplosion');
            this.maxFrame = 8;
            this.x = x - this.spriteWidth/2; 
            this.y = y - this.spriteHeight/2;
        }
    }


    // --- 12. Main Game Class (The Engine and Orchestrator) [6] ---
    class Game {
        constructor(width, height) {
            this.width = width;
            this.height = height;
            this.speed = 1; // Base game scrolling speed [41]
            
            // Instantiation of core helper classes (triggered by 'new Game') [82]
            this.input = new InputHandler(this); 
            this.background = new Background(this);
            this.player = new Player(this);
            this.ui = new UI(this);

            // Core Game Properties and State
            this.keys = []; // Tracks pressed keys [83]
            this.ammo = 20; [38]
            this.maxAmmo = 50; [84]
            this.ammoTimer = 0; 
            this.ammoInterval = 350; // Ammo replenishment interval in ms [85]
            this.score = 0; [50]
            this.winningScore = 80; [65]
            this.gameOver = false; [86]
            this.gameTime = 0; // Tracks total game time in ms [87]
            this.timeLimit = 30000; // 30 seconds [85]
            this.debug = false; // Initial debug state is off [88]
            
            // Enemy spawning logic
            this.enemyTimer = 0;
            this.enemyInterval = 2000; // Enemies spawn every 2 seconds [85]

            // Object Arrays
            this.enemies = []; [89]
            this.particles = []; [26]
            this.explosions = []; [81]
        }

        update(deltaTime) {
            // Game Time Tracking [87]
            if (!this.gameOver) {
                this.gameTime += deltaTime; 
                if (this.gameTime > this.timeLimit) {
                    this.gameOver = true;
                }
            }
            
            // Background Updates [46, 90]
            this.background.update(); 
            this.background.layer4.update(); // Update foreground layer separately
            this.player.update(deltaTime); 
            
            // Ammo Recharge Logic (Periodic Event) [91]
            if (this.ammoTimer > this.ammoInterval && this.ammo < this.maxAmmo) {
                this.ammo++;
                this.ammoTimer = 0;
            } else {
                this.ammoTimer += deltaTime;
            }

            // Enemy Spawning Logic [86, 92]
            if (this.enemyTimer > this.enemyInterval && !this.gameOver) {
                this.addEnemy();
                this.enemyTimer = 0;
            } else {
                this.enemyTimer += deltaTime;
            }

            // Update all active object arrays
            this.enemies.forEach(enemy => enemy.update());
            this.particles.forEach(particle => particle.update()); 
            this.explosions.forEach(explosion => explosion.update(deltaTime)); 

            // Collision Detection Loop [93]
            this.enemies.forEach(enemy => {
                
                // 1. Player vs Enemy collision 
                if (this.checkCollisions(this.player, enemy)) { 
                    enemy.markedForDeletion = true;
                    
                    if (enemy.type === 'lucky') {
                        this.player.enterPowerUp(); // Activate power up [88]
                    } else if (!this.gameOver) {
                         // Penalty for colliding with regular enemies [40, 85]
                         this.score--; 
                    }

                    this.addExplosion(enemy); // Add explosion [94]
                    this.addParticles(enemy, enemy.score * 2); // Add particles [71]
                }
                
                // 2. Projectile vs Enemy collision [95]
                this.player.projectiles.forEach(projectile => {
                    if (this.checkCollisions(projectile, enemy)) {
                        projectile.markedForDeletion = true;
                        enemy.lives--;
                        this.addParticles(enemy, 1); // Add 1 particle when hit [96]
                        
                        if (enemy.lives <= 0) {
                            enemy.markedForDeletion = true;
                            if (!this.gameOver) this.score += enemy.score; // Increase score [2]
                            this.addExplosion(enemy); 
                            this.addParticles(enemy, enemy.score * 2); // Add particles based on score [71]
                            
                            // Check if destroyed enemy is a Hive Whale (Type: 'hive') [97]
                            if (enemy.type === 'hive') {
                                for (let i = 0; i < 5; i++) { // Spawn 5 drones
                                    this.enemies.push(new Drone(this, enemy.x, enemy.y));
                                }
                            }
                        }
                    }
                });
            });

            // Filtering arrays (removing deleted objects) [35, 81, 98]
            this.enemies = this.enemies.filter(enemy => !enemy.markedForDeletion);
            this.particles = this.particles.filter(particle => !particle.markedForDeletion);
            this.explosions = this.explosions.filter(explosion => !explosion.markedForDeletion);
            
            // Note: Winning score check is intentionally commented out/removed to ensure game runs for 30s [99]
        }

        draw(context) {
            // Draw Order (Back to Front) [20, 46]
            this.background.draw(context); // Layers 1, 2, 3
            this.ui.draw(context); 

            // Projectiles must be drawn before the player [20, 52]
            this.player.projectiles.forEach(projectile => projectile.draw(context));
            this.player.draw(context); 
            
            this.particles.forEach(particle => particle.draw(context));
            this.enemies.forEach(enemy => {
                enemy.draw(context);
            });
            this.explosions.forEach(explosion => explosion.draw(context));
            
            this.background.layer4.draw(context); // Layer 4 (Foreground) drawn last [46]
        }

        // Reusable collision detection method [98, 100]
        checkCollisions(rect1, rect2) { 
            return (
                rect1.x < rect2.x + rect2.width && 
                rect1.x + rect1.width > rect2.x &&
                rect1.y < rect2.y + rect2.height &&
                rect1.y + rect1.height > rect2.y
            );
        }

        // Randomly adds enemy types [60, 67, 85]
        addEnemy() {
            const randomize = Math.random();
            if (randomize < 0.3) { // 30% chance
                this.enemies.push(new Angular1(this));
            } else if (randomize < 0.6) { // 30% chance
                this.enemies.push(new Angular2(this));
            } else if (randomize < 0.7) { // 10% chance (reduced HiveWhale likelihood) [85]
                this.enemies.push(new HiveWhale(this));
            } else { // 30% chance (increased LuckyFish likelihood) [85]
                this.enemies.push(new LuckyFish(this));
            }
        }
        
        // Adds particles (spare parts) [96]
        addParticles(enemy, count) {
            for (let i = 0; i < count; i++) {
                this.particles.push(new Particle(this, 
                    enemy.x + enemy.width * 0.5, // Center particles horizontally
                    enemy.y + enemy.height * 0.5  // Center particles vertically
                ));
            }
        }

        // Adds random explosion type [94]
        addExplosion(enemy) {
            const randomize = Math.random();
            if (randomize < 0.5) {
                this.explosions.push(new SmokeExplosion(this, enemy.x, enemy.y));
            } else {
                this.explosions.push(new FireExplosion(this, enemy.x, enemy.y));
            }
        }
    }

    // --- Main Game Execution ---
    const game = new Game(canvas.width, canvas.height); // Instantiate the game [101]
    let lastTime = 0; 

    function animate(timestamp) {
        // Delta Time calculation (measures milliseconds between frames) [102]
        const deltaTime = timestamp - lastTime; 
        lastTime = timestamp; 
        
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas [103]

        game.update(deltaTime); 
        game.draw(ctx); 

        requestAnimationFrame(animate); // Recursively call for endless loop [104, 105]
    }

    animate(0); // Start the animation loop
});