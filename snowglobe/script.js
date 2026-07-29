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

        // Unified spawn heartbeat — this is the ONLY thing that creates snowflakes now.
        // It ticks at a fixed rate no matter what; only count/speed react to intensity.
        this.spawnInterval = 350; // ms between spawn ticks (constant, always)
        this.lastSpawnTime = 0;

        // Lightweight throttle just for reading motion events (not for spawning)
        this.lastMotionSample = 0;

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
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            const permissionBtn = document.getElementById('permission-btn');
            permissionBtn.style.display = 'block';
            
            if (isMobile) {
                permissionBtn.innerHTML = '🎄 Tap to Enable Snow Magic! 🎄';
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
            this.addMotionListener();
            this.scheduleTransition();
        }
        
        // Mouse events for desktop testing — now just nudges the intensity dial
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
                // Take the max so we capture peaks without stomping on an ongoing decay
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
                permissionBtn.style.display = 'none';
                document.querySelector('.instruction-sub').textContent = 'Shake away! ✨';
                this.addMotionListener();
                
                // Gentle nudge instead of a hard burst — the heartbeat eases it in smoothly
                this.shakeIntensity = Math.max(this.shakeIntensity, 0.35);
                
                this.scheduleTransition();
            } else {
                permissionBtn.innerHTML = 'Permission denied - try mouse drag instead';
                permissionBtn.style.background = '#dc2626';
                setTimeout(() => {
                    permissionBtn.style.display = 'none';
                    this.scheduleTransition();
                }, 3000);
            }
        }
  }
    
