// Play the melody for the word in the box, and light each letter as it sounds.

(function () {
  var stage = document.getElementById('stage');
  var wordInput = document.getElementById('word');
  var playButton = document.getElementById('play');
  var loopButton = document.getElementById('loop');
  var shareButton = document.getElementById('share');
  var how = document.getElementById('how');
  var form = document.getElementById('composer');
  var chips = document.querySelectorAll('.chips button');

  var PALETTE = ['#ffb4c8', '#ffd0a8', '#ffe38a', '#b7f3c9', '#a9d4ff', '#d4c4ff', '#ffc4b0', '#9ae8ea'];

  var audioCtx = null;
  var master = null;
  var active = [];
  var timers = [];
  var runId = 0;
  var playing = false;
  var looping = false;
  var shareTimer = 0;

  function colorFor(ch) {
    var code = ch.toLowerCase().charCodeAt(0) || 0;
    return PALETTE[code % PALETTE.length];
  }

  function currentWord() {
    return wordInput.value.slice(0, 42);
  }

  function render(word) {
    var melody = wordToMelody(word);
    stage.textContent = '';
    if (!melody.notes.length) {
      var hint = document.createElement('span');
      hint.className = 'hint';
      hint.textContent = 'your word will dance here';
      stage.appendChild(hint);
    } else {
      melody.notes.forEach(function (note, index) {
        var span = document.createElement('span');
        var space = note.char === ' ';
        span.className = 'letter' + (space ? ' gap' : '') + (note.rest && !space ? ' quiet' : '');
        span.dataset.index = String(index);
        span.textContent = space ? '' : note.char;
        if (!note.rest) span.style.background = colorFor(note.char);
        stage.appendChild(span);
      });
    }
    how.textContent = describeMelody(melody);
    return melody;
  }

  function setHash(word) {
    var base = location.pathname + location.search;
    var desired = word ? base + '#' + encodeURIComponent(word) : base;
    if (location.pathname + location.search + location.hash === desired) return;
    try {
      history.replaceState(null, '', desired);
    } catch (error) {
      location.hash = word ? encodeURIComponent(word) : '';
    }
  }

  function readHash() {
    var raw = location.hash.charAt(0) === '#' ? location.hash.slice(1) : location.hash;
    if (!raw) return '';
    try {
      return decodeURIComponent(raw.replace(/\+/g, ' '));
    } catch (error) {
      return raw;
    }
  }

  function ensureAudio() {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx) audioCtx = new AudioContext();
    if (!master) {
      master = audioCtx.createGain();
      master.gain.value = 0.9;
      master.connect(audioCtx.destination);
    }
    return audioCtx;
  }

  function clearTimers() {
    timers.forEach(function (timer) { clearTimeout(timer); });
    timers = [];
  }

  function silence() {
    if (!audioCtx) {
      active = [];
      return;
    }
    var now = audioCtx.currentTime;
    active.forEach(function (node) {
      try {
        node.gain.gain.cancelScheduledValues(now);
        node.gain.gain.setValueAtTime(Math.max(node.gain.gain.value, 0.0001), now);
        node.gain.gain.linearRampToValueAtTime(0.0001, now + 0.03);
        node.osc.stop(now + 0.04);
      } catch (error) {
        // already stopped
      }
    });
    active = [];
  }

  function clearLights() {
    var lit = stage.querySelectorAll('.letter.on');
    var i;
    for (i = 0; i < lit.length; i++) lit[i].classList.remove('on');
  }

  function light(index) {
    var letters = stage.querySelectorAll('.letter');
    var i;
    for (i = 0; i < letters.length; i++) {
      if (Number(letters[i].dataset.index) !== index) letters[i].classList.remove('on');
    }
    var el = letters[index];
    if (!el) return;
    el.classList.remove('on');
    void el.offsetWidth;
    el.classList.add('on');
  }

  function stop() {
    runId += 1;
    clearTimers();
    silence();
    clearLights();
    playing = false;
    document.body.classList.remove('is-playing');
    playButton.textContent = 'Play';
  }

  function hasVoice(melody) {
    var i;
    for (i = 0; i < melody.notes.length; i++) {
      if (!melody.notes[i].rest) return true;
    }
    return false;
  }

  function schedule(melody, myRun) {
    if (runId !== myRun || !audioCtx) return;
    clearTimers();
    silence();
    var beat = 60 / melody.tempo;
    var t = audioCtx.currentTime + 0.05;

    melody.notes.forEach(function (note, index) {
      var start = t;
      if (!note.rest) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = melody.waveform;
        if (note.accent) {
          osc.frequency.setValueAtTime(note.frequency * 1.03, start);
          osc.frequency.exponentialRampToValueAtTime(note.frequency, start + 0.045);
        } else {
          osc.frequency.setValueAtTime(note.frequency, start);
        }
        var dur = Math.max(0.09, note.beats * beat * 0.88);
        var peak = note.accent ? 0.34 : 0.2;
        if (melody.waveform === 'square') peak *= 0.42;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(peak, start + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(gain);
        gain.connect(master);
        osc.start(start);
        osc.stop(start + dur + 0.03);
        active.push({ osc: osc, gain: gain });
      }

      var delay = Math.max(0, (start - audioCtx.currentTime) * 1000);
      timers.push(setTimeout(function () {
        if (runId !== myRun) return;
        light(index);
      }, delay));
      t += note.beats * beat;
    });

    var endDelay = Math.max(0, (t - audioCtx.currentTime) * 1000 + 80);
    timers.push(setTimeout(function () {
      if (runId !== myRun) return;
      clearLights();
      if (looping) {
        var again = wordToMelody(currentWord());
        render(currentWord());
        if (!hasVoice(again)) {
          stop();
          return;
        }
        schedule(again, myRun);
        return;
      }
      playing = false;
      document.body.classList.remove('is-playing');
      playButton.textContent = 'Play';
      active = [];
    }, endDelay));
  }

  function play() {
    var word = currentWord();
    var melody = render(word);
    setHash(word);
    if (!hasVoice(melody)) {
      stop();
      wordInput.focus();
      return;
    }
    var ctx = ensureAudio();
    stop();
    playing = true;
    document.body.classList.add('is-playing');
    playButton.textContent = 'Stop';
    var myRun = runId;
    if (ctx.state === 'suspended') ctx.resume();
    schedule(melody, myRun);
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (playing) stop();
    else play();
  });

  wordInput.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (playing) stop();
    else play();
  });

  loopButton.addEventListener('click', function () {
    looping = !looping;
    loopButton.setAttribute('aria-pressed', looping ? 'true' : 'false');
  });

  wordInput.addEventListener('input', function () {
    if (playing) stop();
    var word = currentWord();
    render(word);
    setHash(word);
  });

  Array.prototype.forEach.call(chips, function (button) {
    button.addEventListener('click', function () {
      wordInput.value = button.getAttribute('data-word') || '';
      play();
    });
  });

  shareButton.addEventListener('click', function () {
    var word = currentWord();
    setHash(word);
    var url = location.href;
    var show = function (label) {
      shareButton.textContent = label;
      clearTimeout(shareTimer);
      shareTimer = setTimeout(function () {
        shareButton.textContent = 'Copy share link';
      }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        show('Copied');
      }).catch(function () {
        show('Link is in the address bar');
      });
      return;
    }
    show('Link is in the address bar');
  });

  window.addEventListener('hashchange', function () {
    var word = readHash().slice(0, 42);
    if (word === wordInput.value) return;
    if (playing) stop();
    wordInput.value = word;
    render(word);
  });

  var initial = readHash().slice(0, 42);
  if (initial) wordInput.value = initial;
  render(currentWord());
})();
