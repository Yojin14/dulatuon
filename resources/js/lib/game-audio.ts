/**
 * Dependency-free game audio: a layered, looping background track that changes
 * per game mode, plus sound effects — all synthesised with the Web Audio API.
 * No asset files. Audio only starts after a user gesture (browsers block
 * autoplay); the mute preference persists in localStorage.
 */

type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let warmth: BiquadFilterNode | null = null;
let drumBus: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let schedulerId: number | null = null;
let nextNoteTime = 0;
let stepIndex = 0;
let muted = readMuted();
let theme: Theme | null = null;

function readMuted(): boolean {
    try {
        return localStorage.getItem('gameMuted') === '1';
    } catch {
        return false;
    }
}

export function isMuted(): boolean {
    return muted;
}

export function setMuted(value: boolean): void {
    muted = value;
    try {
        localStorage.setItem('gameMuted', value ? '1' : '0');
    } catch {
        /* ignore */
    }
    if (master && ctx) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(value ? 0 : 1, ctx.currentTime, 0.04);
    }
}

function ensure(): AudioContext | null {
    if (ctx) { return ctx; }
    const AC = window.AudioContext || (window as WindowWithWebkit).webkitAudioContext;
    if (!AC) { return null; }
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.16;
    warmth = ctx.createBiquadFilter();
    warmth.type = 'lowpass';
    warmth.frequency.value = 2400;
    warmth.Q.value = 0.4;
    musicBus.connect(warmth);
    warmth.connect(master);

    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.34;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.26;
    const delaySend = ctx.createGain();
    delaySend.gain.value = 0.26;
    warmth.connect(delaySend);
    delaySend.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(master);

    drumBus = ctx.createGain();
    drumBus.gain.value = 0.5;
    drumBus.connect(master);

    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    return ctx;
}

/** Call inside a user-gesture handler so the browser unlocks audio playback. */
export function unlockAudio(): void {
    const c = ensure();
    if (c && c.state === 'suspended') { void c.resume(); }
}

interface VoiceOptions {
    detune?: number;
    pan?: number;
    attack?: number;
}

function voice(freq: number, start: number, dur: number, type: OscillatorType, peak: number, dest: AudioNode, opts: VoiceOptions = {}): void {
    if (!ctx) { return; }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (opts.detune) { osc.detune.setValueAtTime(opts.detune, start); }
    const attack = opts.attack ?? 0.012;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    let out: AudioNode = gain;
    if (opts.pan && ctx.createStereoPanner) {
        const panner = ctx.createStereoPanner();
        panner.pan.value = opts.pan;
        gain.connect(panner);
        out = panner;
    }
    osc.connect(gain);
    out.connect(dest);
    osc.start(start);
    osc.stop(start + dur + 0.03);
}

function kick(start: number): void {
    if (!ctx || !drumBus) { return; }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, start);
    osc.frequency.exponentialRampToValueAtTime(48, start + 0.12);
    gain.gain.setValueAtTime(0.9, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
    osc.connect(gain);
    gain.connect(drumBus);
    osc.start(start);
    osc.stop(start + 0.2);
}

function hat(start: number, peak: number): void {
    if (!ctx || !drumBus || !noiseBuffer) { return; }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.05);
    src.connect(hp);
    hp.connect(gain);
    gain.connect(drumBus);
    src.start(start);
    src.stop(start + 0.06);
}

// ─── Per-mode themes ────────────────────────────────────────────────────────────
interface Chord { root: number; notes: [number, number, number, number]; }
interface Theme {
    tempo: number;
    chords: Chord[];
    arp: Array<number | null>;
    lead: OscillatorType;
    filter: number;
    kick: boolean;
    hat: number; // 0 = none
}

const ARP_BUSY: Array<number | null> = [0, 2, 4, 2, 1, 3, 4, null, 0, 2, 4, 3, 1, null, 2, 4];
const ARP_MID: Array<number | null> = [0, null, 2, 4, null, 3, null, 2, 1, null, 4, 2, null, 3, null, 4];
const ARP_CALM: Array<number | null> = [0, null, 2, null, 4, null, 2, null, 1, null, 3, null, 4, null, null, null];

