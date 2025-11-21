class InteractiveSnowglobe {
    constructor() {
        this.snowflakes = [];
        this.stars = [];
        this.shakeIntensity = 0;
        this.showNightSky = false;
        this.lastAcceleration = { x: 0, y: 0, z: 0 };
        this.snowflakeId = 0;
        this.animationFrame = null;
        
        this.init();
    }
    
    init() {
        this.setupMessage();
        this.createStars();
        this.setupEventListeners();
        this.startAnimationLoop();
        this.scheduleTransition();
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
        // Check if we need to show permission button (iOS 13+)
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            document.getElementById('permission-btn').style.display = 'block';
            document.getElementById('permission-btn').addEventListener('click', this.requestMotionPermission.bind(this));
        } else {
            // For Android and older iOS, just add the listener directly
            this.addMotionListener();
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
        DeviceMotionEvent.requestPermission().then(response => {
            if (response === 'granted') {
                document.getElementById('permission-btn').style.display = 'none';
                document.querySelector('.instruction-sub').textContent = '(or drag mouse on desktop)';
                this.addMotionListener();
            } else {
                alert('Motion permission denied. You can still use mouse drag on desktop!');
            }
        }).catch(error => {
            console.error('Error requesting motion permission:', error);
            alert('Error requesting motion permission. You can still use mouse drag!');
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
        
        // Lower threshold for iOS devices and better sensitivity
        if (totalDelta > 8) {
            const intensity = Math.min(totalDelta / 20, 1);
            this.shakeIntensity = intensity;
            
            const flakeCount = Math.floor(intensity * 20) + 5;
            this.createSnowflakes(flakeCount, intensity);
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