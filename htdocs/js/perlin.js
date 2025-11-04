// Perlin Noise Generator
// AI Disclaimer: This was coded with assistance by ChatGPT 5.

(function() {

function mulberry32(seed) {
	return function() {
		let t = (seed += 0x6D2B79F5) | 0;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function buildPerm(seed = 0xdeadbeef) {
	const rnd = mulberry32(seed >>> 0);
	const perm = new Uint8Array(256);
	for (let i = 0; i < 256; i++) perm[i] = i;
	for (let i = 255; i > 0; i--) {
		const j = (rnd() * (i + 1)) | 0;
		const t = perm[i]; perm[i] = perm[j]; perm[j] = t;
	}
	const p = new Uint8Array(512);
	for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
	return p;
}

const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + t * (b - a);
function grad1(hash, x) { return (hash & 1 ? -x : x); }
function mapUnit(n, min = 0, max = 1) { return min + (max - min) * ((n + 1) * 0.5); }

function randBetween(a, b) { return a + (b - a) * Math.random(); }
function randLogUniform(a, b) {
	const la = Math.log(a), lb = Math.log(b);
	return Math.exp(randBetween(la, lb));
}
function randInt(a, b) { return Math.floor(randBetween(a, b + 1)); }

function createPerlin(opts = {}) {
	// choose reasonable defaults if not supplied
	const kind = opts.kind || 'smooth'; // smooth | bursty
	const freqBase = (opts.frequencyHz != null)
		? opts.frequencyHz
		: (kind === 'bursty' ? randLogUniform(0.06, 0.15) : randLogUniform(0.03, 0.08));
	
	const seed = opts.seed != null ? opts.seed : (Math.random() * 0xffffffff) >>> 0;
	const offset = opts.offset != null ? opts.offset : randBetween(0, 10_000);
	const octaves = opts.octaves != null ? opts.octaves : randInt(3, 6);
	const lacunarity = opts.lacunarity != null ? opts.lacunarity : randBetween(1.8, 2.3);
	const gain = opts.gain != null ? opts.gain : randBetween(0.45, 0.65);
	const min = opts.min != null ? opts.min : 0;
	const max = opts.max != null ? opts.max : 1;
	
	const p = buildPerm(seed);
	
	// tiny per-octave jitters to break alignment
	const perOctFreqJitter = Array.from({length: 8}, () => 1 + randBetween(-0.03, 0.03));
	const perOctAmpJitter	= Array.from({length: 8}, () => 1 + randBetween(-0.05, 0.05));
	
	function baseNoise(x) {
		const xi = Math.floor(x) & 255;
		const xf = x - Math.floor(x);
		const g0 = p[xi], g1 = p[xi + 1];
		const d0 = grad1(g0, xf);
		const d1 = grad1(g1, xf - 1);
		return lerp(d0, d1, fade(xf)); // [-1, 1]
	}
	
	function raw(epochSec) {
		const t = epochSec * freqBase + offset;
		return baseNoise(t);
	}
	
	function rawFbm(epochSec) {
		const t0 = epochSec * freqBase + offset;
		let amp = 1, freq = 1, sum = 0, maxAmp = 0;
		for (let i = 0; i < octaves; i++) {
			const f = freq * perOctFreqJitter[i];
			const a = amp * perOctAmpJitter[i];
			sum += a * baseNoise(t0 * f);
			maxAmp += a;
			amp *= gain;
			freq *= lacunarity;
		}
		return sum / maxAmp;
	}
	
	function noise1D(epochSec)		{ return mapUnit(raw(epochSec),	 min, max); }
	function noise1Dfbm(epochSec) { return mapUnit(rawFbm(epochSec), min, max); }
	
	return {
		noise1D,
		noise1Dfbm,
		raw,
		rawFbm,
		config: { seed, freqBase, offset, octaves, lacunarity, gain, min, max }
	};
}

window.createPerlin = createPerlin;

})();
