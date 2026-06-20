/**
 * WebGLApp.js - Three.js Sphere Logic
 * 
 * Extracted from legacy ./javascript/webglball/index.js
 * Renders the sliced-sphere with noise deformation and matcap shading.
 * 
 * @target .webglholder
 */
import loop from '../core/Loop.js';

// === SHADER CODE ===
const noise = `
vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0; }

float mod289(float x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0; }

vec4 permute(vec4 x) {
     return mod289(((x*34.0)+1.0)*x);
}

float permute(float x) {
     return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

float taylorInvSqrt(float r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec4 grad4(float j, vec4 ip)
  {
  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
  vec4 p,s;

  p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
  s = vec4(lessThan(p, vec4(0.0)));
  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;

  return p;
  }

#define F4 0.309016994374947451

float snoise(vec4 v)
  {
  const vec4  C = vec4( 0.138196601125011,
                        0.276393202250021,
                        0.414589803375032,
                       -0.447213595499958);

  vec4 i  = floor(v + dot(v, vec4(F4)) );
  vec4 x0 = v -   i + dot(i, C.xxxx);

  vec4 i0;
  vec3 isX = step( x0.yzw, x0.xxx );
  vec3 isYZ = step( x0.zww, x0.yyz );
  i0.x = isX.x + isX.y + isX.z;
  i0.yzw = 1.0 - isX;
  i0.y += isYZ.x + isYZ.y;
  i0.zw += 1.0 - isYZ.xy;
  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;

  vec4 i3 = clamp( i0, 0.0, 1.0 );
  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

  vec4 x1 = x0 - i1 + C.xxxx;
  vec4 x2 = x0 - i2 + C.yyyy;
  vec4 x3 = x0 - i3 + C.zzzz;
  vec4 x4 = x0 + C.wwww;

  i = mod289(i);
  float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
  vec4 j1 = permute( permute( permute( permute (
             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));

  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

  vec4 p0 = grad4(j0,   ip);
  vec4 p1 = grad4(j1.x, ip);
  vec4 p2 = grad4(j1.y, ip);
  vec4 p3 = grad4(j1.z, ip);
  vec4 p4 = grad4(j1.w, ip);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  p4 *= taylorInvSqrt(dot(p4,p4));

  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
  m0 = m0 * m0;
  m1 = m1 * m1;
  return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
               + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;
  }
`;

const mapFunc = ` 
float map(float value, float inMin, float inMax, float outMin, float outMax) {
  return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}
`;

function vertexShader() {
    return noise + mapFunc + `
      varying vec2 vUv; 
      varying vec3 vPos; 
      varying float n;
      varying vec2 vN;

      uniform float u_nSpeed;
      uniform float u_nDet;
      uniform float u_nRoof;
      uniform float u_nDepth;
      uniform float u_offset;
      uniform float u_offsetInt;
      uniform float u_sliceNumber;

      void main() {
        vUv = uv; 
        vPos = position; 

        vec3 nPos  = position;
        nPos.y+=u_offset*u_offsetInt;
        n = snoise(vec4(nPos*u_nDet, u_nSpeed));

        float depth = u_nDepth;
        if(u_offset == 1.){
          depth = 1.;
        }

        n = map(n, -1.,1., depth,u_nRoof);
        if(n>1.){
          n = 1.;
        }
        float crat = n;

        vec3 pos = position;
        pos.yx*=crat;

        vec4 modelViewPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * modelViewPosition; 

        vec4 p = vec4( position, 1. );

        vec3 e = normalize( vec3( modelViewMatrix * p ) );
        vec3 n = normalize( normalMatrix * normal );
      
        vec3 r = reflect( e, n );
        float m = 2. * sqrt(
          pow( r.x, 2. ) +
          pow( r.y, 2. ) +
          pow( r.z + 1., 2. )
        );
        vN = r.xy / m + .5;
      }
    `;
}

function fragmentShader() {
    return mapFunc + `
    varying vec2 vUv; 
    varying float n;
    varying vec3 vPos; 

    uniform sampler2D u_tex;
    uniform sampler2D u_matCap;
    varying vec2 vN;

    uniform float u_nRoof;
    uniform float u_nShadow;
    uniform float u_nDepth;
    uniform float u_lInt;
    uniform float u_lTresh;
    uniform vec3 u_color;
    
    void main() {
      float yPos = map(vPos.z,-1.,1.,0.,1.);
      vec4 tex = vec4(u_color, 1.);

      float shadowN = map(n , u_nDepth, 1., u_nShadow,0.);

      vec4 matTex = texture2D(u_matCap, vN);

      tex.rgb +=shadowN;
      tex*=matTex*u_lInt+u_lTresh;

      gl_FragColor = vec4(tex.rgb, 1.);
    }
`;
}

