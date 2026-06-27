import React, { useEffect, useState } from "react";
import { motion } from "motion/react";

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  shape: "circle" | "square" | "triangle";
  delay: number;
  duration: number;
  endX: number;
  endY: number;
}

const COLORS = [
  "#10B981", // Brand Primary (Emerald)
  "#3B82F6", // Blue
  "#F59E0B", // Gold
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#06B6D4", // Teal
  "#EF4444"  // Red
];

const SHAPES: ("circle" | "square" | "triangle")[] = ["circle", "square", "triangle"];

export const Confetti: React.FC = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const generated: Particle[] = Array.from({ length: 80 }).map((_, i) => {
      const angle = Math.random() * Math.PI * 2; // Full circle
      const distance = 80 + Math.random() * 250; // Random distance outwards
      
      return {
        id: i,
        x: 0,
        y: 0,
        rotation: Math.random() * 360,
        scale: 0.4 + Math.random() * 0.8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        delay: Math.random() * 0.2,
        duration: 1.5 + Math.random() * 2,
        endX: Math.cos(angle) * distance,
        endY: Math.sin(angle) * distance + (150 + Math.random() * 250), // Fall down
      };
    });
    setParticles(generated);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50 flex items-center justify-center">
      {particles.map((p) => {
        const shapeStyle =
          p.shape === "circle"
            ? "rounded-full"
            : p.shape === "triangle"
            ? "w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[12px]"
            : "rounded-sm";

        return (
          <motion.div
            key={p.id}
            initial={{
              x: 0,
              y: 0,
              rotation: 0,
              scale: 0,
              opacity: 1,
            }}
            animate={{
              x: p.endX,
              y: p.endY,
              rotate: p.rotation + 720,
              scale: p.scale,
              opacity: [1, 1, 0.8, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: [0.1, 0.8, 0.3, 1], // Custom cubic-bezier for burst deceleration
            }}
            style={{
              position: "absolute",
              width: p.shape === "triangle" ? 0 : "12px",
              height: p.shape === "triangle" ? 0 : "12px",
              backgroundColor: p.shape === "triangle" ? "transparent" : p.color,
              borderBottomColor: p.shape === "triangle" ? p.color : undefined,
            }}
            className={shapeStyle}
          />
        );
      })}
    </div>
  );
};
