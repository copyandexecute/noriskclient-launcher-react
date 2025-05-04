"use client";

import React, { useRef, useEffect } from 'react';

const MatrixRainEffect: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Configuration
    const FONT_SIZE = 16;
    const CHARACTERS = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // Katakana + Alphanumeric
    const charactersArray = CHARACTERS.split('');
    const RAINDROP_SPAWN_RATE = 0.99; // Chance to NOT spawn a drop per column per tick

    let columns: number;
    let drops: { y: number, trail: number, speed: number, ticksLeft: number }[];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.floor(canvas.width / FONT_SIZE);
      drops = Array(columns).fill(null).map(() => ({
        y: 1, // Start position Y
        trail: Math.floor(Math.random() * (canvas.height / FONT_SIZE * 0.8) + 5),
        speed: Math.random() * 1 + 0.5, // Reverted speed range (0.5 to 1.5)
        ticksLeft: 0, // Ticks left for current animation cycle
      }));
    };

    // Initialize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    context.font = `${FONT_SIZE}px monospace`;

    let animationFrameId: number;

    const draw = () => {
      // Semi-transparent black background for fading effect
      context.fillStyle = 'rgba(0, 0, 0, 0.05)';
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.fillStyle = '#555'; // Reverted text color to dark grey

      for (let i = 0; i < drops.length; i++) {
        const drop = drops[i];
        const text = charactersArray[Math.floor(Math.random() * charactersArray.length)];

        // Draw the character
        context.fillText(text, i * FONT_SIZE, drop.y * FONT_SIZE);

        // Move the drop down
        if (drop.y * FONT_SIZE > canvas.height && Math.random() > RAINDROP_SPAWN_RATE) {
           // Reset drop to top after it goes off screen, with a random chance
           drops[i] = {
             y: 0,
             trail: Math.floor(Math.random() * (canvas.height / FONT_SIZE * 0.8) + 5),
             speed: Math.random() * 1 + 0.5, // Reverted speed range on reset
             ticksLeft: 0, // Reset ticks
           };
        }
        // Reverted the increment speed
        drops[i].y += drop.speed * 0.2;

      }
       animationFrameId = window.requestAnimationFrame(draw);
    };

     draw(); // Start the animation loop

    // Cleanup function
    return () => {
       window.removeEventListener('resize', resizeCanvas);
       window.cancelAnimationFrame(animationFrameId);
    };

  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0, // Ensure it's behind other content
        // background: 'black' // Optional: Set initial background if needed before JS loads
      }}
    />
  );
};

export default MatrixRainEffect; 