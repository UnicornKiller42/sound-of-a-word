// Turn a word into a melody.
// Letters walk a major pentatonic scale. Vowels last longer and sit
// an octave higher. Capitals are accents. Spaces are rests.
// Length and the sum of the letters pick the key, tempo, and waveform,
// so the same word always sounds the same.

(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.wordToMelody = api.wordToMelody;
    root.describeMelody = api.describeMelody;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SCALE = [0, 2, 4, 7, 9];
  var VOWELS = { a: 1, e: 1, i: 1, o: 1, u: 1, y: 1 };
  var KEYS = [
    { name: 'C', root: 60 },
    { name: 'D', root: 62 },
    { name: 'F', root: 65 },
    { name: 'G', root: 67 },
    { name: 'A', root: 69 }
  ];
  var WAVES = ['sine', 'triangle', 'square'];

  function midiToFrequency(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function isLetterCode(code) {
    return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
  }

  function emptyMelody() {
    return {
      notes: [],
      tempo: 96,
      waveform: 'sine',
      key: 'C',
      root: 60,
      letterCount: 0,
      letterSum: 0
    };
  }

  function wordToMelody(input) {
    var text = typeof input === 'string' ? input : '';
    if (text.length === 0) return emptyMelody();

    var sum = 0;
    var count = 0;
    var i;
    for (i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);
      if (!isLetterCode(code)) continue;
      sum += code >= 97 ? code : code + 32;
      count += 1;
    }

    var key = KEYS[(sum + count) % KEYS.length];
    var waveform = WAVES[count % WAVES.length];
    var tempo = 88 + ((sum + count * 3) % 7) * 8;
    var notes = [];

    for (i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      var charCode = ch.charCodeAt(0);
      if (ch === ' ') {
        notes.push({ char: ' ', rest: true, beats: 0.8 });
        continue;
      }
      if (!isLetterCode(charCode)) {
        notes.push({ char: ch, rest: true, beats: 0.35 });
        continue;
      }

      var upper = charCode >= 65 && charCode <= 90;
      var lower = upper ? charCode + 32 : charCode;
      var index = lower - 97;
      var vowel = VOWELS[String.fromCharCode(lower)] === 1;
      var midi = key.root + SCALE[index % 5] + (Math.floor(index / 5) % 2) * 12;
      if (vowel) midi += 12;
      while (midi > 84) midi -= 12;
      while (midi < 52) midi += 12;

      notes.push({
        char: ch,
        rest: false,
        midi: midi,
        frequency: midiToFrequency(midi),
        beats: vowel ? 1.2 : 0.55,
        accent: upper
      });
    }

    return {
      notes: notes,
      tempo: tempo,
      waveform: waveform,
      key: key.name,
      root: key.root,
      letterCount: count,
      letterSum: sum
    };
  }

  function describeMelody(melody) {
    var notes = melody && melody.notes ? melody.notes : [];
    var voiced = false;
    var i;
    for (i = 0; i < notes.length; i++) {
      if (!notes[i].rest) {
        voiced = true;
        break;
      }
    }
    if (!voiced) {
      return 'Type a word and its letters will pick a key, a tempo, and a little pentatonic tune.';
    }
    return melody.letterCount + ' letters, summing to ' + melody.letterSum +
      ', set the key of ' + melody.key + ', a ' + melody.waveform + ' wave, and ' +
      melody.tempo + ' bpm; each letter steps a pentatonic scale, vowels longer and higher, capitals accented, spaces resting.';
  }

  return {
    wordToMelody: wordToMelody,
    describeMelody: describeMelody
  };
});