// === CAMERA CONTROLLER ===
class CameraController {
    constructor(camera) {
        this.camera = camera;
        this.cursor = [0, 0];
        this.ease = 0.05;
        this.sensitivity = 0.001;

        this.update = this.update.bind(this);
        this.mouseMove = this.mouseMove.bind(this);

        window.addEventListener('mousemove', this.mouseMove);
    }

    mouseMove(e) {
        this.cursor[0] = (e.clientX - window.innerWidth / 2) * this.sensitivity;
        this.cursor[1] = (e.clientY - window.innerHeight / 2) * this.sensitivity;
    }

    update() {
        this.camera.position.x += (this.cursor[0] - this.camera.position.x) * this.ease;
        this.camera.position.y += (this.cursor[1] - this.camera.position.y) * this.ease;
        this.camera.lookAt(0, 0, 0);
    }
}

// === MAIN WEBGL APP ===
export default class WebGLApp {
    constructor() {
        this.container = document.querySelector('.webglholder');
        this.simplex = new SimplexNoise();
        this.soundActor = 0.2;
        this.initZScale = 1;

        // GUI config
        this.config = {
            SLICE_NUMBER: 40,
            sliceThickness: 0.45,
            noiseSpeed: 2.5,
            noiseDetail: 25,
            noiseRoof: 1.8,
            noiseDepth: 0,
            noiseShadow: -0.8,
            noiseOffset: 2,
            matCap: 0,
            lightIntensity: 1.34,
            lightAmbient: 0,
            camSpeed: 0.05,
            camSensitivity: 0.002,
            highFreqIntensity: 0.0017 * 0.01,
            lowFreqIntensity: 0.008 * 0.1,
            colorChangingFrequency: 0.01
        };

        this.colorPool = [new THREE.Color(0x5e2ced)];
        this.matCaps = [];

        this.init = this.init.bind(this);
        this.update = this.update.bind(this);
        this.resizeCanvas = this.resizeCanvas.bind(this);
    }

