/**
 * WebGLApp.js - Three.js Sphere Logic
 * 
 * Extracted from legacy ./javascript/webglball/index.js
 * Renders the sliced-sphere with noise deformation and matcap shading.
 * 
 * @target .webglholder
 */
import loop from '../core/Loop.js';
import * as THREE from './vendor/three.js';

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
    constructor(container, motion) {
        this.container = container;
        this.motion = motion;
        this.compact = matchMedia('(max-width: 767px), (pointer: coarse)').matches;
        this.sliceCount = this.compact ? 24 : 40;
        this.frameInterval = this.compact ? 1000 / 30 : 0;
        this.lastFrame = 0;
        this.state = 'loading';

        this.update = this.update.bind(this);
        this.resizeCanvas = this.resizeCanvas.bind(this);
    }

    init() {
        try {
            this.renderer = new THREE.WebGLRenderer({
                alpha: true,
                antialias: !this.compact,
                powerPreference: 'low-power',
            });
        } catch {
            this.showFallback('unavailable');
            return;
        }

        const canvas = this.renderer.domElement;
        canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            if (this.state === 'failed') return;
            this.state = 'context-lost';
            this.showFallback('context-loss');
        });
        canvas.addEventListener('webglcontextrestored', () => {
            if (this.state !== 'context-lost') return;
            this.state = this.sphere.parent ? 'active' : 'loading';
        });
        this.container.append(canvas);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 1000);
        this.camera.position.set(0, 0, 7);
        this.sphere = new THREE.Group();
        this.sphere.rotation.set(0, -0.8, 1);
        this.sphere.scale.setScalar(this.compact ? 0.8 : 1);
        if (!this.compact) this.cameraController = new CameraController(this.camera);

        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas);
        this.loadSphere();
    }

    async loadSphere() {
        try {
            const [matcap, model] = await Promise.all([
                new THREE.TextureLoader().loadAsync('/assets/sphere/matCap0.jpg'),
                fetch('/assets/sphere/slice.json', { signal: AbortSignal.timeout(8000) }).then(response => {
                    if (!response.ok) throw new Error('Sphere geometry returned HTTP ' + response.status);
                    return response.json();
                }),
            ]);
            const geometry = new THREE.BufferGeometryLoader().parse(model.geometry);
            for (let index = 1; index < this.sliceCount; index += 1) {
                const y = -1 + 2 * index / this.sliceCount;
                const radius = Math.sqrt(1 - y * y);
                const material = new THREE.ShaderMaterial({
                    vertexShader: vertexShader(),
                    fragmentShader: fragmentShader(),
                    transparent: true,
                    uniforms: {
                        u_tex: { value: null },
                        u_matCap: { value: matcap },
                        u_nSpeed: { value: 0 },
                        u_offset: { value: index },
                        u_sliceNumber: { value: this.sliceCount },
                        u_offsetInt: { value: 2 },
                        u_color: { value: new THREE.Color(0x5e2ced) },
                        u_nDet: { value: 25 },
                        u_nRoof: { value: 1.8 },
                        u_nDepth: { value: 0 },
                        u_nShadow: { value: -0.8 },
                        u_lInt: { value: 1.34 },
                        u_lTresh: { value: 0 },
                    },
                });
                const slice = new THREE.Mesh(geometry, material);
                slice.scale.fromArray(model.scale);
                slice.quaternion.fromArray(model.rotation);
                slice.position.y = y;
                slice.scale.x *= radius;
                slice.scale.y *= radius;
                slice.scale.z *= 0.45;
                this.sphere.add(slice);
            }
            this.scene.add(this.sphere);
            if (this.state === 'loading') this.state = 'active';
            loop.subscribe('webglUpdate', this.update);
        } catch (error) {
            this.state = 'failed';
            this.showFallback('asset');
            console.warn('[WebGL] Static sphere retained', error);
        }
    }

    update() {
        if (this.state !== 'active' || document.hidden) return;
        if (this.motion.matches) {
            this.showFallback('reduced-motion');
            return;
        }
        if (document.body.classList.contains('menu-open') || scrollY > this.container.clientHeight) return;
        const now = performance.now();
        const elapsed = now - this.lastFrame;
        if (elapsed < this.frameInterval - 1) return;
        this.lastFrame = now;

        const reactor = window.soundReactor;
        const playing = reactor?.audio && !reactor.audio.paused;
        const high = playing ? reactor.fdata?.[500] || 0 : 0;
        const low = playing ? reactor.fdata?.[10] || 0 : 0;
        for (const slice of this.sphere.children) {
            const uniforms = slice.material.uniforms;
            uniforms.u_nSpeed.value += Math.min(elapsed, 50) * (playing ? 0.00025 : 0.00005);
            uniforms.u_nDet.value = 25 + high * 0.000017;
            uniforms.u_nRoof.value = 1.8 - low * 0.0008;
        }

        this.cameraController?.update();
        this.renderer.render(this.scene, this.camera);
        this.container.classList.remove('webgl-fallback');
        delete this.container.dataset.fallbackReason;
    }

    showFallback(reason) {
        this.container.classList.add('webgl-fallback');
        this.container.dataset.fallbackReason = reason;
    }

    resizeCanvas() {
        const { clientWidth: width, clientHeight: height } = this.container;
        if (!width || !height) return;
        this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, this.compact ? 1 : 1.5));
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }
}
