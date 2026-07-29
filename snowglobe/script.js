class InteractiveSnowglobe {
    constructor() {
        this.snowflakes = [];
        this.stars = [];
        this.shakeIntensity = 0;
        this.showNightSky = false;
        this.lastAcceleration = { x: 0, y: 0, z: 0 };
        this.snowflakeId = 0;
        this.animationFrame = null;
        this.timerStarted = false;

        this.spawnInterval = 350;
        this.lastSpawnTime = 0;
        this.lastMotionSample = 0;
        this.lastTotalDelta = 0;

        // Deeper diagnostics for debug overlay
        this.debugEventCount = 0;
        this.debugPermState = 'n/a';
        this.debugHasGravityAccel = false;
        this.debugHasRawAccel = false;

        // Debug overlay toggle: add ?debug=1 to the URL to see live sensor readout
        this.debugMode = new URLSearchParams(window.location.search).get('debug') === '1';
        this.debugEl = null;

        this.init();
    }
    
    init() {
        this.setupMessage();
        this.createStars();
        this.setupEventListeners();
        if (this.debugMode) this.setupDebugOverlay();
        this.startAnimationLoop();
    }
    
    setupMessage() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlMessage = urlParams.get('message');
        if (urlMessage) {
            document.getElementById('message-text').textContent = decodeURIComponent(urlMessage);
        }
    }
    
    setupDebugOverlay() {
        const el = document.createElement('div');
        el.id = 'debug-overlay';
        el.style.position = 'fixed';
        el.style.top = '8px';
        el.style.right = '8px';
        el.style.padding = '6px 10px';
        el.style.background = 'rgba(0,0,0,0.6)';
        el.style.color = '#0f0';
        el.style.fontFamily = 'monospace';
        el.style.fontSize = '12px';
        el.style.borderRadius = '6px';
        el.style.zIndex = '99999';
        el.style.pointerEvents = 'none';
        el.style.whiteSpace = 'pre';
        document.body.appendChild(el);
        this.debugEl = el;
    }
    
    updateDebugOverlay() {
        if (!this.debugMode || !this.debugEl) return;
        this.debugEl.textContent =
            `\u0394:${this.lastTotalDelta.toFixed(1)}  int:${this.shakeIntensity.toFixed(2)}  flakes:${this.snowflakes.length}\n` +
            `evts:${this.debugEventCount}  perm:${this.debugPermState}  accG:${this.debugHasGravityAccel ? 'Y' : 'N'}  accR:${this.debugHasRawAccel ? 'Y' : 'N'}`;
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
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            const permissionBtn = document.getElementById('permission-btn');
            permissionBtn.style.display = 'block';
            
            if (isMobile) {
                permissionBtn.innerHTML = '\ud83c\udf84 Tap to Enable Snow Magic! \ud83c\udf84';
                permissionBtn.style.background = '#059669';
                permissionBtn.style.transform = 'translateX(-50%) scale(1.1)';
            }
            
            ['click', 'touchstart', 'touchend'].forEach(eventType => {
                permissionBtn.addEventListener(eventType, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.requestMotionPermission();
                }, { passive: false });
            });
        } else {
            this.debugPermState = 'no-api-direct';
            this.addMotionListener();
            this.scheduleTransition();
        }
        
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
            
            if (totalDelta > 15) {
                const intensity = Math.min(totalDelta / 100, 1);
                this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
            }
            
            lastMousePos = { x: e.clientX, y: e.clientY };
        });
    }
    
    requestMotionPermission() {
        const permissionBtn = document.getElementById('permission-btn');
        permissionBtn.innerHTML = 'Requesting permission...';
        
        DeviceMotionEvent.requestPermission().then(response => {
            if (response === 'granted') {
                this.debugPermState = 'granted';
                permissionBtn.style.display = 'none';
                document.querySelector('.instruction-sub').textContent = 'Shake away! \u2728';
                this.addMotionListener();
                this.shakeIntensity = Math.max(this.shakeIntensity, 0.35);
                this.scheduleTransition();
            } else {
                this.debugPermState = 'denied';
                permissionBtn.innerHTML = 'Permission denied - try mouse drag instead';
                permissionBtn.style.background = '#dc2626';
                setTimeout(() => {
                    permissionBtn.style.display = 'none';
                    this.scheduleTransition();
                }, 3000);
            }
        }).catch(error => {
            this.debugPermState = 'error';
            console.error('Error requesting motion permission:', error);
            permissionBtn.innerHTML = 'Error - try mouse drag instead';
            permissionBtn.style.background = '#dc2626';
            setTimeout(() => {
                permissionBtn.style.display = 'none';
                this.scheduleTransition();
            }, 3000);
        });
    }
    
    addMotionListener() {
        window.addEventListener('devicemotion', this.handleDeviceMotion.bind(this));
    }
    
    handleDeviceMotion(event) {
        this.debugEventCount++;
        if (this.showNightSky) return;
        
        const gravityAccel = event.accelerationIncludingGravity;
        const rawAccel = event.acceleration;
        this.debugHasGravityAccel = !!(gravityAccel && (gravityAccel.x !== null || gravityAccel.y !== null || gravityAccel.z !== null));
        this.debugHasRawAccel = !!(rawAccel && (rawAccel.x !== null || rawAccel.y !== null || rawAccel.z !== null));
        
        // Fall back to raw (non-gravity) acceleration if the gravity-included
        // reading isn't available on this device/browser
        const acceleration = (this.debugHasGravityAccel ? gravityAccel : (this.debugHasRawAccel ? rawAccel : null));
        if (!acceleration) {
            this.updateDebugOverlay();
            return;
        }
        
        const currentX = acceleration.x || 0;
        const currentY = acceleration.y || 0;
        const currentZ = acceleration.z || 0;
        
        const deltaX = Math.abs(currentX - this.lastAcceleration.x);
        const deltaY = Math.abs(currentY - this.lastAcceleration.y);
        const deltaZ = Math.abs(currentZ - this.lastAcceleration.z);
        
        const totalDelta = deltaX + deltaY + deltaZ;
        this.lastTotalDelta = totalDelta; // always record latest, even if throttled below
        
        this.lastAcceleration = { x: currentX, y: currentY, z: currentZ };
        
        const now = Date.now();
        if (now - this.lastMotionSample < 50) return;
        this.lastMotionSample = now;
        
        if (totalDelta > 8) {
            // More sensitive: real-world deltas were topping out well below our old /40 ceiling
            const intensity = Math.min(totalDelta / 18, 1);
            this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        }
    }
    
    createSnowflakes(count, intensity) {
        const container = document.getElementById('snowflakes-container');
        
        for (let i = 0; i < count; i++) {
            const snowflake = document.createElement('div');
            snowflake.className = 'snowflake';
            snowflake.id = `snowflake-${this.snowflakeId++}`;
            
            const size = Math.random() * (3 + intensity * 5) + 4;
            const left = Math.random() * 100;
            const opacity = Math.random() * 0.8 + 0.2;
            
            snowflake.style.width = `${size}px`;
            snowflake.style.height = `${size}px`;
            snowflake.style.left = `${left}%`;
            snowflake.style.top = '-10px';
            snowflake.style.opacity = opacity;
            
            snowflake.dataset.fallSpeed = Math.random() * (2 + intensity * 3) + 1;
            snowflake.dataset.horizontalDrift = (Math.random() - 0.5) * 2;
            snowflake.dataset.currentTop = -10;
            snowflake.dataset.currentLeft = left;
            
            container.appendChild(snowflake);
            this.snowflakes.push(snowflake);
        }
    }
    
    trySpawn() {
        if (this.showNightSky) return;
        
        const now = Date.now();
        if (!this.lastSpawnTime) this.lastSpawnTime = now;
        if (now - this.lastSpawnTime < this.spawnInterval) return;
        this.lastSpawnTime = now;
        
        const baseCount = 1;
        const extraCount = Math.round(this.shakeIntensity * 35);
        const count = baseCount + extraCount;
        
        this.createSnowflakes(count, this.shakeIntensity);
    }
    
    animateSnowflakes() {
        if (this.showNightSky) return;
        
        this.trySpawn();
        
        if (this.snowflakes.length > 90) {
            const toRemove = this.snowflakes.splice(0, this.snowflakes.length - 90);
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
        
        if (this.shakeIntensity > 0) {
            this.shakeIntensity = Math.max(0, this.shakeIntensity - 0.007);
        }
        
        this.updateDebugOverlay();
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
        }, 10000);
    }
    
    transitionToNightSky() {
        this.showNightSky = true;
        
        const snowglobeScene = document.getElementById('snowglobe-scene');
        const nightScene = document.getElementById('night-scene');
        
        snowglobeScene.classList.add('fade-out');
        nightScene.classList.add('fade-in');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new InteractiveSnowglobe();
});
