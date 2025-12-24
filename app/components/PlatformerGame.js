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
      const imageUrls = {
        htmlCard: '/HtmlTarotCard.png',
        cssCard: '/CssTarotCard.png',
        jsCard: '/JavaScriptTarotCard.png',
        run: '/run.png',   
        idle: '/idle.png'  
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
          this.worldWidth = 4000;
          this.worldHeight = 2250;
          this.platformPoints = [];
        }

        preload() {
          ['htmlCard', 'cssCard', 'jsCard'].forEach(key => {
            if (imagesRef.current[key]) this.textures.addImage(key, imagesRef.current[key]);
          });
          
          const COLS = 8;
          const ROWS = 7;

          // Load Run & Idle (Both 8x7 Grids)
          const runImg = imagesRef.current.run;
          if (runImg) {
            this.textures.addSpriteSheet('playerRun', runImg, {
              frameWidth: runImg.width / COLS,
              frameHeight: runImg.height / ROWS
            });
          }
          
          const idleImg = imagesRef.current.idle;
          if (idleImg) {
            this.textures.addSpriteSheet('playerIdle', idleImg, {
              frameWidth: idleImg.width / COLS,
              frameHeight: idleImg.height / ROWS
            });
          }
        }

        create() {
          this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
          this.createPlatform();
          this.addPaintings();
          
          // Animations
          this.anims.create({
            key: 'idle-anim',
            frames: this.anims.generateFrameNumbers('playerIdle', { start: 0, end: 49 }),
            frameRate: 24,
            repeat: -1
          });

          this.anims.create({
            key: 'run-anim',
            frames: this.anims.generateFrameNumbers('playerRun', { start: 0, end: 49 }),
            frameRate: 60,
            repeat: -1
          });
          
          // Player setup
          this.player = this.physics.add.sprite(200, this.worldHeight * 0.8, 'playerIdle');
          this.player.setScale(0.4); 
          this.player.setDepth(10);
          this.player.play('idle-anim');
          
          this.cursors = this.input.keyboard.createCursorKeys();
          
          this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
          this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
          this.cameras.main.setFollowOffset(-this.cameras.main.width * 0.15, 0);
        }

        createPlatform() {
          const graphics = this.add.graphics();
          const baseY = this.worldHeight * 0.85;
          
          for (let x = 0; x <= this.worldWidth; x += 10) {
            const y = baseY + Math.sin(x * 0.005) * 40;
            this.platformPoints.push({ x, y });
          }

          // PLATFORM COLORS: Light Brown Fill
          graphics.fillStyle(0xd2b48c, 1); 
          graphics.beginPath();
          graphics.moveTo(0, this.worldHeight);
          this.platformPoints.forEach(p => graphics.lineTo(p.x, p.y));
          graphics.lineTo(this.worldWidth, this.worldHeight);
          graphics.closePath();
          graphics.fillPath();

          // STROKE COLOR: Green
          graphics.lineStyle(8, 0x228b22, 1);
          graphics.beginPath();
          graphics.moveTo(this.platformPoints[0].x, this.platformPoints[0].y);
          this.platformPoints.forEach(p => graphics.lineTo(p.x, p.y));
          graphics.strokePath();
        }

        addPaintings() {
          const cards = [{ key: 'htmlCard', x: 1200 }, { key: 'cssCard', x: 1800 }, { key: 'jsCard', x: 2400 }];
          cards.forEach(card => {
            const idx = Math.floor((card.x / this.worldWidth) * (this.platformPoints.length - 1));
            const y = this.platformPoints[idx].y;
            this.add.image(card.x, y - 250, card.key).setScale(0.7).setDepth(5);
          });
        }

        update() {
          const speed = 10;
          let moving = false;
          
          const moveLeft = this.cursors.left.isDown || window.moveLeftActive;
          const moveRight = this.cursors.right.isDown || window.moveRightActive;

          if (moveLeft) {
            this.player.x -= speed;
            this.player.setFlipX(true);
            moving = true;
          } else if (moveRight) {
            this.player.x += speed;
            this.player.setFlipX(false);
            moving = true;
          }
          
          if (moving) {
            if (this.player.anims.currentAnim?.key !== 'run-anim') this.player.play('run-anim', true);
          } else {
            if (this.player.anims.currentAnim?.key !== 'idle-anim') this.player.play('idle-anim', true);
          }
          
          this.player.x = Phaser.Math.Clamp(this.player.x, 100, this.worldWidth - 100);
          const index = Math.floor((this.player.x / this.worldWidth) * (this.platformPoints.length - 1));
          const targetY = this.platformPoints[Math.max(0, index)].y - (this.player.displayHeight / 2)+50;
          this.player.y += (targetY - this.player.y) * 0.2;
        }
      }

      const config = {
        type: Phaser.AUTO,
        parent: gameRef.current,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: '#87CEEB', // BACKGROUND COLOR: Sky Blue
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
      <div ref={gameRef} style={styles.game} />
      
      <div style={styles.controlsLayer}>
        <div style={styles.btnRow}>
          <button 
            style={styles.circleBtn}
            onMouseDown={() => setIsLeftDown(true)}
            onMouseUp={() => setIsLeftDown(false)}
            onTouchStart={(e) => { e.preventDefault(); setIsLeftDown(true); }}
            onTouchEnd={() => setIsLeftDown(false)}
          > ← </button>
          <button 
            style={styles.circleBtn}
            onMouseDown={() => setIsRightDown(true)}
            onMouseUp={() => setIsRightDown(false)}
            onTouchStart={(e) => { e.preventDefault(); setIsRightDown(true); }}
            onTouchEnd={() => setIsRightDown(false)}
          > → </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#87CEEB', touchAction: 'none' },
  game: { width: '100%', height: '100%' },
  controlsLayer: { position: 'absolute', bottom: '10%', left: '0', width: '100%', display: 'flex', justifyContent: 'center', pointerEvents: 'none' },
  btnRow: { display: 'flex', gap: '40px', pointerEvents: 'auto' },
  circleBtn: {
    width: '80px', height: '80px', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)',
    background: 'rgba(255,255,255,0.4)', color: 'black', fontSize: '30px', cursor: 'pointer', outline: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)'
  }
};