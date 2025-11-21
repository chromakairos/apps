import React, { useState, useEffect, useRef } from 'react';

export default function InteractiveSnowglobe() {
  const [snowflakes, setSnowflakes] = useState([]);
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [showNightSky, setShowNightSky] = useState(false);
  const [message, setMessage] = useState('Merry Christmas!');
  const [stars, setStars] = useState([]);
  const lastAcceleration = useRef({ x: 0, y: 0, z: 0 });
  const snowflakeIdRef = useRef(0);

  // Get message from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlMessage = urlParams.get('message');
    if (urlMessage) {
      setMessage(decodeURIComponent(urlMessage));
    }
  }, []);

  // Generate stars for night sky
  useEffect(() => {
    const newStars = [];
    for (let i = 0; i < 50; i++) {
      newStars.push({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 3 + 1,
        animationDelay: Math.random() * 4,
        animationDuration: Math.random() * 2 + 3
      });
    }
    setStars(newStars);
  }, []);

  // Fade to night sky after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNightSky(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  // Device motion detection for shake
  useEffect(() => {
    const handleDeviceMotion = (event) => {
      if (showNightSky) return;

      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) return;

      const deltaX = Math.abs(acceleration.x - lastAcceleration.current.x);
      const deltaY = Math.abs(acceleration.y - lastAcceleration.current.y);
      const deltaZ = Math.abs(acceleration.z - lastAcceleration.current.z);

      const totalDelta = deltaX + deltaY + deltaZ;
      
      lastAcceleration.current = {
        x: acceleration.x,
        y: acceleration.y,
        z: acceleration.z
      };

      if (totalDelta > 15) {
        const intensity = Math.min(totalDelta / 30, 1);
        setShakeIntensity(intensity);
        
        // Create snowflakes based on shake intensity
        const flakeCount = Math.floor(intensity * 20) + 5;
        createSnowflakes(flakeCount, intensity);
      }
    };

    // Request permission for device motion (iOS 13+)
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission().then(response => {
        if (response === 'granted') {
          window.addEventListener('devicemotion', handleDeviceMotion);
        }
      });
    } else {
      window.addEventListener('devicemotion', handleDeviceMotion);
    }

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
    };
  }, [showNightSky]);

  // Fallback: mouse movement for desktop testing
  useEffect(() => {
    let isMouseDown = false;
    let lastMousePos = { x: 0, y: 0 };

    const handleMouseDown = () => { isMouseDown = true; };
    const handleMouseUp = () => { isMouseDown = false; };
    const handleMouseMove = (e) => {
      if (!isMouseDown || showNightSky) return;
      
      const deltaX = Math.abs(e.clientX - lastMousePos.x);
      const deltaY = Math.abs(e.clientY - lastMousePos.y);
      const totalDelta = deltaX + deltaY;
      
      if (totalDelta > 20) {
        const intensity = Math.min(totalDelta / 100, 1);
        setShakeIntensity(intensity);
        createSnowflakes(Math.floor(intensity * 15) + 3, intensity);
      }
      
      lastMousePos = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [showNightSky]);

  const createSnowflakes = (count, intensity) => {
    const newFlakes = [];
    for (let i = 0; i < count; i++) {
      const size = Math.random() * (2 + intensity * 3) + 2;
      newFlakes.push({
        id: snowflakeIdRef.current++,
        left: Math.random() * 100,
        top: -10,
        size,
        opacity: Math.random() * 0.8 + 0.2,
        fallSpeed: Math.random() * (2 + intensity * 3) + 1,
        horizontalDrift: (Math.random() - 0.5) * 2
      });
    }
    
    setSnowflakes(prev => [...prev, ...newFlakes]);
  };

  // Animate snowflakes falling
  useEffect(() => {
    if (showNightSky) return;

    const interval = setInterval(() => {
      setSnowflakes(prev => 
        prev
          .map(flake => ({
            ...flake,
            top: flake.top + flake.fallSpeed,
            left: flake.left + flake.horizontalDrift * 0.1
          }))
          .filter(flake => flake.top < 110) // Remove flakes that have fallen off screen
      );
    }, 50);

    return () => clearInterval(interval);
  }, [showNightSky]);

  // Decay shake intensity
  useEffect(() => {
    if (shakeIntensity > 0) {
      const timeout = setTimeout(() => {
        setShakeIntensity(prev => Math.max(0, prev - 0.1));
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [shakeIntensity]);

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-gradient-to-b from-blue-200 to-blue-100">
      {/* Snowglobe Scene */}
      <div 
        className={`absolute inset-0 transition-opacity duration-[4000ms] ${
          showNightSky ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Sky gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-200 via-blue-100 to-white" />
        
        {/* Snowflakes */}
        {snowflakes.map(flake => (
          <div
            key={flake.id}
            className="absolute rounded-full bg-white shadow-sm pointer-events-none"
            style={{
              left: `${flake.left}%`,
              top: `${flake.top}%`,
              width: `${flake.size}px`,
              height: `${flake.size}px`,
              opacity: flake.opacity,
              transform: `translateZ(0)` // Force hardware acceleration
            }}
          />
        ))}
        
        {/* Snowman GIF - centered */}
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
          <img 
            src="assets/snowman.gif" 
            alt="Animated snowman"
            className="w-32 h-32 object-contain"
          />
        </div>
        
        {/* Shake instruction */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center text-gray-700">
          <p className="text-lg font-medium">Shake your device to make it snow!</p>
          <p className="text-sm opacity-75">(or drag mouse on desktop)</p>
        </div>
      </div>

      {/* Night Sky Scene */}
      <div 
        className={`absolute inset-0 transition-opacity duration-[4000ms] ${
          showNightSky ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Night sky gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-indigo-900 to-gray-900" />
        
        {/* Animated stars */}
        {stars.map(star => (
          <div
            key={star.id}
            className="absolute bg-white rounded-full animate-pulse"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.animationDelay}s`,
              animationDuration: `${star.animationDuration}s`,
            }}
          />
        ))}
        
        {/* Message */}
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 
            className="text-white text-6xl md:text-8xl font-bold text-center px-4"
            style={{
              fontFamily: 'Brush Script MT, cursive, sans-serif',
              textShadow: '0 0 20px rgba(255,255,255,0.5)',
              animation: 'fadeInGlow 2s ease-in-out'
            }}
          >
            {message}
          </h1>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInGlow {
          0% {
            opacity: 0;
            transform: scale(0.8);
            text-shadow: 0 0 5px rgba(255,255,255,0.2);
          }
          100% {
            opacity: 1;
            transform: scale(1);
            text-shadow: 0 0 20px rgba(255,255,255,0.5);
          }
        }
      `}</style>
    </div>
  );
}