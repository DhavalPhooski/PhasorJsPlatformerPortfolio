'use client';

import { useEffect, useRef, useState } from 'react';

export default function PlatformerGame() {
  const gameRef = useRef(null);
  const phaserGameRef = useRef(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const imagesRef = useRef({});
  
  // State to track mobile/button inputs
  const [isLeftDown, setIsLeftDown] = useState(false);
  const [isRightDown, setIsRightDown] = useState(false);

  useEffect(() => {
    const loadImages = async () => {
      const imageUrls = {
        htmlCard: '/HtmlTarotCard.png',
        cssCard: '/CssTarotCard.png',
        jsCard: '/JavaScriptTarotCard.png',
        spritesheet: '/spritesheet.png',
        idleSpritesheet: '/idle.png'
      };

      const loadPromises = Object.entries(imageUrls).map(([key, url]) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            if (key === 'spritesheet') {
              const maxWidth = 12500; 
              const scale = maxWidth / img.width;
              const canvas = document.createElement('canvas');
              canvas.width = maxWidth;
              canvas.height = img.height * scale;
              const ctx = canvas.getContext('2d');
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              
              const resizedImg = new Image();
              resizedImg.onload = () => {
                imagesRef.current[key] = resizedImg;
                resolve();
              };
              resizedImg.src = canvas.toDataURL();
            } else {
              imagesRef.current[key] = img;
              resolve();
            }
          };
          img.onerror = reject;
          img.src = url;
        });
      });

      try {
        await Promise.all(loadPromises);
        setImagesLoaded(true);
      } catch (error) {
        console.error('Failed to load images:', error);
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
          this.player = null;
          this.cursors = null;
          this.platformPoints = [];
          this.worldWidth = 4000;
          this.worldHeight = 2250;
        }

        preload() {
          ['htmlCard', 'cssCard', 'jsCard'].forEach(key => {
            if (imagesRef.current[key]) this.textures.addImage(key, imagesRef.current[key]);
          });
          
          if (imagesRef.current.spritesheet) {
            this.textures.addSpriteSheet('playerRun', imagesRef.current.spritesheet, {
              frameWidth: 250, frameHeight: 250
            });
          }
          
          if (imagesRef.current.idleSpritesheet) {
            this.textures.addSpriteSheet('playerIdle', imagesRef.current.idleSpritesheet, {
              frameWidth: 500, frameHeight: 500
            });
          }
        }

        create() {
          this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
          this.createPlatform();
          this.addPaintings();
          this.createAnimations();
          
          this.player = this.physics.add.sprite(200, this.worldHeight * 0.85, 'playerIdle');
          this.player.setScale(0.4); 
          this.player.body.setCollideWorldBounds(true);
          this.player.play('idle');
          this.player.setDepth(5); 
          
          this.cursors = this.input.keyboard.createCursorKeys();
          
          this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
          this.cameras.main.startFollow(this.player, false, 0.1, 0.1);
          this.cameras.main.setFollowOffset(-this.cameras.main.width * 0.15, 0);
        }

        createAnimations() {
          this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers('playerIdle', { start: 0, end: 49 }),
            frameRate: 30,
            repeat: -1
          });
          this.anims.create({
            key: 'run',
            frames: this.anims.generateFrameNumbers('playerRun', { start: 0, end: 49 }),
            frameRate: 90,
            repeat: -1
          });
        }

        createPlatform() {
          const graphics = this.add.graphics();
          const midHeight = this.worldHeight * 0.85;
          const amplitude = this.worldHeight / 50;
          const frequency = (Math.PI * 4) / this.worldWidth;
          for (let x = 0; x <= this.worldWidth; x += 5) {
            const y = midHeight + Math.sin(x * frequency) * amplitude;
            this.platformPoints.push({ x, y });
          }
          graphics.fillStyle(0x4a90e2, 1);
          graphics.beginPath();
          graphics.moveTo(0, this.worldHeight);
          this.platformPoints.forEach(p => graphics.lineTo(p.x, p.y));
          graphics.lineTo(this.worldWidth, this.worldHeight);
          graphics.closePath();
          graphics.fillPath();
          graphics.lineStyle(3, 0x2c5aa0, 1);
          graphics.beginPath();
          graphics.moveTo(this.platformPoints[0].x, this.platformPoints[0].y);
          this.platformPoints.forEach(p => graphics.lineTo(p.x, p.y));
          graphics.strokePath();
        }

        addPaintings() {
          const cards = [{ key: 'htmlCard', x: 1000 }, { key: 'cssCard', x: 1300 }, { key: 'jsCard', x: 1600 }];
          cards.forEach(card => {
            const y = this.getPlatformHeightAt(card.x);
            const img = this.add.image(card.x, y - 200, card.key);
            img.setScale(0.6).setDepth(10);
          });
        }

        getPlatformHeightAt(x) {
          const index = Math.floor((x / this.worldWidth) * (this.platformPoints.length - 1));
          const safeIndex = Math.max(0, Math.min(index, this.platformPoints.length - 1));
          return this.platformPoints[safeIndex].y;
        }

        update() {
          const speed = 8;
          let isMoving = false;
          
          // Check Keyboard OR Button State
          const moveLeft = this.cursors.left.isDown || window.moveLeftActive;
          const moveRight = this.cursors.right.isDown || window.moveRightActive;

          if (moveLeft) {
            this.player.x -= speed;
            this.player.setFlipX(true);
            isMoving = true;
          } else if (moveRight) {
            this.player.x += speed;
            this.player.setFlipX(false);
            isMoving = true;
          }
          
          if (isMoving) {
            if (this.player.anims.currentAnim?.key !== 'run') {
              this.player.play('run', true);
              this.player.setScale(0.8); 
            }
          } else {
            if (this.player.anims.currentAnim?.key !== 'idle') {
              this.player.play('idle', true);
              this.player.setScale(0.4); 
            }
          }
          
          this.player.x = Phaser.Math.Clamp(this.player.x, 20, this.worldWidth - 20);
          const targetY = this.getPlatformHeightAt(this.player.x) - (this.player.displayHeight / 2)+50;
          this.player.y += (targetY - this.player.y) * 0.15;
        }
      }

      const config = {
        type: Phaser.AUTO,
        parent: gameRef.current,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: '#1a1a2e',
        physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
        scene: GameScene,
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
      };

      phaserGameRef.current = new Phaser.Game(config);
    });

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, [imagesLoaded]);

  // Sync button state to a global window variable for Phaser to read
  useEffect(() => {
    window.moveLeftActive = isLeftDown;
    window.moveRightActive = isRightDown;
  }, [isLeftDown, isRightDown]);

  return (
    <div style={styles.container}>
      {!imagesLoaded && <div style={styles.loading}>Loading Assets...</div>}
      <div ref={gameRef} style={styles.game} />
      
      {/* Mobile/On-Screen Controls */}
      <div style={styles.buttonContainer}>
        <button 
          style={styles.navButton}
          onMouseDown={() => setIsLeftDown(true)}
          onMouseUp={() => setIsLeftDown(false)}
          onMouseLeave={() => setIsLeftDown(false)}
          onTouchStart={(e) => { e.preventDefault(); setIsLeftDown(true); }}
          onTouchEnd={() => setIsLeftDown(false)}
        >
          ←
        </button>
        <button 
          style={styles.navButton}
          onMouseDown={() => setIsRightDown(true)}
          onMouseUp={() => setIsRightDown(false)}
          onMouseLeave={() => setIsRightDown(false)}
          onTouchStart={(e) => { e.preventDefault(); setIsRightDown(true); }}
          onTouchEnd={() => setIsRightDown(false)}
        >
          →
        </button>
      </div>

      <div style={styles.controls}>
        <p style={styles.text}>Keyboard Arrows or On-Screen Buttons</p>
      </div>
    </div>
  );
}

const styles = {
  container: { position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#1a1a2e' },
  game: { width: '100%', height: '100%' },
  loading: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', fontSize: '24px', zIndex: 100 },
  buttonContainer: {
    position: 'absolute',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '20px',
    zIndex: 20
  },
  navButton: {
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.4)',
    background: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(5px)',
    color: 'white',
    fontSize: '32px',
    cursor: 'pointer',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
    outline: 'none'
  },
  controls: { position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.5)', padding: '10px 20px', borderRadius: '8px', zIndex: 10 },
  text: { color: 'white', margin: 0, fontSize: '14px' }
};