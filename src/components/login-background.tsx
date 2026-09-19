'use client';

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

// Gradient enumeration animation component
function AnimatedGradient() {
  const [index, setIndex] = useState(0);
  
  const gradients = [
    "from-blue-500/10 via-purple-500/10 to-cyan-500/10",
    "from-purple-500/10 via-pink-500/10 to-red-500/10",
    "from-cyan-500/10 via-blue-500/10 to-indigo-500/10",
    "from-emerald-500/10 via-teal-500/10 to-cyan-500/10",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % gradients.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradients[index]} transition-all duration-1000`} />
    </div>
  );
}

// Floating particles/orbs
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        animate={{
          y: [0, -30, 0],
          x: [0, 20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0,
        }}
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[#3B6BF6]/20 blur-3xl"
      />
      <motion.div
        animate={{
          y: [0, 40, 0],
          x: [0, -30, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-[#22D3EE]/15 blur-3xl"
      />
      <motion.div
        animate={{
          y: [0, -20, 0],
          x: [0, 15, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute top-1/3 right-1/3 w-48 h-48 rounded-full bg-[#A855F7]/15 blur-3xl"
      />
    </div>
  );
}

// Grid pattern overlay
function GridPattern() {
  return (
    <div 
      className="absolute inset-0 opacity-5"
      style={{
        backgroundImage: `
          linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }}
    />
  );
}

// Vignette overlay
function Vignette() {
  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{
        background: 'radial-gradient(ellipse at center, transparent 0%, rgba(5, 7, 15, 0.4) 70%, rgba(5, 7, 15, 1) 100%)',
      }}
    />
  );
}

export default function LoginBackground() {
  return (
    <>
      {/* Main background image */}
      <div className="absolute inset-0">
        <Image
          src="/wpu-campus.jpg"
          alt="WPU Main Campus, Aborlan, Palawan"
          fill
          priority
          className="object-cover"
          style={{
            filter: 'brightness(0.6) contrast(1.1) saturate(0.8)',
          }}
        />
      </div>
      
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#05070F] via-[#05070F]/85 to-[#05070F]/50" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#05070F] via-transparent to-[#05070F]/70" />
      
      {/* Animated elements */}
      <AnimatedGradient />
      <FloatingOrbs />
      <GridPattern />
      <Vignette />
      
      {/* Subtle top border glow */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#3B6BF6]/50 to-transparent to-[#22D3EE]/50" />
    </>
  );
}