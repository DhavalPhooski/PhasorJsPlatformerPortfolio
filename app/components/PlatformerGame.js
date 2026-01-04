'use client';

import { useEffect, useRef, useState } from 'react';

export default function PlatformerGame() {
  const gameRef = useRef(null);
  const phaserGameRef = useRef(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const imagesRef = useRef({});
  
  const [isLeftDown, setIsLeftDown] = useState(false);
  const [isRightDown, setIsRightDown] = useState(false);

  useEffect(() => {
    const loadImages = async () => {
      await document.fonts.ready;

      const imageUrls = {
        htmlCard: '/HtmlTarotCard.png',
        cssCard: '/CssTarotCard.png',
        jsCard: '/JavaScriptTarotCard.png',
        run: '/run.png',   
        idle: '/idle.png',
        benchGuy: '/BenchGuy.svg',
        statue: '/StatueOfDhaval.png',
      };

      const loadPromises = Object.entries(imageUrls).map(([key, url]) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            imagesRef.current[key] = img;
            resolve();
          };
          img.onerror = reject;
          img.src = url;
        });
      });

      try {
        await Promise.all(loadPromises);
        setImagesLoaded(true);
      } catch (error) {
        console.error('Failed to load assets:', error);
      }
    };
    loadImages();
  }, []);

  useEffect(() => {
    if (!imagesLoaded || typeof window === 'undefined' || phaserGameRef.current) return;

    import('phaser').then((Phaser) => {
      class GameScene extends Phaser.Scene {
        constructor() {
          super('GameScene');
          this.worldWidth = 5800;
          this.worldHeight = 2250;
          this.platformPoints = [];
        }

        preload() {
          this.load.svg('tree', '/treee.svg', { width: 700, height: 1100 });

          ['htmlCard', 'cssCard', 'jsCard', 'benchGuy', 'statue'].forEach(key => {
            if (imagesRef.current[key]) this.textures.addImage(key, imagesRef.current[key]);
          });
          
          const COLS = 8;
          const ROWS = 7;

          if (imagesRef.current.run) {
            this.textures.addSpriteSheet('playerRun', imagesRef.current.run, {
              frameWidth: imagesRef.current.run.width / COLS,
              frameHeight: imagesRef.current.run.height / ROWS
            });
          }
          if (imagesRef.current.idle) {
            this.textures.addSpriteSheet('playerIdle', imagesRef.current.idle, {
              frameWidth: imagesRef.current.idle.width / COLS,
              frameHeight: imagesRef.current.idle.height / ROWS
            });
          }
        }

        create() {
          this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

          // Generate sparkle texture
          const graphics = this.make.graphics({ x: 0, y: 0, add: false });
          graphics.fillStyle(0xffffff, 1);
          graphics.fillCircle(5, 5, 5);
          graphics.generateTexture('sparkle', 10, 10);
          
          // Generate leaf texture for wind effect
          const leafGraphics = this.make.graphics({ x: 0, y: 0, add: false });
          leafGraphics.fillStyle(0x90EE90, 0.8);
          leafGraphics.fillEllipse(5, 8, 8, 12);
          leafGraphics.generateTexture('leaf', 10, 16);
          
          this.createSky();
          this.createMountains();
          this.createClouds();
          
          this.createPlatform();
          this.createUndergroundRocks(); // <--- NEW: Generates rocks over the empty platform space
          
          this.createAnimations();
          
          const groundLevel = this.worldHeight * 0.92;

          const textStyle = {
            fontFamily: '"Beau Rivage", cursive',
            fontSize: '180px',
            fill: '#ffffffff',
            stroke: '#808080ff',
            strokeThickness: 4,
          };

          const introText = this.add.text(100, groundLevel - 600, 'Frontend\nDeveloper \n', textStyle);
          introText.setDepth(2).setScrollFactor(1);

          // Add sparkling particles behind text
          const textBounds = introText.getBounds();
          const emitter = this.add.particles(0, 0, 'sparkle', {
            x: { min: textBounds.x, max: textBounds.x + textBounds.width },
            y: { min: textBounds.y, max: textBounds.y + textBounds.height },
            lifespan: { min: 800, max: 1500 },
            speedY: { min: -20, max: -50 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.8, end: 0 },
            rotate: { min: 0, max: 360 },
            tint: [ 0xFFD700, 0xFFFFFF, 0x00DFA2 ], 
            blendMode: 'ADD',
            frequency: 80
          });
          
          emitter.setDepth(1);
          emitter.setScrollFactor(1);

          this.player = this.physics.add.sprite(300, groundLevel - 100, 'playerIdle');
          this.player.setScale(0.4).setDepth(10).play('idle-anim');
          
          this.addWorldContent();
          this.addGrassAndFlowers();
          this.addWindEffect();
          
          this.cursors = this.input.keyboard.createCursorKeys();
          this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
          this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        }

        createSky() {
          const skyGraphics = this.add.graphics();
          skyGraphics.setDepth(-100).setScrollFactor(0);
          const gradientHeight = this.cameras.main.height;
          
          for (let i = 0; i < gradientHeight; i++) {
            const progress = i / gradientHeight;
            const r = Math.floor(130 + progress * (255 - 130));
            const g = Math.floor(220 + progress * (255 - 220));
            const b = Math.floor(210 + progress * (100 - 210));
            const color = Phaser.Display.Color.GetColor(r, g, b);
            skyGraphics.fillStyle(color, 1);
            skyGraphics.fillRect(0, i, this.cameras.main.width * 2, 1);
          }

          this.stars = [];
          for (let i = 0; i < 50; i++) {
            const star = this.add.circle(Phaser.Math.Between(0, this.cameras.main.width), Phaser.Math.Between(0, this.cameras.main.height * 0.4), Phaser.Math.Between(1, 3), 0xFFFDD0, Phaser.Math.FloatBetween(0.3, 0.8));
            star.setDepth(-99).setScrollFactor(0);
            this.stars.push(star);
            this.tweens.add({ targets: star, alpha: Phaser.Math.FloatBetween(0.2, 1), duration: Phaser.Math.Between(1000, 3000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          }
          
          const celestialBody = this.add.circle(this.cameras.main.width * 0.8, this.cameras.main.height * 0.2, 60, 0xFFEEAA, 0.9);
          celestialBody.setDepth(-98).setScrollFactor(0);
          const glow = this.add.circle(this.cameras.main.width * 0.8, this.cameras.main.height * 0.2, 80, 0xFFD700, 0.3);
          glow.setDepth(-98).setScrollFactor(0);
          this.tweens.add({ targets: glow, scale: 1.2, alpha: 0.15, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }

        createMountains() {
          this.createMountainLayer(0.05, -80, 0xB39DDB, 0.6, 400); 
          this.createMountainLayer(0.15, -70, 0x9575CD, 0.75, 500); 
          this.createMountainLayer(0.3, -60, 0x673AB7, 0.9, 600); 
        }

        createMountainLayer(scrollFactor, depth, color, alpha, baseHeight) {
          const graphics = this.add.graphics();
          graphics.setDepth(depth).setScrollFactor(scrollFactor, 0).fillStyle(color, alpha);
          const peaks = 12;
          const segmentWidth = this.worldWidth / peaks;
          graphics.beginPath();
          graphics.moveTo(0, this.worldHeight);
          for (let i = 0; i <= peaks; i++) {
            const x = i * segmentWidth;
            const peakHeight = baseHeight + Phaser.Math.Between(-100, 150);
            const y = this.worldHeight * 0.5 - peakHeight;
            if (i === 0) graphics.lineTo(x, y);
            else {
              const prevX = (i - 1) * segmentWidth;
              const prevY = this.worldHeight * 0.5 - (baseHeight + Phaser.Math.Between(-100, 150));
              const midX = (prevX + x) / 2;
              const midY = Math.min(prevY, y) - Phaser.Math.Between(50, 150);
              graphics.lineTo(midX, midY);
              graphics.lineTo(x, y);
            }
          }
          graphics.lineTo(this.worldWidth, this.worldHeight);
          graphics.closePath().fillPath();
          
          graphics.fillStyle(0xFFF0F5, alpha * 0.8); 
          for (let i = 0; i <= peaks; i++) {
            const x = i * segmentWidth;
            const y = this.worldHeight * 0.5 - (baseHeight + Phaser.Math.Between(-100, 150));
            graphics.fillTriangle(x - 40, y + 60, x, y, x + 40, y + 60);
          }
        }

        createClouds() {
          this.clouds = [];
          for (let layer = 0; layer < 3; layer++) {
            const scrollFactor = 0.1 + (layer * 0.1);
            const cloudCount = 9 + layer * 3;
            const depth = -50 + (layer * 5);
            const alpha = 0.4 + (layer * 0.2);
            for (let i = 0; i < cloudCount; i++) {
              const cloud = this.createCloud(Phaser.Math.Between(0, this.worldWidth), Phaser.Math.Between(100, 400), scrollFactor, depth, alpha);
              this.clouds.push(cloud);
            }
          }
        }

        createCloud(x, y, scrollFactor, depth, alpha) {
          const container = this.add.container(x, y);
          container.setDepth(depth).setScrollFactor(scrollFactor, 0);
          const cloudParts = [{ x: 0, y: 0, r: 40 }, { x: -30, y: 10, r: 35 }, { x: 30, y: 10, r: 35 }, { x: -15, y: -15, r: 30 }, { x: 15, y: -15, r: 30 }];
          cloudParts.forEach(part => container.add(this.add.circle(part.x, part.y, part.r, 0xffffff, alpha)));
          this.tweens.add({ targets: container, x: x + Phaser.Math.Between(50, 150), y: y + Phaser.Math.Between(-10, 10), duration: Phaser.Math.Between(8000, 15000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          return container;
        }

        createAnimations() {
          this.anims.create({ key: 'idle-anim', frames: this.anims.generateFrameNumbers('playerIdle', { start: 0, end: 49 }), frameRate: 40, repeat: -1 });
          this.anims.create({ key: 'run-anim', frames: this.anims.generateFrameNumbers('playerRun', { start: 0, end: 49 }), frameRate: 100, repeat: -1 });
        }

        createPlatform() {
          const graphics = this.add.graphics();
          const baseY = this.worldHeight * 0.92;
          for (let x = 0; x <= this.worldWidth; x += 10) {
            const y = baseY + Math.sin(x * 0.005) * 40;
            this.platformPoints.push({ x, y });
          }
          
          // Platform Fill (Depth 5)
          graphics.setDepth(5).fillStyle(0xE6B86A, 1).beginPath();
          graphics.moveTo(0, this.worldHeight);
          this.platformPoints.forEach(p => graphics.lineTo(p.x, p.y));
          graphics.lineTo(this.worldWidth, this.worldHeight).closePath().fillPath();
          
          // Green Line Top (Depth 5)
          graphics.lineStyle(10, 0x00DFA2, 1).beginPath();
          graphics.moveTo(this.platformPoints[0].x, this.platformPoints[0].y);
          this.platformPoints.forEach(p => graphics.lineTo(p.x, p.y));
          graphics.strokePath();
        }

        // NEW FUNCTION: Draws rocks from surface down to bottom
        createUndergroundRocks() {
          const rockGraphics = this.add.graphics();
          rockGraphics.setDepth(6); 
          const rockColors = [0x8B4513, 0x654321, 0x5D4037, 0x795548];

          // 1. COLUMN CONTROL: Increase this number (e.g., 40 or 50) to have fewer vertical lines of rocks
          const horizontalSpacing = 20; 

          for (let i = 0; i < this.platformPoints.length; i += horizontalSpacing) {
            
            // Random horizontal offset so columns aren't straight lines
            const point = this.platformPoints[i];
            
            // Start a bit deeper so they don't always hug the grass line perfectly
            let currentY = point.y + Phaser.Math.Between(20, 100); 

            while (currentY < this.worldHeight + 40) {
              
              // 2. RANDOM SKIP: 30% chance to just skip this rock entirely
              // This breaks up the "grid" look significantly
              if (Phaser.Math.FloatBetween(0, 1) > 0.3) {
                  
                  const width = Phaser.Math.Between(30, 60);
                  const height = Phaser.Math.Between(25, 45);
                  
                  // Add random X scatter so they aren't perfectly aligned vertically
                  const rockX = point.x + Phaser.Math.Between(-30, 30);
                  
                  rockGraphics.fillStyle(Phaser.Math.RND.pick(rockColors), 1);
                  rockGraphics.fillEllipse(rockX, currentY, width, height);
                  
                  rockGraphics.fillStyle(0x000000, 0.2);
                  rockGraphics.fillEllipse(rockX + 5, currentY + 5, width * 0.8, height * 0.8);
              }

              // 3. ROW CONTROL: Huge Vertical Gap
              // Instead of adding just 'height', we add height + a big random gap (e.g. 50 to 150px)
              // This makes them scattered far apart vertically.
              const verticalGap = Phaser.Math.Between(80, 200); 
              currentY += verticalGap; 
            }
          }
        }

        addWorldContent() {
          const statueX = this.worldWidth - 300;
          const statueIdx = Math.floor((statueX / this.worldWidth) * (this.platformPoints.length - 1));
          const statueY = this.platformPoints[statueIdx].y;
          
          this.add.image(statueX, statueY + 150, 'statue')
            .setOrigin(0.5, 1) 
            .setScale(.35)
            .setDepth(4);

          const cards = [{ key: 'htmlCard', x: 1100 }, { key: 'cssCard', x: 1400 }, { key: 'jsCard', x: 1700 }];
          cards.forEach(item => {
            const idx = Math.floor((item.x / this.worldWidth) * (this.platformPoints.length - 1));
            const y = this.platformPoints[idx].y;
            this.add.image(item.x, y - 250, item.key).setScale(0.6).setDepth(15);
          });

          const trees = [{ x: 2300 }, { x: 3400 }];
          trees.forEach(item => {
            const idx = Math.floor((item.x / this.worldWidth) * (this.platformPoints.length - 1));
            const y = this.platformPoints[idx].y;
            this.add.image(item.x, y+330, 'tree').setOrigin(0.5, 1).setDepth(2);
          });

          const benchX = 2800;
          const benchIdx = Math.floor((benchX / this.worldWidth) * (this.platformPoints.length - 1));
          const benchY = this.platformPoints[benchIdx].y;
          this.add.image(benchX, benchY - 85, 'benchGuy').setScale(0.6).setDepth(10);
        }

        addGrassAndFlowers() {
          // Add grass blades across the entire platform
          for (let x = 0; x < this.worldWidth; x += 30) {
            const idx = Math.floor((x / this.worldWidth) * (this.platformPoints.length - 1));
            const platformY = this.platformPoints[idx].y;
            
            // Create grass blade
            const grassGraphics = this.add.graphics();
            grassGraphics.setPosition(x, platformY - 8);
            grassGraphics.setDepth(7); // Increased to 7 to be above rocks
            
            const grassHeight = Phaser.Math.Between(15, 30);
            const grassColor = Phaser.Math.RND.pick([0x3CB371, 0x2E8B57, 0x90EE90]);
            
            grassGraphics.lineStyle(2, grassColor, 0.8);
            grassGraphics.beginPath();
            grassGraphics.moveTo(0, 0);
            grassGraphics.lineTo(Phaser.Math.Between(-3, 3), -grassHeight);
            grassGraphics.strokePath();
            
            // Add sway animation
            this.tweens.add({
              targets: grassGraphics,
              rotation: Phaser.Math.FloatBetween(-0.15, 0.15),
              duration: Phaser.Math.Between(1500, 2500),
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });
          }
          
          // Add flowers sporadically
          for (let i = 0; i < 100; i++) {
            const x = Phaser.Math.Between(50, this.worldWidth - 50);
            const idx = Math.floor((x / this.worldWidth) * (this.platformPoints.length - 1));
            const platformY = this.platformPoints[idx].y;
            
            // Flower stem
            const flowerGraphics = this.add.graphics();
            flowerGraphics.setPosition(x, platformY - 10);
            flowerGraphics.setDepth(7); // Increased to 7
            
            flowerGraphics.lineStyle(1.5, 0x228B22, 1);
            flowerGraphics.beginPath();
            flowerGraphics.moveTo(0, 0);
            flowerGraphics.lineTo(0, -25);
            flowerGraphics.strokePath();
            
            // Flower petals
            const flowerColors = [0xFF69B4, 0xFFD700, 0xFF6347, 0xBA55D3, 0xFFFFFF];
            const flowerColor = Phaser.Math.RND.pick(flowerColors);
            const centerX = x;
            const centerY = platformY - 35;
            
            // Center of flower
            const center = this.add.circle(centerX, centerY, 3, 0xFFD700, 1);
            center.setDepth(7);
            
            // Petals
            for (let p = 0; p < 5; p++) {
              const angle = (p / 5) * Math.PI * 2;
              const petalX = centerX + Math.cos(angle) * 6;
              const petalY = centerY + Math.sin(angle) * 6;
              const petal = this.add.circle(petalX, petalY, 4, flowerColor, 1);
              petal.setDepth(7);
              
              // Gentle sway
              this.tweens.add({
                targets: petal,
                y: petalY + Phaser.Math.FloatBetween(-1, 1),
                duration: Phaser.Math.Between(2000, 3000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
              });
            }
            
            // Sway the stem
            this.tweens.add({
              targets: flowerGraphics,
              rotation: Phaser.Math.FloatBetween(-0.1, 0.1),
              duration: Phaser.Math.Between(2000, 3000),
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });
            
            this.tweens.add({
              targets: center,
              x: centerX + Phaser.Math.FloatBetween(-1, 1),
              duration: Phaser.Math.Between(2000, 3000),
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });
          }
        }

        addWindEffect() {
          // Wind zone between x: 2300 to x: 3400
          const windStartX = 2300;
          const windEndX = 3400;
          
          // Create leaf particle emitter
          const leafEmitter = this.add.particles(0, 0, 'leaf', {
            x: { min: windStartX, max: windEndX },
            y: { min: this.worldHeight * 0.5, max: this.worldHeight * 0.9 },
            speedX: { min: 80, max: 150 },
            speedY: { min: -30, max: 30 },
            angle: { min: -10, max: 10 },
            rotate: { min: 0, max: 360 },
            lifespan: 4000,
            gravityY: 20,
            scale: { start: 0.8, end: 0.3 },
            alpha: { start: 0.8, end: 0 },
            frequency: 60,
            tint: [0x90EE90, 0x98FB98, 0x32CD32, 0xADFF2F],
            blendMode: 'NORMAL'
          });
          
          leafEmitter.setDepth(3);
          
          // Add wind lines (subtle animated streaks)
          for (let i = 0; i < 15; i++) {
            const windLine = this.add.graphics();
            const startX = Phaser.Math.Between(windStartX, windEndX);
            const startY = Phaser.Math.Between(this.worldHeight * 0.4, this.worldHeight * 0.85);
            
            windLine.lineStyle(1, 0xFFFFFF, 0.15);
            windLine.beginPath();
            windLine.moveTo(0, 0);
            windLine.lineTo(40, Phaser.Math.Between(-5, 5));
            windLine.strokePath();
            
            windLine.setPosition(startX, startY);
            windLine.setDepth(3);
            
            // Animate wind streaks moving horizontally
            this.tweens.add({
              targets: windLine,
              x: startX + 300,
              alpha: { from: 0.3, to: 0 },
              duration: 2000,
              repeat: -1,
              repeatDelay: Phaser.Math.Between(500, 2000),
              onRepeat: () => {
                windLine.x = Phaser.Math.Between(windStartX, windEndX);
                windLine.y = Phaser.Math.Between(this.worldHeight * 0.4, this.worldHeight * 0.85);
              }
            });
          }
        }

        update() {
          const speed = 12;
          let moving = false;
          const moveLeft = this.cursors.left.isDown || window.moveLeftActive;
          const moveRight = this.cursors.right.isDown || window.moveRightActive;

          if (moveLeft) { this.player.x -= speed; this.player.setFlipX(true); moving = true; } 
          else if (moveRight) { this.player.x += speed; this.player.setFlipX(false); moving = true; }
          
          if (moving) { if (this.player.anims.currentAnim?.key !== 'run-anim') this.player.play('run-anim', true); } 
          else { if (this.player.anims.currentAnim?.key !== 'idle-anim') this.player.play('idle-anim', true); }
          
          this.player.x = Phaser.Math.Clamp(this.player.x, 50, this.worldWidth - 50);
          
          if (this.platformPoints.length > 0) {
            const index = Math.floor((this.player.x / this.worldWidth) * (this.platformPoints.length - 1));
            const point = this.platformPoints[Math.max(0, index)];
            if (point) {
              const targetY = point.y - (this.player.displayHeight / 2) + 50;
              this.player.y += (targetY - this.player.y) * 0.2;
            }
          }
        }
      }

      const config = {
        type: Phaser.AUTO,
        parent: gameRef.current,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: '#82DCD2', 
        physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
        scene: GameScene,
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
      };
      phaserGameRef.current = new Phaser.Game(config);
    });

    return () => phaserGameRef.current?.destroy(true);
  }, [imagesLoaded]);

  useEffect(() => {
    window.moveLeftActive = isLeftDown;
    window.moveRightActive = isRightDown;
  }, [isLeftDown, isRightDown]);

  return (
    <div style={styles.container}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Beau+Rivage&display=swap');
      `}</style>
      <div ref={gameRef} style={styles.game} />
      <div style={styles.controlsLayer}>
        <div style={styles.btnRow}>
          <button style={styles.circleBtn}
            onMouseDown={() => setIsLeftDown(true)} onMouseUp={() => setIsLeftDown(false)}
            onTouchStart={(e) => { e.preventDefault(); setIsLeftDown(true); }} onTouchEnd={() => setIsLeftDown(false)}
          > ← </button>
          <button style={styles.circleBtn}
            onMouseDown={() => setIsRightDown(true)} onMouseUp={() => setIsRightDown(false)}
            onTouchStart={(e) => { e.preventDefault(); setIsRightDown(true); }} onTouchEnd={() => setIsRightDown(false)}
          > → </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#82DCD2', touchAction: 'none' },
  game: { width: '100%', height: '100%' },
  controlsLayer: { position: 'absolute', bottom: '10%', left: '0', width: '100%', display: 'flex', justifyContent: 'center', pointerEvents: 'none' },
  btnRow: { display: 'flex', gap: '40px', pointerEvents: 'auto' },
  circleBtn: { width: '80px', height: '80px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.3)', color: 'white', fontSize: '30px', cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)', userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }
};