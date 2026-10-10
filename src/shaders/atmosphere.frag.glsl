// Atmospheric Fresnel limb glow fragment shader for 3D Globe
varying vec3 vNormal;
varying vec3 vPosition;

uniform vec3 uAtmosphereColor;
uniform float uIntensity;

void main() {
  vec3 viewDir = normalize(-vPosition);
  float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
  float intensity = pow(rim, 2.4) * 0.95;
  
  // Sky blue Rayleigh atmospheric haze
  vec3 atmosphereColor = vec3(0.28, 0.62, 1.0);
  gl_FragColor = vec4(atmosphereColor, 1.0) * intensity;
}
