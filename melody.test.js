var melody = require('./melody.js');
var wordToMelody = melody.wordToMelody;

var failures = 0;

function assert(condition, message) {
  if (!condition) {
    failures += 1;
    console.error('FAIL ' + message);
  } else {
    console.log('ok ' + message);
  }
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

var banana = wordToMelody('banana');
assert(same(banana, wordToMelody('banana')), 'the same word always makes the same melody');
assert(banana.notes.length === 6, 'banana has one note per letter');
assert(banana.notes.every(function (note) { return note.rest === false; }), 'banana has no rests');

assert(!same(banana, wordToMelody('Mississippi')), 'banana and Mississippi sound different');
assert(!same(wordToMelody('hello'), wordToMelody('world')), 'hello and world sound different');
assert(!same(wordToMelody('eat'), wordToMelody('tea')), 'anagrams keep their order, so they differ');
assert(!same(wordToMelody('hello world'), wordToMelody('helloworld')), 'a space changes the melody');

var phrase = wordToMelody('hello world');
assert(phrase.notes.length === 11, 'hello world keeps every character');
assert(phrase.notes[5].char === ' ' && phrase.notes[5].rest === true, 'the space is a rest');
assert(phrase.notes[4].rest === false && phrase.notes[6].rest === false, 'letters around the space still play');
assert(wordToMelody('a b').notes[1].rest === true, 'a lone space is a rest');

var ab = wordToMelody('ab').notes;
assert(ab[0].beats > ab[1].beats, 'a vowel lasts longer than a consonant');
assert(ab[0].midi > ab[1].midi, 'a vowel sits higher than a consonant beside it');
assert(wordToMelody('A').notes[0].accent === true, 'a capital is accented');
assert(wordToMelody('a').notes[0].accent === false, 'a lowercase letter is not accented');
assert(wordToMelody('A').notes[0].midi === wordToMelody('a').notes[0].midi, 'case changes the accent, not the pitch');

var empty = wordToMelody('');
assert(Array.isArray(empty.notes) && empty.notes.length === 0, 'an empty string makes no notes');
assert(empty.tempo > 0 && empty.waveform && empty.key, 'an empty string still returns a safe melody');
assert(wordToMelody().notes.length === 0, 'a missing argument is handled');
assert(wordToMelody(null).notes.length === 0, 'null is handled');
assert(wordToMelody(undefined).notes.length === 0, 'undefined is handled');

var first = wordToMelody('hi');
first.notes[0].midi = 1;
first.tempo = 1;
assert(wordToMelody('hi').notes[0].midi !== 1, 'each call returns a fresh melody');
assert(typeof melody.describeMelody(wordToMelody('cat')) === 'string', 'a word can be described in one line');
assert(melody.describeMelody(empty).length > 0, 'empty input has an explanation too');

var samples = ['a', 'b', 'aa', 'ab', 'banana', 'Mississippi', 'hello world', 'Hello'];
var i;
var j;
for (i = 0; i < samples.length; i++) {
  for (j = i + 1; j < samples.length; j++) {
    assert(
      !same(wordToMelody(samples[i]), wordToMelody(samples[j])),
      samples[i] + ' and ' + samples[j] + ' differ'
    );
  }
}

if (failures) {
  console.error(failures + ' failed');
  process.exit(1);
}

console.log('all passed');
