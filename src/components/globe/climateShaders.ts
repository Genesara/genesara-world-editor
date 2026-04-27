import * as THREE from 'three';
import type { ClimateType } from '../../types';
import { climateColorFor, effectFor, type ClimateEffect } from '../../constants/climateColors';

const VERTEX_SHADER_BASE = /* glsl */ `
  attribute vec3 aCentroid;
  varying vec3 vLocalPos;
  varying vec3 vCentroid;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vLocalPos = position;
    vCentroid = aCentroid;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

// Heat-shimmer subtly displaces the surface in/out.
const VERTEX_SHADER_SHIMMER = /* glsl */ `
  attribute vec3 aCentroid;
  uniform float uTime;
  varying vec3 vLocalPos;
  varying vec3 vCentroid;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vec3 displaced = position + normal * sin(uTime * 2.0 + position.y * 8.0) * 0.0025;
    vLocalPos = displaced;
    vCentroid = aCentroid;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT_PRELUDE = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec3 vLocalPos;
  varying vec3 vCentroid;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  float hash13(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }
`;

function tintFragment(alpha: number): string {
  return `${FRAGMENT_PRELUDE}
    void main() {
      gl_FragColor = vec4(uColor, ${alpha.toFixed(3)} * uOpacity);
    }
  `;
}

function pulseFragment(speed: number, base = 0.18, amp = 0.12): string {
  return `${FRAGMENT_PRELUDE}
    void main() {
      float a = ${base.toFixed(3)} + ${amp.toFixed(3)} * sin(uTime * ${speed.toFixed(3)});
      gl_FragColor = vec4(uColor, a * uOpacity);
    }
  `;
}

function shimmerFragment(scale: number, threshold: number, intensity: number, color: 'white' | 'climate'): string {
  const colorExpr = color === 'white' ? 'vec3(1.0)' : 'uColor';
  return `${FRAGMENT_PRELUDE}
    void main() {
      float h = hash13(floor(vLocalPos * ${scale.toFixed(1)}) + floor(uTime * 4.0));
      float spark = smoothstep(${threshold.toFixed(3)}, 1.0, h) * ${intensity.toFixed(3)};
      gl_FragColor = vec4(${colorExpr}, spark * uOpacity);
    }
  `;
}

const EDGE_BRIGHTEN_FRAGMENT = `${FRAGMENT_PRELUDE}
  void main() {
    float fres = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.0);
    gl_FragColor = vec4(uColor, fres * 0.45 * uOpacity);
  }
`;

const VOLCANIC_GLOW_FRAGMENT = `${FRAGMENT_PRELUDE}
  void main() {
    float fres = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 1.6);
    float pulse = 0.5 + 0.5 * sin(uTime * 1.4);
    float a = (0.18 + 0.32 * fres) * (0.55 + 0.45 * pulse);
    vec3 hot = mix(uColor, vec3(1.0, 0.55, 0.2), 0.4 * fres);
    gl_FragColor = vec4(hot, a * uOpacity);
  }
`;

const RIPPLE_FRAGMENT = `${FRAGMENT_PRELUDE}
  void main() {
    float d = length(vLocalPos - vCentroid);
    float t = mod(uTime * 0.45, 0.42);
    float ring = exp(-pow((d - t) * 35.0, 2.0)) * 0.55;
    gl_FragColor = vec4(uColor, ring * uOpacity);
  }
`;

const SPARKLE_FRAGMENT = `${FRAGMENT_PRELUDE}
  vec2 rotate(vec2 p, float a) {
    float c = cos(a); float s = sin(a);
    return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  }
  void main() {
    vec3 p = vLocalPos * 60.0;
    p.xy = rotate(p.xy, uTime * 0.6);
    float h = hash13(floor(p));
    float spark = smoothstep(0.965, 1.0, h);
    vec3 starColor = mix(uColor, vec3(1.0, 0.9, 1.0), 0.6);
    gl_FragColor = vec4(starColor, spark * 0.85 * uOpacity);
  }
`;

const HEAT_SHIMMER_FRAGMENT = `${FRAGMENT_PRELUDE}
  void main() {
    float wobble = sin(uTime * 3.0 + vLocalPos.y * 12.0) * 0.5 + 0.5;
    float a = 0.12 + 0.08 * wobble;
    gl_FragColor = vec4(uColor, a * uOpacity);
  }
`;

interface ShaderSpec {
  vertex: string;
  fragment: string;
  needsCentroid: boolean;
}

function specForEffect(effect: ClimateEffect): ShaderSpec {
  switch (effect) {
    case 'BLUE_GRAY_TINT':
    case 'WARM_TINT':
    case 'GOLDEN_TINT':
      return { vertex: VERTEX_SHADER_BASE, fragment: tintFragment(0.18), needsCentroid: false };
    case 'DESATURATE':
      return { vertex: VERTEX_SHADER_BASE, fragment: tintFragment(0.14), needsCentroid: false };
    case 'EDGE_BRIGHTEN':
      return { vertex: VERTEX_SHADER_BASE, fragment: EDGE_BRIGHTEN_FRAGMENT, needsCentroid: false };
    case 'BLUE_PULSE':
      return { vertex: VERTEX_SHADER_BASE, fragment: pulseFragment(0.8), needsCentroid: false };
    case 'GREEN_PULSE':
      return { vertex: VERTEX_SHADER_BASE, fragment: pulseFragment(0.55), needsCentroid: false };
    case 'SNOW_SHIMMER':
      return {
        vertex: VERTEX_SHADER_BASE,
        fragment: shimmerFragment(180, 0.965, 0.7, 'white'),
        needsCentroid: false,
      };
    case 'GREEN_SHIMMER':
      return {
        vertex: VERTEX_SHADER_BASE,
        fragment: shimmerFragment(140, 0.94, 0.55, 'climate'),
        needsCentroid: false,
      };
    case 'RIPPLE':
      return { vertex: VERTEX_SHADER_BASE, fragment: RIPPLE_FRAGMENT, needsCentroid: true };
    case 'HEAT_SHIMMER':
      return {
        vertex: VERTEX_SHADER_SHIMMER,
        fragment: HEAT_SHIMMER_FRAGMENT,
        needsCentroid: false,
      };
    case 'VOLCANIC_GLOW':
      return { vertex: VERTEX_SHADER_BASE, fragment: VOLCANIC_GLOW_FRAGMENT, needsCentroid: false };
    case 'SPARKLE':
      return { vertex: VERTEX_SHADER_BASE, fragment: SPARKLE_FRAGMENT, needsCentroid: false };
  }
}

export interface ClimateMaterialSpec {
  material: THREE.ShaderMaterial;
  needsCentroid: boolean;
  isAnimated: boolean;
}

const STATIC_EFFECTS: ReadonlySet<ClimateEffect> = new Set<ClimateEffect>([
  'BLUE_GRAY_TINT',
  'WARM_TINT',
  'GOLDEN_TINT',
  'DESATURATE',
  'EDGE_BRIGHTEN',
]);

export function createClimateMaterial(climate: ClimateType): ClimateMaterialSpec {
  const effect = effectFor(climate);
  const spec = specForEffect(effect);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(climateColorFor(climate)) },
      uOpacity: { value: 1.0 },
    },
    vertexShader: spec.vertex,
    fragmentShader: spec.fragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return {
    material,
    needsCentroid: spec.needsCentroid,
    isAnimated: !STATIC_EFFECTS.has(effect),
  };
}