// chord shorthands (root in bass octave, four voiced tones around C4)
const C = { root: 130.81, notes: [261.63, 329.63, 392.0, 523.25] } as Chord;     // C
const Cmaj7 = { root: 130.81, notes: [261.63, 329.63, 392.0, 493.88] } as Chord; // Cmaj7
const G = { root: 98.0, notes: [246.94, 293.66, 392.0, 587.33] } as Chord;       // G
const Am = { root: 110.0, notes: [261.63, 329.63, 392.0, 440.0] } as Chord;      // Am
const Am7 = { root: 110.0, notes: [329.63, 392.0, 440.0, 523.25] } as Chord;     // Am7
const F = { root: 87.31, notes: [261.63, 329.63, 349.23, 440.0] } as Chord;      // F
const Dm7 = { root: 146.83, notes: [293.66, 349.23, 440.0, 523.25] } as Chord;   // Dm7
const G7 = { root: 98.0, notes: [349.23, 392.0, 493.88, 587.33] } as Chord;      // G7
const Emaj = { root: 82.41, notes: [329.63, 415.3, 493.88, 659.25] } as Chord;   // E (tension)

const THEMES: Record<string, Theme> = {
    // Energetic & upbeat
    quiz_quest: { tempo: 112, chords: [Cmaj7, G, Am, F], arp: ARP_BUSY, lead: 'square', filter: 3000, kick: true, hat: 0.06 },
    // Calm & thoughtful
    memory_match: { tempo: 82, chords: [Am, F, C, G], arp: ARP_CALM, lead: 'sine', filter: 1600, kick: false, hat: 0.03 },
    // Playful & bouncy (doo-wop)
    word_scramble: { tempo: 100, chords: [C, Am, F, G], arp: ARP_BUSY, lead: 'triangle', filter: 2600, kick: true, hat: 0.05 },
    // Relaxed lo-fi / jazzy
    crossword: { tempo: 74, chords: [Dm7, G7, Cmaj7, Am7], arp: ARP_CALM, lead: 'sine', filter: 1400, kick: false, hat: 0.035 },
    // Suspenseful but light
    hangman: { tempo: 96, chords: [Am, F, C, Emaj], arp: ARP_MID, lead: 'triangle', filter: 2100, kick: true, hat: 0.05 },
    // Unhurried and curious, for watching a simulation
    fault_lab: { tempo: 78, chords: [Am, F, C, G], arp: ARP_CALM, lead: 'sine', filter: 1500, kick: false, hat: 0.02 },
    shake_town: { tempo: 84, chords: [C, Am, F, G], arp: ARP_CALM, lead: 'sine', filter: 1600, kick: false, hat: 0.02 },
};

function THEMES_PLACEHOLDER(): Theme {
    return { tempo: 100, chords: [C, G, Am, F], arp: ARP_BUSY, lead: 'triangle', filter: 2400, kick: true, hat: 0.05 };
}

function scheduler(): void {
    if (!ctx || !musicBus || !theme) { return; }
    const step = 60 / theme.tempo / 4; // sixteenth notes
    while (nextNoteTime < ctx.currentTime + 0.2) {
        const t = nextNoteTime;
        const bar = Math.floor(stepIndex / 16) % theme.chords.length;
        const inBar = stepIndex % 16;
        const chord = theme.chords[bar];

        if (theme.kick && stepIndex % 4 === 0) { kick(t); }
        if (theme.hat > 0 && stepIndex % (theme.kick ? 2 : 4) === 0) { hat(t, stepIndex % 4 === 2 ? theme.hat * 1.6 : theme.hat); }

        if (inBar === 0 || inBar === 8) {
            voice(chord.root, t, step * 7, 'sine', 0.55, musicBus, { attack: 0.02 });
        }
        if (inBar === 0) {
            chord.notes.forEach((n, i) => voice(n, t, step * 15.5, 'triangle', 0.05, musicBus, { attack: 0.08, pan: (i - 1.5) * 0.12 }));
        }

        const idx = theme.arp[inBar];
        if (idx !== null) {
            const pool = [chord.notes[0], chord.notes[1], chord.notes[2], chord.notes[3], chord.notes[0] * 2];
            voice(pool[idx], t, step * 1.1, theme.lead, 0.3, musicBus, { detune: 4, pan: 0.18 });
        }

        nextNoteTime += step;
        stepIndex += 1;
    }
    schedulerId = window.setTimeout(scheduler, 45);
}