    init() {
        if (!this.container) {
            console.warn('WebGLApp: .webglholder not found');
            return;
        }

        this._matCapLoaded = false;
        this._modelLoaded = false;
        this._paused = false;

        // Load matcaps
        const loader = new THREE.TextureLoader();
        const matCapUrl = 'https://cdn.jsdelivr.net/gh/niccolomiranda/chiara-luzzana@72fab3c/sphere/matCap0.jpg';
        loader.load(
            matCapUrl,
            (texture) => {
                this.matCaps.push(texture);
                this._markMatCapLoaded();
            },
            undefined,
            (error) => {
                console.warn('[WebGLApp] Matcap load failed:', error);
                this._showFallback('matcap');
            }
        );

        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.debug.checkShaderErrors = true;
        this.container.appendChild(this.renderer.domElement);

        this.renderer.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            console.warn('[WebGLApp] WebGL context lost');
            this._showFallback('context-loss');
            this._paused = true;
        });

        this.renderer.domElement.addEventListener('webglcontextrestored', () => {
            console.log('[WebGLApp] WebGL context restored');
            this._paused = false;
            this._hideFallback();
            // Re-load assets that were tied to the lost context.
            this.loadSphereModel();
        });

        if (window.isMobile) {
            const cap = 1.5;
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
        }

        // Setup scene
        this.scene = new THREE.Scene();

        // Setup camera
        this.camera = new THREE.PerspectiveCamera(
            30,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 7);

        // Camera controller (only on desktop)
        if (!window.isMobile) {
            this.camController = new CameraController(this.camera);
        }

        // Lighting
        const light = new THREE.AmbientLight();
        const pointLight = new THREE.PointLight();
        pointLight.position.set(10, 10, 0);
        this.scene.add(light, pointLight);

        // Create sliced sphere
        this.sliceGeom = new THREE.Group();
        this.loadSphereModel();

        if (window.isMobile) {
            this.sliceGeom.scale.set(0.8, 0.8, 0.8);
        }

        // Events
        window.addEventListener('resize', this.resizeCanvas);

        // Subscribe to animation loop
        loop.subscribe('webglUpdate', this.update);
        if (this.camController) {
            loop.subscribe('cameraControllerUpdate', this.camController.update);
        }
    }

    loadSphereModel() {
        const fbxLoader = new THREE.FBXLoader();
        const sphereRad = 1;

        fbxLoader.load(
            'https://cdn.jsdelivr.net/gh/niccolomiranda/chiara-luzzana/sphere/slice2.fbx',
            (obj) => {
                this._markModelLoaded();
                let inc = 0;
                for (let i = -sphereRad; i <= sphereRad; i += (sphereRad * 2) / this.config.SLICE_NUMBER) {
                    const n = Math.round(((this.simplex.noise2D(inc * 0.1, 1) + 1) / 2) * (this.colorPool.length - 1));

                    const uniforms = {
                        u_tex: { value: null },
                        u_matCap: { value: this.matCaps[this.config.matCap] },
                        u_nSpeed: { value: 0 },
                        u_offset: { value: inc },
                        u_sliceNumber: { value: this.config.SLICE_NUMBER },
                        u_offsetInt: { value: this.config.noiseOffset },
                        u_color: { value: this.colorPool[n] },
                        u_nDet: { value: this.config.noiseDetail },
                        u_nRoof: { value: this.config.noiseRoof },
                        u_nDepth: { value: this.config.noiseDepth },
                        u_nShadow: { value: this.config.noiseShadow },
                        u_lInt: { value: this.config.lightIntensity },
                        u_lTresh: { value: this.config.lightAmbient }
                    };

                    const r = Math.sqrt(2 * sphereRad * (i + sphereRad) - Math.pow(i + sphereRad, 2));

                    if (r > 0) {
                        const cyl = obj.children[0].clone();
                        cyl.material = new THREE.ShaderMaterial({
                            vertexShader: vertexShader(),
                            fragmentShader: fragmentShader(),
                            uniforms: uniforms,
                            transparent: true
                        });

                        this.initZScale = cyl.scale.z;
                        cyl.position.y = i;
                        cyl.scale.x *= r;
                        cyl.scale.y *= r;
                        cyl.scale.z = this.initZScale * this.config.sliceThickness;
                        this.sliceGeom.add(cyl);
                    }
                    inc++;
                }

                this.sliceGeom.rotation.z = 1;
                this.sliceGeom.rotation.y = -0.8;
                this.scene.add(this.sliceGeom);
            },
            undefined,
            (error) => {
                console.warn('[WebGLApp] FBX load failed:', error);
                this._showFallback('model');
            }
        );
    }

    update() {
        if (this._paused) return;
        if (!this.renderer) return;

        this.renderer.render(this.scene, this.camera);

        // Update slices
        this.sliceGeom.children.forEach((child, i) => {
            const n = Math.round(
                ((this.simplex.noise2D(i * this.config.colorChangingFrequency, 1) + 1) / 2) *
                (this.colorPool.length - 1)
            );

            child.scale.z = this.initZScale * this.config.sliceThickness;
            child.material.uniforms.u_nSpeed.value += loop.dt * 0.0001 * this.config.noiseSpeed * this.soundActor;
            child.material.uniforms.u_nDet.value = this.config.noiseDetail;
            child.material.uniforms.u_nRoof.value = this.config.noiseRoof;
            child.material.uniforms.u_nDepth.value = this.config.noiseDepth;
            child.material.uniforms.u_nShadow.value = this.config.noiseShadow;
            child.material.uniforms.u_matCap.value = this.matCaps[this.config.matCap];
            child.material.uniforms.u_lInt.value = this.config.lightIntensity;
            child.material.uniforms.u_lTresh.value = this.config.lightAmbient;
            child.material.uniforms.u_offsetInt.value = this.config.noiseOffset;
            child.material.uniforms.u_color.value = this.colorPool[n];

            // Sound reactivity (shared global instance from app bootstrap)
            const reactor = window.soundReactor;
            if (reactor && reactor.fdata) {
                const highFreqIdx = Math.min(500, reactor.fdata.length - 1);
                const lowFreqIdx = Math.min(10, reactor.fdata.length - 1);
                child.material.uniforms.u_nDet.value =
                    this.config.noiseDetail + (reactor.fdata[highFreqIdx] || 0) * this.config.highFreqIntensity;
                child.material.uniforms.u_nRoof.value =
                    this.config.noiseRoof - (reactor.fdata[lowFreqIdx] || 0) * this.config.lowFreqIntensity;

                if (reactor.audio && !reactor.audio.paused) {
                    this.soundActor = 1;
                } else {
                    this.soundActor = 0.2;
                }
            }
        });

        // Update camera controller
        if (this.camController) {
            this.camController.sensitivity = this.config.camSensitivity;
            this.camController.ease = this.config.camSpeed;
        }
    }

    _showFallback(reason) {
        if (!this.container) return;
        this.container.classList.add('webgl-fallback');
        this.container.dataset.fallbackReason = reason;
    }

    _hideFallback() {
        if (!this.container) return;
        this.container.classList.remove('webgl-fallback');
        delete this.container.dataset.fallbackReason;
    }

    _markMatCapLoaded() {
        this._matCapLoaded = true;
        if (this._modelLoaded) this._hideFallback();
    }

    _markModelLoaded() {
        this._modelLoaded = true;
        if (this._matCapLoaded) this._hideFallback();
    }

    resizeCanvas() {
        if (!this.renderer || !this.camera) return;

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (window.isMobile) {
            const cap = 1.5;
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
        }
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
}
