class InteractiveSnowglobe {
    constructor() {
        this.snowflakes = [];
        this.stars = [];
        this.shakeIntensity = 0;
        this.showNightSky = false;
        this.lastAcceleration = { x: 0, y: 0, z: 0 };
        this.snowflakeId = 0;
        this.animationFrame = null;
        this.lastSnowTime = 0;
        this.timerStarted = false;
        
        this.init();
    }
    
    init() {
        this.setupMessage();
        this.createStars();
        this.setupEventListeners();
        this.startAnimationLoop();
        // DON'T start timer here - wait for permission button click
    }
    
    setupMessage() {
        // Get message from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const urlMessage = urlParams.get('message');
        if (urlMessage) {
            document.getElementById('message-text').textContent = decodeURIComponent(urlMessage);
        }
    }
    
    createStars() {
        const starsContainer = document.getElementById('stars-container');
        
        for (let i = 0; i < 50; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            
            const left = Math.random() * 100;
            const top = Math.random() * 100;
            const size = Math.random() * 3 + 1;
            const animationDelay = Math.random() * 4;
            const animationDuration = Math.random() * 2 + 3;
            
            star.style.left = `${left}%`;
            star.style.top = `${top}%`;
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.animationDelay = `${animationDelay}s`;
            star.style.animationDuration = `${animationDuration}s`;
            
            starsContainer.appendChild(star);
        }
    }
    