export function startMusic(mode?: string): void {
    const c = ensure();
    if (!c) { return; }
    if (c.state === 'suspended') { void c.resume(); }
    theme = (mode && THEMES[mode]) || THEMES_PLACEHOLDER();
    if (warmth) { warmth.frequency.setTargetAtTime(theme.filter, c.currentTime, 0.05); }
    if (schedulerId !== null) { return; }
    nextNoteTime = c.currentTime + 0.1;
    stepIndex = 0;
    scheduler();
}

export function stopMusic(): void {
    if (schedulerId !== null) {
        window.clearTimeout(schedulerId);
        schedulerId = null;
    }
}

type Note = [freq: number, offset: number, dur: number];

function playSequence(notes: Note[], type: OscillatorType, peak: number): void {
    const c = ensure();
    if (!c || !master) { return; }
    if (c.state === 'suspended') { void c.resume(); }
    const t = c.currentTime;
    for (const [freq, offset, dur] of notes) {
        voice(freq, t + offset, dur, type, peak, master);
    }
}

export function sfxCorrect(): void {
    playSequence([[523.25, 0, 0.12], [659.25, 0.07, 0.12], [783.99, 0.14, 0.18], [1318.51, 0.2, 0.16]], 'triangle', 0.18);
}

export function sfxWrong(): void {
    playSequence([[311.13, 0, 0.16], [233.08, 0.12, 0.26]], 'square', 0.12);
}

export function sfxPop(): void {
    playSequence([[880.0, 0, 0.07], [1174.66, 0.05, 0.08]], 'triangle', 0.13);
}

export function sfxClick(): void {
    playSequence([[523.25, 0, 0.06]], 'square', 0.1);
}

export function sfxWin(): void {
    playSequence([[523.25, 0, 0.16], [659.25, 0.12, 0.16], [783.99, 0.24, 0.16], [1046.5, 0.36, 0.42]], 'square', 0.16);
    playSequence([[261.63, 0.36, 0.6], [392.0, 0.36, 0.6], [523.25, 0.36, 0.6]], 'triangle', 0.08);
}

export function sfxLose(): void {
    playSequence([[392.0, 0, 0.24], [311.13, 0.16, 0.24], [233.08, 0.32, 0.46]], 'sawtooth', 0.12);
}

/** Low rumble for a fault slipping. */
export function sfxQuake(): void {
    playSequence([[58.27, 0, 1.3], [43.65, 0.04, 1.6], [65.41, 0.12, 1.0], [38.89, 0.3, 1.4]], 'sawtooth', 0.2);
    playSequence([[49.0, 0, 0.7]], 'sine', 0.5);
}

/** Grand fanfare for earning a leaderboard medal. */
export function sfxMedal(): void {
    playSequence([[523.25, 0, 0.16], [659.25, 0.14, 0.16], [783.99, 0.28, 0.16], [1046.5, 0.42, 0.18], [1318.51, 0.56, 0.55]], 'square', 0.17);
    playSequence([[261.63, 0.42, 0.9], [392.0, 0.42, 0.9], [523.25, 0.42, 0.9], [659.25, 0.42, 0.9]], 'triangle', 0.07);
    playSequence([[1567.98, 0.62, 0.3], [2093.0, 0.76, 0.4]], 'triangle', 0.09);
    playSequence([[65.41, 0, 0.5]], 'sine', 0.5); // low boom
}
