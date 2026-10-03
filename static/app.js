// CRAWL-TERM // Star Wars Terminal Client Engine

class Starfield {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    this.numStars = 220;
    this.resize();
    this.init();
    
    window.addEventListener('resize', () => this.resize());
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  init() {
    this.stars = [];
    for (let i = 0; i < this.numStars; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.4 + 0.08,
        brightness: Math.random() * 0.8 + 0.2,
        twinkleRate: Math.random() * 0.03 + 0.01,
        twinkleOffset: Math.random() * Math.PI * 2
      });
    }
  }

  animate(time) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (const star of this.stars) {
      star.y += star.speed;
      if (star.y > this.canvas.height) {
        star.y = 0;
        star.x = Math.random() * this.canvas.width;
      }

      const twinkle = Math.sin(time * star.twinkleRate + star.twinkleOffset) * 0.3 + 0.7;
      const alpha = Math.min(1, Math.max(0.1, star.brightness * twinkle));
      
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    requestAnimationFrame(this.animate);
  }
}

// Retro Web Audio Synthesizer (Zero external audio files required!)
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.init();
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playKeyClick() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.03);
  }

  playCrawlTick() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.02);
    gain.gain.setValueAtTime(0.012, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.02);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.02);
  }

  playFanfare() {
    if (!this.enabled || !this.ctx) return;
    
    // Iconic Star Wars Fanfare Opening Motif Notes:
    // Bb3 (233.08Hz), F4 (349.23Hz), Eb4 (311.13Hz), D4 (293.66Hz), C4 (261.63Hz), Bb4 (466.16Hz), F4 (349.23Hz)
    const notes = [
      { freq: 233.08, duration: 0.45, delay: 0.0 },   // Bb3
      { freq: 349.23, duration: 0.45, delay: 0.5 },   // F4
      { freq: 311.13, duration: 0.12, delay: 1.0 },   // Eb4
      { freq: 293.66, duration: 0.12, delay: 1.15 },  // D4
      { freq: 261.63, duration: 0.12, delay: 1.3 },   // C4
      { freq: 466.16, duration: 0.7, delay: 1.45 },   // Bb4
      { freq: 349.23, duration: 0.7, delay: 2.2 }    // F4
    ];

    const now = this.ctx.currentTime + 0.05;

    notes.forEach(n => {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(n.freq, now + n.delay);
      osc2.frequency.setValueAtTime(n.freq * 1.002, now + n.delay); // subtle detune for brass richness

      gain.gain.setValueAtTime(0.001, now + n.delay);
      gain.gain.linearRampToValueAtTime(0.12, now + n.delay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.delay + n.duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now + n.delay);
      osc2.start(now + n.delay);
      osc1.stop(now + n.delay + n.duration);
      osc2.stop(now + n.delay + n.duration);
    });
  }
}

// Main App Controller
class CrawlTerminalApp {
  constructor() {
    this.starfield = new Starfield(document.getElementById('starfield'));
    this.sound = new SoundFX();
    this.socket = null;
    this.term = null;
    this.fitAddon = null;

    this.fontSize = 22;
    this.crawlSpeed = 1000; // adjustable delay in ms (1000ms = 1.0s authentic movie crawl)
    this.crawlQueue = [];
    this.textBuffer = '';
    this.crawlTimer = null;
    this.bufferFlushTimer = null;
    this.gliding = false;
    this.glideFrom = 0;
    this.glideTo = 0;
    this.glideStart = 0;
    this.glideDur = 0;
    this.bufferPx = 48;
    this.scrollRaf = 0;
    this.scrollHoldUntil = 0;
    this.textDecoder = new TextDecoder();

    this.isCrawling = false;
    this.currentFade = 0;
    this.targetFade = 0;
    this.crawlFadeMax = 155;

    this.elements = {
      viewport: document.getElementById('viewport'),
      stage: document.getElementById('terminal-stage'),
      container: document.getElementById('terminal-container'),
      introOverlay: document.getElementById('intro-overlay'),
      introBlueText: document.getElementById('intro-blue-text'),
      introLogo: document.getElementById('intro-logo'),
      skipIntroBtn: document.getElementById('skip-intro-btn'),
      tiltSlider: document.getElementById('tilt-slider'),
      tiltVal: document.getElementById('tilt-val'),
      modeCrawl: document.getElementById('mode-crawl'),
      modeSubtle: document.getElementById('mode-subtle'),
      modeFlat: document.getElementById('mode-flat'),
      speedSlider: document.getElementById('speed-slider'),
      speedVal: document.getElementById('speed-val'),
      fontDecBtn: document.getElementById('font-dec-btn'),
      fontIncBtn: document.getElementById('font-inc-btn'),
      fontSizeVal: document.getElementById('font-size-val'),
      themePreset: document.getElementById('theme-preset'),
      soundBtn: document.getElementById('sound-btn'),
      replayBtn: document.getElementById('replay-btn'),
      fullscreenBtn: document.getElementById('fullscreen-btn'),
      collapseHudBtn: document.getElementById('collapse-hud-btn'),
      expandHudBtn: document.getElementById('expand-hud-btn'),
      hudBar: document.getElementById('hud-bar'),
      connStatus: document.getElementById('conn-status')
    };

    this.initTerminal();
    this.bindEvents();
    this.connectWebSocket();
    this.runIntroSequence();
  }

