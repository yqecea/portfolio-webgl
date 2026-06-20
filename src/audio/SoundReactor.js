const STORAGE_KEYS = {
  wasPlaying: 'audioWasPlaying',
  time: 'audioTime'
};

export { STORAGE_KEYS };

export default class SoundReactor {
  constructor(audioUrl, options = {}) {
    this.url = audioUrl;
    this.enableAnalyser = options.enableAnalyser === true;
    this.storage = options.storage || STORAGE_KEYS;

    this.ctx = null;
    this.audio = null;
    this.audioSource = null;
    this.analyser = null;
    this.fdata = [];

    this.update = this.update.bind(this);
  }

  _safeGet(key) {
    try {
      return window['localStorage'].getItem(key);
    } catch (error) {
      console.warn('[SoundReactor] localStorage read blocked:', error);
      return null;
    }
  }

  _safeSet(key, value) {
    try {
      window['localStorage'].setItem(key, value);
    } catch (error) {
      console.warn('[SoundReactor] localStorage write blocked:', error);
    }
  }

  init() {
    if (this.audio) return;

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      console.warn('[SoundReactor] AudioContext not supported');
      return;
    }

    this.ctx = new AudioContextCtor();
    this.audio = new Audio(this.url);
    this.audio.loop = true;
    this.audio.crossOrigin = 'anonymous';

    if (!this.enableAnalyser) return;

    this.audioSource = this.ctx.createMediaElementSource(this.audio);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.smoothingTimeConstant = 0.4;

    this.audioSource.connect(this.analyser);
    this.audioSource.connect(this.ctx.destination);
    this.fdata = new Uint8Array(this.analyser.frequencyBinCount);
  }

  update() {
    if (!this.analyser || !this.fdata) return;
    this.analyser.getByteFrequencyData(this.fdata);
  }

  async resumeContextIfNeeded() {
    if (!this.ctx || this.ctx.state !== 'suspended') return;
    try {
      await this.ctx.resume();
    } catch (error) {
      console.warn('[SoundReactor] Unable to resume context:', error);
    }
  }

  restorePlaybackTime() {
    if (!this.audio) return;
    const saved = Number(this._safeGet(this.storage.time) || 0);
    if (!Number.isFinite(saved) || saved <= 0) return;

    try {
      const duration = Number(this.audio.duration);
      if (Number.isFinite(duration) && duration > 0) {
        this.audio.currentTime = Math.min(saved, duration - 0.25);
      } else {
        this.audio.currentTime = saved;
      }
    } catch (error) {
      // Ignore invalid seeks before metadata is loaded.
    }
  }

  syncStorage() {
    if (!this.audio) return;
    this._safeSet(this.storage.time, String(this.audio.currentTime || 0));
    this._safeSet(this.storage.wasPlaying, String(!this.audio.paused));
  }

  setWasPlaying(value) {
    this._safeSet(this.storage.wasPlaying, String(Boolean(value)));
  }

  getWasPlaying() {
    return this._safeGet(this.storage.wasPlaying) === 'true';
  }

  async play({ restore = true } = {}) {
    if (!this.audio) return;
    await this.resumeContextIfNeeded();
    if (restore) this.restorePlaybackTime();

    try {
      await this.audio.play();
      this.setWasPlaying(true);
    } catch (error) {
      console.warn('[SoundReactor] Play blocked:', error);
    }
  }

  pause() {
    if (!this.audio) return;
    this.syncStorage();
    this.audio.pause();
    this.setWasPlaying(false);
  }

  setVolume(volume) {
    if (!this.audio) return;
    this.audio.volume = Math.max(0, Math.min(1, Number(volume)));
  }

  isPlaying() {
    return Boolean(this.audio && !this.audio.paused);
  }
}
