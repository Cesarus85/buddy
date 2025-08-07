class PokemonARApp {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.pokemon = null;
        this.xrSession = null;
        this.xrReferenceSpace = null;
        this.animationTime = 0;
        
        this.init();
    }
    
    async init() {
        this.updateStatus('WebXR-Unterstützung prüfen...');
        console.log('WebXR verfügbar:', !!navigator.xr);
        
        if (!navigator.xr) {
            this.updateStatus('WebXR nicht unterstützt - Gerät/Browser nicht kompatibel');
            return;
        }
        
        try {
            const supported = await navigator.xr.isSessionSupported('immersive-ar');
            console.log('AR unterstützt:', supported);
            
            if (!supported) {
                this.updateStatus('AR nicht unterstützt auf diesem Gerät');
                return;
            }
            
            this.updateStatus('Bereit für AR');
            this.setupScene();
            this.setupEventListeners();
        } catch (error) {
            console.error('Fehler bei WebXR-Check:', error);
            this.updateStatus('Fehler beim Prüfen der AR-Unterstützung');
        }
    }
    
    setupScene() {
        console.log('Szene wird eingerichtet...');
        
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
        
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);
        
        const light = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(light);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
        
        this.createPokemon();
        console.log('Szene eingerichtet');
    }
    
    createPokemon() {
        const group = new THREE.Group();
        
        const bodyGeometry = new THREE.SphereGeometry(0.08, 16, 16);
        bodyGeometry.scale(1, 1.2, 1);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.08;
        group.add(body);
        
        const headGeometry = new THREE.SphereGeometry(0.06, 16, 16);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.18;
        group.add(head);
        
        const earGeometry = new THREE.ConeGeometry(0.02, 0.06, 8);
        const earMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
        
        const leftEar = new THREE.Mesh(earGeometry, earMaterial);
        leftEar.position.set(-0.04, 0.22, 0.02);
        leftEar.rotation.z = -0.3;
        group.add(leftEar);
        
        const rightEar = new THREE.Mesh(earGeometry, earMaterial);
        rightEar.position.set(0.04, 0.22, 0.02);
        rightEar.rotation.z = 0.3;
        group.add(rightEar);
        
        const earTipMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const leftEarTip = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), earTipMaterial);
        leftEarTip.position.set(-0.045, 0.25, 0.02);
        group.add(leftEarTip);
        
        const rightEarTip = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), earTipMaterial);
        rightEarTip.position.set(0.045, 0.25, 0.02);
        group.add(rightEarTip);
        
        const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), eyeMaterial);
        leftEye.position.set(-0.02, 0.19, 0.05);
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), eyeMaterial);
        rightEye.position.set(0.02, 0.19, 0.05);
        group.add(rightEye);
        
        const cheekMaterial = new THREE.MeshLambertMaterial({ color: 0xff6666 });
        const leftCheek = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), cheekMaterial);
        leftCheek.position.set(-0.05, 0.17, 0.04);
        leftCheek.scale.set(1, 0.6, 0.6);
        group.add(leftCheek);
        
        const rightCheek = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), cheekMaterial);
        rightCheek.position.set(0.05, 0.17, 0.04);
        rightCheek.scale.set(1, 0.6, 0.6);
        group.add(rightCheek);
        
        const tailGeometry = new THREE.ConeGeometry(0.015, 0.1, 8);
        const tailMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.position.set(0, 0.12, -0.08);
        tail.rotation.x = Math.PI / 4;
        group.add(tail);
        
        group.position.set(0, 0, -1);
        group.visible = false;
        this.scene.add(group);
        this.pokemon = group;
        
        console.log('Pokemon erstellt');
    }
    
    setupEventListeners() {
        document.getElementById('startButton').addEventListener('click', () => {
            console.log('AR-Start Button geklickt');
            this.startAR();
        });
        
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    async startAR() {
        this.updateStatus('AR-Session wird gestartet...');
        console.log('Starte AR-Session...');
        
        try {
            console.log('Fordere AR-Session an...');
            this.xrSession = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['local'],
                optionalFeatures: ['plane-detection', 'hit-test']
            });
            
            console.log('AR-Session erstellt:', this.xrSession);
            this.updateStatus('AR-Session erstellt, starte Rendering...');
            
            this.xrSession.addEventListener('end', () => {
                console.log('AR-Session beendet');
                this.updateStatus('AR-Session beendet');
                document.getElementById('startButton').style.display = 'block';
            });
            
            console.log('Erstelle Referenzraum...');
            this.xrReferenceSpace = await this.xrSession.requestReferenceSpace('local');
            console.log('Referenzraum erstellt');
            
            document.getElementById('startButton').style.display = 'none';
            this.updateStatus('AR aktiv! Pokemon sollte erscheinen...');
            
            this.pokemon.visible = true;
            
            setTimeout(() => {
                console.log('Timeout: Starte Rendering-Loop');
                this.startRenderLoop();
            }, 500);
            
        } catch (error) {
            console.error('Fehler beim Starten der AR-Session:', error);
            this.updateStatus(`AR-Fehler: ${error.message}`);
            document.getElementById('startButton').style.display = 'block';
        }
    }
    
    startRenderLoop() {
        console.log('Rendering-Loop gestartet');
        
        const render = (timestamp, frame) => {
            if (!this.xrSession) {
                console.log('Session beendet, stoppe Rendering');
                return;
            }
            
            this.animationTime = timestamp * 0.001;
            this.animatePokemon();
            
            if (frame) {
                const pose = frame.getViewerPose(this.xrReferenceSpace);
                if (pose) {
                    const view = pose.views[0];
                    if (view) {
                        const viewport = this.xrSession.renderState.baseLayer.getViewport(view);
                        this.renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);
                        
                        this.camera.matrix.fromArray(view.transform.inverse.matrix);
                        this.camera.updateMatrixWorld(true);
                        this.camera.projectionMatrix.fromArray(view.projectionMatrix);
                    }
                }
            }
            
            this.renderer.render(this.scene, this.camera);
            this.xrSession.requestAnimationFrame(render);
        };
        
        this.xrSession.requestAnimationFrame(render);
    }
    
    animatePokemon() {
        if (!this.pokemon || !this.pokemon.visible) return;
        
        const bounceHeight = 0.02;
        const bounceSpeed = 3;
        const wiggleAmount = 0.01;
        const wiggleSpeed = 2;
        
        const bounceY = Math.sin(this.animationTime * bounceSpeed) * bounceHeight;
        const wiggleX = Math.sin(this.animationTime * wiggleSpeed) * wiggleAmount;
        const wiggleZ = Math.cos(this.animationTime * wiggleSpeed * 1.3) * wiggleAmount * 0.5;
        
        this.pokemon.position.x = wiggleX;
        this.pokemon.position.y = bounceY;
        this.pokemon.position.z = -1 + wiggleZ;
        
        this.pokemon.rotation.y = Math.sin(this.animationTime * 0.8) * 0.1;
    }
    
    updateStatus(message) {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
        }
        console.log('Status:', message);
    }
}

new PokemonARApp();