  initTerminal() {
    this.term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: `'JetBrains Mono', 'SF Mono', Consolas, monospace`,
      fontSize: this.fontSize,
      fontWeight: '700',
      lineHeight: 1.25,
      letterSpacing: 0.8,
      allowTransparency: true,
      scrollback: 2000,
      logLevel: 'off',
      theme: {
        background: 'transparent',
        foreground: '#FFE81F',
        cursor: '#FFE81F',
        selectionBackground: 'rgba(255, 232, 31, 0.3)',
        black: '#000000',
        red: '#FF3344',
        green: '#44FF77',
        yellow: '#FFE81F',
        blue: '#4BD5EE',
        magenta: '#E066FF',
        cyan: '#4BD5EE',
        white: '#FFFFFF',
        brightBlack: '#666666',
        brightRed: '#FF6677',
        brightGreen: '#77FFAA',
        brightYellow: '#FFF277',
        brightBlue: '#77E6FF',
        brightMagenta: '#F099FF',
        brightCyan: '#77E6FF',
        brightWhite: '#FFFFFF'
      }
    });

    this.fitAddon = new FitAddon.FitAddon();
    this.term.loadAddon(this.fitAddon);
    this.term.open(this.elements.container);

    setTimeout(() => {
      this.resizeTerminal();
      this.term.focus();
    }, 100);

    // Forward terminal input to backend
    this.term.onData(data => {
      // Keystrokes skip the crawl and immediately collapse the bottom gradient
      // so the prompt line and typing are 100% crisp and unmasked.
      this.setCrawling(false);
      this.currentFade = 0;
      document.documentElement.style.setProperty('--crawl-fade-height', '0px');
      if (this.crawlQueue.length > 0 || this.textBuffer.length > 0 || this.gliding) {
        this.flushCrawlQueue();
      }
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(data);
      }
      this.sound.playKeyClick();
    });
  }

  connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}/ws`;

    this.elements.connStatus.textContent = 'CONNECTING...';
    this.elements.connStatus.style.color = '#FFAA00';

    this.socket = new WebSocket(wsUrl);
    this.socket.binaryType = 'arraybuffer';

    this.socket.onopen = () => {
      this.elements.connStatus.textContent = 'SHELL READY';
      this.elements.connStatus.style.color = '#39FF14';
      this.resizeTerminal();
    };

    this.socket.onmessage = (event) => {
      let text;
      if (typeof event.data === 'string') {
        text = event.data;
      } else {
        text = this.textDecoder.decode(event.data);
      }
      this.handleIncomingData(text);
    };

    this.socket.onclose = () => {
      this.elements.connStatus.textContent = 'DISCONNECTED';
      this.elements.connStatus.style.color = '#FF3344';
      this.term.write('\r\n\x1b[31m[Session terminated. Reconnecting in 3s...]\x1b[0m\r\n');
      setTimeout(() => this.connectWebSocket(), 3000);
    };

    this.socket.onerror = (err) => {
      console.error('WebSocket Error:', err);
    };
  }

  resizeTerminal() {
    this.gliding = false;
    if (!this.term || !this.fitAddon) {
      this._syncBuffer();
      return;
    }
    this.fitAddon.fit();
    const prevBuffer = this.bufferPx;
    this._syncBuffer();
    if (this.bufferPx !== prevBuffer) this.fitAddon.fit();
    const dims = this.fitAddon.proposeDimensions();
    if (dims && dims.cols && dims.rows && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'resize',
        cols: dims.cols,
        rows: dims.rows
      }));
    }
    this._setShift(0);
  }

  runIntroSequence() {
    const { introOverlay, introBlueText, introLogo } = this.elements;
    introOverlay.classList.add('active');
    introBlueText.classList.add('show');
    introLogo.classList.remove('animate');

    // 1. Blue prologue text
    this.introTimer1 = setTimeout(() => {
      introBlueText.classList.remove('show');
      
      // 2. Logo fanfare
      this.introTimer2 = setTimeout(() => {
        introLogo.classList.add('animate');
        this.sound.playFanfare();

        // 3. Fade into interactive terminal
        this.introTimer3 = setTimeout(() => {
          this.endIntro();
        }, 5500);
      }, 800);
    }, 2800);
  }

  endIntro() {
    clearTimeout(this.introTimer1);
    clearTimeout(this.introTimer2);
    clearTimeout(this.introTimer3);

    this.elements.introOverlay.classList.remove('active');
    this.elements.introBlueText.classList.remove('show');
    this.elements.introLogo.classList.remove('animate');
    
    this.flushCrawlQueue();
    this.resizeTerminal();
    this.term.scrollToBottom();
    this.term.focus();
  }

  handleIncomingData(text) {
    // Full-screen apps (vim, less) must not be line-paced.
    if (this.term.buffer.active.type === 'alternate') {
      this.flushCrawlQueue();
      this._writeSync(text);
      return;
    }

    // While intro overlay is active, write directly so shell startup settles at the bottom
    if (this.elements.introOverlay.classList.contains('active')) {
      this._writeSync(text);
      this.term.scrollToBottom();
      return;
    }

    if (this.crawlSpeed === 0) {
      this._writeSync(text);
      return;
    }

    // Direct echo for active user typing: if no newlines and no existing queue, write immediately.
    if (!this.gliding && this.crawlQueue.length === 0 && this.textBuffer.length === 0 && !text.includes('\n') && !text.includes('\r')) {
      this._writeSync(text);
      return;
    }

    // Screen clear sequences: reset queue and restore cursor to bottom
    if (text.includes('\x1b[2J') || text.includes('\x1b[H\x1b[2J')) {
      this.flushCrawlQueue();
      this._writeSync(text);
      this._writeSync('\r\n'.repeat(Math.max(0, this.term.rows - 1)));
      return;
    }

    // Accumulate in buffer and split by newlines
    this.textBuffer += text;

    if (this.bufferFlushTimer) {
      clearTimeout(this.bufferFlushTimer);
      this.bufferFlushTimer = null;
    }

    const parts = this.textBuffer.split('\n');
    // The last fragment is either an incomplete line or the trailing prompt without newline
    this.textBuffer = parts.pop();

    for (const part of parts) {
      this.crawlQueue.push(part + '\n');
    }

    // If there is a trailing fragment (like the next shell prompt), flush it after stream pauses
    if (this.textBuffer.length > 0) {
      this.bufferFlushTimer = setTimeout(() => {
        if (this.textBuffer.length > 0) {
          if (this.gliding || this.crawlQueue.length > 0) {
            this._drainPassthrough();
          } else {
            this._writeSync(this.textBuffer);
            this.textBuffer = '';
          }
        }
      }, 30);
    }

    this.startCrawlProcessor();
  }

  getRowHeight() {
    const dims = this.term && this.term._core && this.term._core._renderService && this.term._core._renderService.dimensions;
    const h = dims && dims.css && dims.css.cell && dims.css.cell.height;
    if (h > 0) return h;
    const lineHeight = (this.term && this.term.options.lineHeight) || 1.25;
    return this.fontSize * lineHeight;
  }

  _writeSync(text) {
    if (!text) return;
    this.term._core.writeSync(text);
  }

  // Keep a blank ingress strip under the prompt so the bottom mask never covers the cursor,
  // and so a new incoming row starts 100% transparent and glides smoothly up into view.
  _syncBuffer() {
    const tiltRaw = getComputedStyle(document.documentElement).getPropertyValue('--tilt-angle');
    const tilt = parseFloat(tiltRaw) || 0;
    const flat = document.body.getAttribute('data-mode') === 'flat' || tilt === 0;
    const rowH = this.term ? this.getRowHeight() : 28;
    this.bufferPx = flat ? 0 : Math.round(rowH * 2);
    // When crawling, extend gradient higher (~5.5 rows) for deep cinematic atmospheric cover.
    this.crawlFadeMax = flat ? 0 : Math.round(rowH * 5.5);
    document.documentElement.style.setProperty('--row-height', `${rowH.toFixed(2)}px`);
    document.documentElement.style.setProperty('--crawl-buffer', `${this.bufferPx}px`);
    if (!this.isCrawling) {
      document.documentElement.style.setProperty('--crawl-fade-height', '0px');
    }
  }

  setCrawling(active) {
    if (this.isCrawling === active && this.targetFade === (active ? this.crawlFadeMax : 0)) return;
    this.isCrawling = active;
    this.targetFade = active ? this.crawlFadeMax : 0;
    if (this.elements.stage) {
      this.elements.stage.classList.toggle('is-crawling', active);
    }
    // When transitioning back to typing/idle, run a smooth collapse loop if the crawl loop stopped
    if (!active && this.currentFade > 0 && !this.scrollRaf) {
      this._startFadeCollapse();
    }
  }

  _updateFadeTransition() {
    if (Math.abs(this.currentFade - this.targetFade) < 0.5) {
      this.currentFade = this.targetFade;
    } else {
      // Smooth interpolation: quick ramp up when output arrives, gentle decay when ready to type
      const factor = this.isCrawling ? 0.16 : 0.12;
      this.currentFade += (this.targetFade - this.currentFade) * factor;
    }
    document.documentElement.style.setProperty('--crawl-fade-height', `${this.currentFade.toFixed(1)}px`);
  }

  _startFadeCollapse() {
    const step = () => {
      this._updateFadeTransition();
      if (this.currentFade > 0 && !this.isCrawling) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }

  _setShift(px) {
    const el = this.term && this.term.element;
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform = px > 0.1 ? `translate3d(0, ${px.toFixed(2)}px, 0)` : '';
  }

  _rowDuration() {
    let delay = this.crawlSpeed;
    if (this.crawlQueue.length > 8) {
      const factor = Math.min(0.8, (this.crawlQueue.length - 8) * 0.025);
      delay = Math.max(40, Math.round(this.crawlSpeed * (1 - factor)));
    }
    return Math.max(16, delay);
  }

  _flushTermRender() {
    const debouncer = this.term._core && this.term._core._renderService && this.term._core._renderService._renderDebouncer;
    if (debouncer && debouncer._animationFrame && typeof debouncer._innerRefresh === 'function') {
      debouncer._innerRefresh();
    }
  }

  _drainPassthrough() {
    while (this.crawlQueue.length > 0 && !this.crawlQueue[0].includes('\n')) {
      this._writeSync(this.crawlQueue.shift());
    }
    // If no more newlines are queued, immediately append any trailing prompt in textBuffer
    // to the row currently gliding so it glides in smoothly rather than popping in afterwards.
    if (this.crawlQueue.length === 0 && this.textBuffer.length > 0 && !this.textBuffer.includes('\n')) {
      this._writeSync(this.textBuffer);
      this.textBuffer = '';
      if (this.bufferFlushTimer) {
        clearTimeout(this.bufferFlushTimer);
        this.bufferFlushTimer = null;
      }
    }
  }

  startCrawlProcessor() {
    this.setCrawling(true);
    if (this.scrollRaf) return;
    const loop = (now) => {
      this.scrollRaf = requestAnimationFrame(loop);
      this._stepCrawl(now);
    };
    this.scrollRaf = requestAnimationFrame(loop);
  }

  _stopCrawlLoop() {
    if (this.scrollRaf) {
      cancelAnimationFrame(this.scrollRaf);
      this.scrollRaf = 0;
    }
    this.setCrawling(false);
  }

  _stepCrawl(now) {
    this._updateFadeTransition();

    if (this.crawlSpeed === 0) {
      this.flushCrawlQueue();
      return;
    }

    // Prompt redraws belong on the line that is currently moving.
    this._drainPassthrough();

    let carry = 0;
    if (this.gliding) {
      const elapsed = now - this.glideStart;
      if (elapsed < this.glideDur) {
        const t = elapsed / this.glideDur;
        this._setShift(this.glideFrom + (this.glideTo - this.glideFrom) * t);
        return;
      }
      carry = Math.min(this.glideDur * 0.5, elapsed - this.glideDur);
      this.gliding = false;
      this._setShift(this.glideTo);
    }

    if (now < this.scrollHoldUntil) {
      if (this.crawlQueue.length === 0 && !this.textBuffer) this._stopCrawlLoop();
      return;
    }

    if (this.crawlQueue.length === 0) {
      this._stopCrawlLoop();
      this._setShift(0);
      return;
    }

    this._beginRowGlide(now, carry);
  }

  _beginRowGlide(now, carry = 0) {
    const chunk = this.crawlQueue.shift();
    if (!chunk) return;

    const rowH = this.getRowHeight();
    const before = this.term.buffer.active.baseY;
    this._writeSync(chunk);
    const scrolled = Math.max(0, this.term.buffer.active.baseY - before);
    this._drainPassthrough();
    this._flushTermRender();

    if (scrolled <= 0 || rowH <= 0) {
      if (chunk.includes('\n')) {
        this.sound.playCrawlTick();
        this.scrollHoldUntil = now + this._rowDuration();
      }
      this._setShift(0);
      return;
    }

    // The new row is written into xterm DOM. Push it down into the transparent buffer strip
    // (where the bottom gradient mask renders it 100% invisible), then smoothly glide it up.
    const distance = scrolled * rowH;
    const dur = this._rowDuration() * scrolled;
    this.glideFrom = distance;
    this.glideTo = 0;
    this.glideStart = now - carry;
    this.glideDur = dur;
    this.gliding = true;

    const initialT = carry > 0 ? Math.min(1, carry / dur) : 0;
    this._setShift(distance * (1 - initialT));
    this.sound.playCrawlTick();
  }

  flushCrawlQueue() {
    this.setCrawling(false);
    this.currentFade = 0;
    document.documentElement.style.setProperty('--crawl-fade-height', '0px');
    this._stopCrawlLoop();
    this.scrollHoldUntil = 0;
    this.gliding = false;
    this._setShift(0);
    if (this.crawlTimer) {
      clearTimeout(this.crawlTimer);
      this.crawlTimer = null;
    }
    if (this.bufferFlushTimer) {
      clearTimeout(this.bufferFlushTimer);
      this.bufferFlushTimer = null;
    }
    const pending = this.crawlQueue.join('') + this.textBuffer;
    this.crawlQueue.length = 0;
    this.textBuffer = '';
    this._writeSync(pending);
  }

  setSpeed(ms) {
    this.crawlSpeed = ms;
    this.elements.speedSlider.value = ms;

    if (ms === 0) {
      this.elements.speedVal.textContent = 'Instant';
      this.flushCrawlQueue();
    } else if (ms < 1000) {
      this.elements.speedVal.textContent = `${(ms / 1000).toFixed(2)}s`;
    } else {
      this.elements.speedVal.textContent = `${(ms / 1000).toFixed(1)}s`;
    }
  }

  setTheme(theme) {
    document.body.removeAttribute('data-theme');
    
    let fg = '#FFE81F';
    if (theme === 'sith') {
      document.body.setAttribute('data-theme', 'sith');
      fg = '#FF3344';
    } else if (theme === 'hoth') {
      document.body.setAttribute('data-theme', 'hoth');
      fg = '#4BD5EE';
    } else if (theme === 'yoda') {
      document.body.setAttribute('data-theme', 'yoda');
      fg = '#44FF77';
    } else if (theme === 'flat') {
      document.body.setAttribute('data-theme', 'flat');
      this.elements.tiltSlider.value = 0;
      this.setTilt(0);
      return;
    }

    this.term.options.theme = {
      ...this.term.options.theme,
      foreground: fg,
      cursor: fg,
      selectionBackground: `${fg}44`
    };
  }

  setFontSize(deltaOrSize) {
    if (typeof deltaOrSize === 'number' && deltaOrSize > 10 && deltaOrSize < 50) {
      this.fontSize = deltaOrSize;
    } else {
      this.fontSize = Math.min(36, Math.max(14, this.fontSize + deltaOrSize));
    }
    this.elements.fontSizeVal.textContent = `${this.fontSize}px`;
    this.term.options.fontSize = this.fontSize;
    this.resizeTerminal();
  }

  setMode(mode) {
    this.elements.modeCrawl.classList.remove('active');
    this.elements.modeSubtle.classList.remove('active');
    this.elements.modeFlat.classList.remove('active');
    document.body.removeAttribute('data-mode');

    if (mode === 'crawl') {
      this.elements.modeCrawl.classList.add('active');
      this.elements.tiltSlider.value = 24;
      this.setTilt(24);
    } else if (mode === 'subtle') {
      this.elements.modeSubtle.classList.add('active');
      this.elements.tiltSlider.value = 8;
      this.setTilt(8);
    } else if (mode === 'flat') {
      this.elements.modeFlat.classList.add('active');
      document.body.setAttribute('data-mode', 'flat');
      this.elements.tiltSlider.value = 0;
      this.setTilt(0);
    }
  }

  setTilt(deg) {
    document.documentElement.style.setProperty('--tilt-angle', `${deg}deg`);
    this.elements.tiltVal.textContent = `${deg}°`;
    this.resizeTerminal();
  }

  bindEvents() {
    // Window Resize
    window.addEventListener('resize', () => this.resizeTerminal());

    // Click anywhere on stage to focus terminal
    this.elements.viewport.addEventListener('click', () => {
      this.term.focus();
    });

    // Perspective Mode Buttons
    this.elements.modeCrawl.addEventListener('click', () => {
      this.sound.playKeyClick();
      this.setMode('crawl');
    });
    this.elements.modeSubtle.addEventListener('click', () => {
      this.sound.playKeyClick();
      this.setMode('subtle');
    });
    this.elements.modeFlat.addEventListener('click', () => {
      this.sound.playKeyClick();
      this.setMode('flat');
    });

    // Crawl Speed Slider
    this.elements.speedSlider.addEventListener('input', (e) => {
      this.setSpeed(parseInt(e.target.value, 10));
    });

    // Font Size Buttons
    this.elements.fontDecBtn.addEventListener('click', () => {
      this.sound.playKeyClick();
      this.setFontSize(-2);
    });
    this.elements.fontIncBtn.addEventListener('click', () => {
      this.sound.playKeyClick();
      this.setFontSize(2);
    });

    // Intro Skip
    this.elements.skipIntroBtn.addEventListener('click', () => this.endIntro());
    window.addEventListener('keydown', (e) => {
      if (this.elements.introOverlay.classList.contains('active')) {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
          this.endIntro();
        }
      }
    });

    // Tilt Slider
    this.elements.tiltSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.setTilt(val);
      if (val === 0) {
        document.body.setAttribute('data-mode', 'flat');
        this.elements.modeFlat.classList.add('active');
        this.elements.modeCrawl.classList.remove('active');
        this.elements.modeSubtle.classList.remove('active');
      } else if (val <= 10) {
        document.body.setAttribute('data-mode', 'subtle');
        this.elements.modeSubtle.classList.add('active');
        this.elements.modeCrawl.classList.remove('active');
        this.elements.modeFlat.classList.remove('active');
      } else {
        document.body.removeAttribute('data-mode');
        this.elements.modeFlat.classList.remove('active');
        this.elements.modeSubtle.classList.remove('active');
        this.elements.modeCrawl.classList.add('active');
      }
    });

    // Theme selector
    this.elements.themePreset.addEventListener('change', (e) => {
      this.sound.playKeyClick();
      this.setTheme(e.target.value);
    });

    // Sound toggle
    this.elements.soundBtn.addEventListener('click', () => {
      const active = this.sound.toggle();
      this.sound.playKeyClick();
      this.elements.soundBtn.classList.toggle('active', active);
      this.elements.soundBtn.innerHTML = active ? 
        '<span class="btn-icon">🔊</span><span class="sw-hex-text">AUDIO</span>' : 
        '<span class="btn-icon">🔇</span><span class="sw-hex-text">AUDIO</span>';
    });

    // Replay intro
    this.elements.replayBtn.addEventListener('click', () => {
      this.sound.playKeyClick();
      this.runIntroSequence();
    });

    // Fullscreen toggle
    this.elements.fullscreenBtn.addEventListener('click', () => {
      this.sound.playKeyClick();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // Collapse / Expand HUD
    this.elements.collapseHudBtn.addEventListener('click', () => {
      this.sound.playKeyClick();
      this.elements.hudBar.classList.add('collapsed');
      this.elements.expandHudBtn.classList.remove('hidden');
    });

    this.elements.expandHudBtn.addEventListener('click', () => {
      this.sound.playKeyClick();
      this.elements.hudBar.classList.remove('collapsed');
      this.elements.expandHudBtn.classList.add('hidden');
    });
  }
}

// Bootstrap once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new CrawlTerminalApp();
});