    setupEventListeners() {
        // Better mobile detection
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Check if we need to show permission button (iOS 13+)
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            const permissionBtn = document.getElementById('permission-btn');
            permissionBtn.style.display = 'block';
            
            // Make button more prominent on mobile for NFC users
            if (isMobile) {
                permissionBtn.innerHTML = '🎄 Tap to Enable Snow Magic! 🎄';
                permissionBtn.style.background = '#059669';
                permissionBtn.style.transform = 'translateX(-50%) scale(1.1)';
            }
            
            // Multiple event types for better mobile compatibility
            ['click', 'touchstart', 'touchend'].forEach(eventType => {
                permissionBtn.addEventListener(eventType, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.requestMotionPermission();
                }, { passive: false });
            });
        } else {
            // For Android and older iOS, just add the listener directly
            this.addMotionListener();
            // Start timer immediately for non-iOS devices
            this.scheduleTransition();
        }
        
        // Mouse events for desktop testing
        let isMouseDown = false;
        let lastMousePos = { x: 0, y: 0 };
        
        window.addEventListener('mousedown', () => {
            isMouseDown = true;
        });
        
        window.addEventListener('mouseup', () => {
            isMouseDown = false;
        });
        
        window.addEventListener('mousemove', (e) => {
            if (!isMouseDown || this.showNightSky) return;
            
            const deltaX = Math.abs(e.clientX - lastMousePos.x);
            const deltaY = Math.abs(e.clientY - lastMousePos.y);
            const totalDelta = deltaX + deltaY;
            
            if (totalDelta > 20) {
                const intensity = Math.min(totalDelta / 100, 1);
                this.shakeIntensity = intensity;
                this.createSnowflakes(Math.floor(intensity * 15) + 3, intensity);
            }
            
            lastMousePos = { x: e.clientX, y: e.clientY };
        });
    }
    
    requestMotionPermission() {
        const permissionBtn = document.getElementById('permission-btn');
        permissionBtn.innerHTML = 'Requesting permission...';
        
        DeviceMotionEvent.requestPermission().then(response => {
            if (response === 'granted') {
                permissionBtn.style.display = 'none';
                document.querySelector('.instruction-sub').textContent = 'Shake away! ✨';
                this.addMotionListener();
                
                // Give immediate feedback with some snow
                this.createSnowflakes(10, 0.5);
                
                // START the 10-second timer only now!
                this.scheduleTransition();
            } else {
                permissionBtn.innerHTML = 'Permission denied - try mouse drag instead';
                permissionBtn.style.background = '#dc2626';
                setTimeout(() => {
                    permissionBtn.style.display = 'none';
                    // Still start timer even if permission denied (mouse still works)
                    this.scheduleTransition();
                }, 3000);
            }
        }).catch(error => {
            console.error('Error requesting motion permission:', error);
            permissionBtn.innerHTML = 'Error - try mouse drag instead';
            permissionBtn.style.background = '#dc2626';
            setTimeout(() => {
                permissionBtn.style.display = 'none';
                // Still start timer even on error (mouse still works)
                this.scheduleTransition();
            }, 3000);
        });
    }
    
    addMotionListener() {
        window.addEventListener('devicemotion', this.handleDeviceMotion.bind(this));
    }
    
    handleDeviceMotion(event) {
        if (this.showNightSky) return;
        
        const acceleration = event.accelerationIncludingGravity;
        if (!acceleration) return;
        
        // Handle null values that sometimes occur on iOS
        const currentX = acceleration.x || 0;
        const currentY = acceleration.y || 0;
        const currentZ = acceleration.z || 0;
        
        const deltaX = Math.abs(currentX - this.lastAcceleration.x);
        const deltaY = Math.abs(currentY - this.lastAcceleration.y);
        const deltaZ = Math.abs(currentZ - this.lastAcceleration.z);
        
        const totalDelta = deltaX + deltaY + deltaZ;
        
        this.lastAcceleration = {
            x: currentX,
            y: currentY,
            z: currentZ
        };
        
        // Rate-limited approach - good balance
        if (totalDelta > 12) {
            const now = Date.now();
            // Rate limit: allow snow creation every 300ms
            if (!this.lastSnowTime || now - this.lastSnowTime > 300) {
                const intensity = Math.min(totalDelta / 25, 1);
                this.shakeIntensity = intensity;
                
                const flakeCount = Math.floor(intensity * 12) + 6; // 6-18 flakes per burst
                this.createSnowflakes(flakeCount, intensity);
                this.lastSnowTime = now;
                
                console.log('Snow created!', flakeCount, 'flakes');
            }
        }
    }
    
    createSnowflakes(count, intensity) {
        const container = document.getElementById('snowflakes-container');
        
        for (let i = 0; i < count; i++) {
            const snowflake = document.createElement('div');
            snowflake.className = 'snowflake';
            snowflake.id = `snowflake-${this.snowflakeId++}`;
            
            const size = Math.random() * (2 + intensity * 3) + 2;
            const left = Math.random() * 100;
            const opacity = Math.random() * 0.8 + 0.2;
            
            snowflake.style.width = `${size}px`;
            snowflake.style.height = `${size}px`;
            snowflake.style.left = `${left}%`;
            snowflake.style.top = '-10px';
            snowflake.style.opacity = opacity;
            
            // Store animation properties
            snowflake.dataset.fallSpeed = Math.random() * (2 + intensity * 3) + 1;
            snowflake.dataset.horizontalDrift = (Math.random() - 0.5) * 2;
            snowflake.dataset.currentTop = -10;
            snowflake.dataset.currentLeft = left;
            
            container.appendChild(snowflake);
            this.snowflakes.push(snowflake);
        }
    }
    
    animateSnowflakes() {
        if (this.showNightSky) return;
        
        // Even lower limit for better performance and visual clarity
        if (this.snowflakes.length > 25) {
            // Remove oldest snowflakes
            const toRemove = this.snowflakes.splice(0, this.snowflakes.length - 25);
            toRemove.forEach(flake => flake.remove());
        }
        
        this.snowflakes = this.snowflakes.filter(snowflake => {
            const currentTop = parseFloat(snowflake.dataset.currentTop);
            const currentLeft = parseFloat(snowflake.dataset.currentLeft);
            const fallSpeed = parseFloat(snowflake.dataset.fallSpeed);
            const horizontalDrift = parseFloat(snowflake.dataset.horizontalDrift);
            
            const newTop = currentTop + fallSpeed;
            const newLeft = currentLeft + horizontalDrift * 0.1;
            
            if (newTop > window.innerHeight + 10) {
                snowflake.remove();
                return false;
            }
            
            snowflake.dataset.currentTop = newTop;
            snowflake.dataset.currentLeft = newLeft;
            snowflake.style.top = `${newTop}px`;
            snowflake.style.left = `${newLeft}%`;
            
            return true;
        });
        
        // Decay shake intensity
        if (this.shakeIntensity > 0) {
            this.shakeIntensity = Math.max(0, this.shakeIntensity - 0.01);
        }
    }
    
    startAnimationLoop() {
        const animate = () => {
            this.animateSnowflakes();
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }
    
    scheduleTransition() {
        setTimeout(() => {
            this.transitionToNightSky();
        }, 10000); // 10 seconds
    }
    
    transitionToNightSky() {
        this.showNightSky = true;
        
        const snowglobeScene = document.getElementById('snowglobe-scene');
        const nightScene = document.getElementById('night-scene');
        
        snowglobeScene.classList.add('fade-out');
        nightScene.classList.add('fade-in');
    }
}

// Initialize the snowglobe when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new InteractiveSnowglobe();
});
