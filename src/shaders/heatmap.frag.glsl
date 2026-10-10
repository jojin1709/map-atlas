// GPU Heatmap point density fragment shader
precision mediump float;

varying vec2 vUv;
uniform sampler2D uDensityMap;
uniform float uMaxDensity;

vec3 getHeatmapColor(float t) {
  // Smooth blue -> cyan -> green -> yellow -> red gradient
  vec3 c0 = vec3(0.14, 0.38, 0.92); // Deep blue
  vec3 c1 = vec3(0.06, 0.72, 0.78); // Cyan
  vec3 c2 = vec3(0.16, 0.80, 0.40); // Emerald
  vec3 c3 = vec3(0.96, 0.78, 0.12); // Amber
  vec3 c4 = vec3(0.93, 0.22, 0.22); // Red

  if (t < 0.25) return mix(c0, c1, t / 0.25);
  if (t < 0.50) return mix(c1, c2, (t - 0.25) / 0.25);
  if (t < 0.75) return mix(c2, c3, (t - 0.50) / 0.25);
  return mix(c3, c4, (t - 0.75) / 0.25);
}

void main() {
  float density = texture2D(uDensityMap, vUv).r;
  float normalized = clamp(density / max(0.001, uMaxDensity), 0.0, 1.0);
  
  if (normalized < 0.02) {
    discard;
  }

  vec3 rgb = getHeatmapColor(normalized);
  float alpha = smoothstep(0.02, 0.8, normalized) * 0.75;
  gl_FragColor = vec4(rgb, alpha);
}
