class PokemonARApp {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.pokemon = null;
        this.xrSession = null;
        this.xrReferenceSpace = null;
        this.hitTestSource = null;
        this.detectedPlanes = new Set();
        this.animationTime = 0;
        
        this.init();
    }
    
    async init() {
        this.updateStatus('WebXR-Unterstützung prüfen...');
        
        if (!navigator.xr) {
            this.updateStatus('WebXR nicht unterstützt');
            return;
        }
        
        const supported = await navigator.xr.isSessionSupported('immersive-ar');
        if (!supported) {
            this.updateStatus('AR nicht unterstützt');
            return;
        }
        
        this.updateStatus('Bereit für AR');
        this.setupScene();
        this.setupEventListeners();
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
        
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        
        const light = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(light);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
        
        this.createPokemon();
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
        
        group.scale.setScalar(1);
        group.visible = false;
        this.scene.add(group);
        this.pokemon = group;
    }
    
    setupEventListeners() {
        document.getElementById('startButton').addEventListener('click', () => {
            this.startAR();
        });
        
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    async startAR() {
        this.updateStatus('AR-Session starten...');
        
        try {
            this.xrSession = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['local'],
                optionalFeatures: ['plane-detection', 'hit-test', 'anchors']
            });
            
            this.updateStatus('Session erstellt, initialisiere Renderer...');
            await this.renderer.xr.setSession(this.xrSession);
            
            this.updateStatus('Erstelle Referenzraum...');
            this.xrReferenceSpace = await this.xrSession.requestReferenceSpace('local');
            
            try {
                const viewerSpace = await this.xrSession.requestReferenceSpace('viewer');
                this.hitTestSource = await this.xrSession.requestHitTestSource({ space: viewerSpace });
                this.updateStatus('Hit-Test aktiviert');
            } catch (hitTestError) {
                console.warn('Hit-Test nicht verfügbar:', hitTestError);
                this.updateStatus('Hit-Test nicht verfügbar, verwende Fallback');
            }
            
            document.getElementById('startButton').style.display = 'none';
            this.updateStatus('AR aktiv - Bewege das Gerät zum Scannen...');
            
            setTimeout(() => {
                if (!this.pokemon.visible) {
                    this.placeOnDefaultPosition();
                }
            }, 3000);
            
            this.renderer.setAnimationLoop((timestamp, frame) => {
                this.render(timestamp, frame);
            });
            
        } catch (error) {
            console.error('Fehler beim Starten der AR-Session:', error);
            this.updateStatus(`Fehler: ${error.message}`);
            document.getElementById('startButton').style.display = 'block';
        }
    }
    
    render(timestamp, frame) {
        if (!frame) return;
        
        this.animationTime = timestamp * 0.001;
        
        const session = frame.session;
        const pose = frame.getViewerPose(this.xrReferenceSpace);
        
        if (pose) {
            this.handlePlaneDetection(frame);
            this.handleHitTest(frame);
            this.animatePokemon();
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    handlePlaneDetection(frame) {
        if (this.pokemon.visible) return;
        
        const detectedPlanes = frame.detectedPlanes;
        
        if (detectedPlanes && detectedPlanes.size > 0) {
            console.log(`${detectedPlanes.size} Ebenen erkannt`);
            this.updateStatus(`${detectedPlanes.size} Ebenen gefunden...`);
            
            for (const plane of detectedPlanes) {
                console.log('Ebenenorientierung:', plane.orientation);
                
                if (plane.orientation === 'horizontal') {
                    try {
                        const pose = frame.getPose(plane.planeSpace, this.xrReferenceSpace);
                        if (pose) {
                            this.pokemon.position.set(
                                pose.transform.position.x,
                                pose.transform.position.y + 0.1,
                                pose.transform.position.z
                            );
                            this.pokemon.userData.basePosition = this.pokemon.position.clone();
                            this.pokemon.visible = true;
                            this.updateStatus('Pokemon auf Ebene platziert! 🎉');
                            console.log('Pokemon positioniert auf:', this.pokemon.position);
                            break;
                        }
                    } catch (error) {
                        console.warn('Fehler bei Ebenen-Pose:', error);
                    }
                }
            }
        }
    }
    
    handleHitTest(frame) {
        if (!this.hitTestSource || this.pokemon.visible) return;
        
        try {
            const hitTestResults = frame.getHitTestResults(this.hitTestSource);
            
            if (hitTestResults.length > 0) {
                console.log(`${hitTestResults.length} Hit-Test-Ergebnisse`);
                
                const hit = hitTestResults[0];
                const pose = hit.getPose(this.xrReferenceSpace);
                
                if (pose) {
                    this.pokemon.position.set(
                        pose.transform.position.x,
                        pose.transform.position.y + 0.1,
                        pose.transform.position.z
                    );
                    this.pokemon.userData.basePosition = this.pokemon.position.clone();
                    this.pokemon.visible = true;
                    this.updateStatus('Pokemon via Hit-Test platziert! 🎉');
                    console.log('Pokemon via Hit-Test positioniert:', this.pokemon.position);
                }
            }
        } catch (error) {
            console.warn('Hit-Test Fehler:', error);
        }
    }
    
    placeOnDefaultPosition() {
        const pose = this.camera.position.clone();
        pose.y -= 0.5;
        pose.z -= 1.0;
        
        this.pokemon.position.copy(pose);
        this.pokemon.visible = true;
        this.updateStatus('Pokemon auf Standardposition platziert! 🎉');
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
        
        if (!this.pokemon.userData.basePosition) {
            this.pokemon.userData.basePosition = this.pokemon.position.clone();
        }
        
        this.pokemon.position.copy(this.pokemon.userData.basePosition);
        this.pokemon.position.x += wiggleX;
        this.pokemon.position.y += bounceY;
        this.pokemon.position.z += wiggleZ;
        
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