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
    this.crawlSpeed = 800; // adjustable delay in ms (800ms = 0.8s authentic movie crawl)
    this.crawlQueue = [];
    this.textBuffer = '';
    this.crawlTimer = null;
    this.bufferFlushTimer = null;
    this.textDecoder = new TextDecoder();

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
      // If user types any key while the crawl is active, flush queue so they never lag
      if (this.crawlQueue.length > 0) {
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
    if (!this.term || !this.fitAddon) return;
    this.fitAddon.fit();
    const dims = this.fitAddon.proposeDimensions();
    if (dims && dims.cols && dims.rows && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'resize',
        cols: dims.cols,
        rows: dims.rows
      }));
    }
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
    
    this.resizeTerminal();
    this.term.focus();
  }

  handleIncomingData(text) {
    if (this.crawlSpeed === 0) {
      this.term.write(text);
      return;
    }

    // Direct echo for active user typing: if no newlines and no existing queue, write immediately
    if (this.crawlQueue.length === 0 && !text.includes('\n') && !text.includes('\r')) {
      this.term.write(text);
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
          this.crawlQueue.push(this.textBuffer);
          this.textBuffer = '';
          this.startCrawlProcessor();
        }
      }, 50);
    }

    this.startCrawlProcessor();
  }

  getRowHeight() {
    const row = this.elements.container.querySelector('.xterm-rows > div');
    if (row) {
      const rect = row.getBoundingClientRect();
      if (rect.height > 0) return rect.height;
    }
    return this.fontSize * 1.25;
  }

  startCrawlProcessor() {
    if (this.crawlTimer) return;

    const processStep = () => {
      if (this.crawlQueue.length === 0) {
        this.crawlTimer = null;
        const screen = this.elements.container.querySelector('.xterm-screen');
        if (screen) {
          screen.style.transition = 'none';
          screen.style.transform = 'none';
        }
        return;
      }

      const chunk = this.crawlQueue.shift();
      const screen = this.elements.container.querySelector('.xterm-screen');
      const rowHeight = this.getRowHeight();

      if (this.crawlSpeed === 0) {
        this.term.write(chunk);
        this.flushCrawlQueue();
        this.crawlTimer = null;
        return;
      }

      // Base delay from speed slider (ms).
      // If queue is long (> 8 lines), smoothly accelerate so large outputs don't stall
      let delay = this.crawlSpeed;
      if (this.crawlQueue.length > 8) {
        const factor = Math.min(0.8, (this.crawlQueue.length - 8) * 0.025);
        delay = Math.max(40, Math.round(this.crawlSpeed * (1 - factor)));
      }

      // Check if this chunk triggers a newline/row advance
      const hasNewline = chunk.includes('\n');

      if (hasNewline && screen && delay >= 60) {
        // Zero-flicker smooth scroll sequence:
        // 1. Offset screen down by rowHeight BEFORE writing so bottom line is hidden below the visible threshold
        screen.style.transition = 'none';
        screen.style.transform = `translateY(${rowHeight}px)`;

        // 2. Write the new line to xterm buffer
        this.term.write(chunk);
        this.sound.playCrawlTick();

        // 3. Force browser reflow to commit the offset
        void screen.offsetHeight;

        // 4. Smoothly glide upward to 0px on next frame
        requestAnimationFrame(() => {
          screen.style.transition = `transform ${delay}ms linear`;
          screen.style.transform = 'translateY(0px)';
        });
      } else {
        this.term.write(chunk);
        this.sound.playCrawlTick();
        if (screen) {
          screen.style.transition = 'none';
          screen.style.transform = 'none';
        }
      }

      this.crawlTimer = setTimeout(processStep, delay);
    };

    processStep();
  }

  flushCrawlQueue() {
    if (this.crawlTimer) {
      clearTimeout(this.crawlTimer);
      this.crawlTimer = null;
    }
    if (this.bufferFlushTimer) {
      clearTimeout(this.bufferFlushTimer);
      this.bufferFlushTimer = null;
    }
    const screen = this.elements.container.querySelector('.xterm-screen');
    if (screen) {
      screen.style.transition = 'none';
      screen.style.transform = 'none';
    }
    while (this.crawlQueue.length > 0) {
      this.term.write(this.crawlQueue.shift());
    }
    if (this.textBuffer.length > 0) {
      this.term.write(this.textBuffer);
      this.textBuffer = '';
    }
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
      this.elements.tiltSlider.value = 18;
      this.setTilt(18);
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
    this.elements.modeCrawl.addEventListener('click', () => this.setMode('crawl'));
    this.elements.modeSubtle.addEventListener('click', () => this.setMode('subtle'));
    this.elements.modeFlat.addEventListener('click', () => this.setMode('flat'));

    // Crawl Speed Slider
    this.elements.speedSlider.addEventListener('input', (e) => {
      this.setSpeed(parseInt(e.target.value, 10));
    });

    // Font Size Buttons
    this.elements.fontDecBtn.addEventListener('click', () => this.setFontSize(-2));
    this.elements.fontIncBtn.addEventListener('click', () => this.setFontSize(2));

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
      } else {
        document.body.removeAttribute('data-mode');
        this.elements.modeFlat.classList.remove('active');
      }
    });

    // Theme selector
    this.elements.themePreset.addEventListener('change', (e) => {
      this.setTheme(e.target.value);
    });

    // Sound toggle
    this.elements.soundBtn.addEventListener('click', () => {
      const active = this.sound.toggle();
      this.elements.soundBtn.classList.toggle('active', active);
      this.elements.soundBtn.innerHTML = active ? '<span class="btn-icon">🔊</span> Sound' : '<span class="btn-icon">🔇</span> Sound';
    });

    // Replay intro
    this.elements.replayBtn.addEventListener('click', () => {
      this.runIntroSequence();
    });

    // Fullscreen toggle
    this.elements.fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // Collapse / Expand HUD
    this.elements.collapseHudBtn.addEventListener('click', () => {
      this.elements.hudBar.classList.add('collapsed');
      this.elements.expandHudBtn.classList.remove('hidden');
    });

    this.elements.expandHudBtn.addEventListener('click', () => {
      this.elements.hudBar.classList.remove('collapsed');
      this.elements.expandHudBtn.classList.add('hidden');
    });
  }
}

// Bootstrap once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new CrawlTerminalApp();
});
