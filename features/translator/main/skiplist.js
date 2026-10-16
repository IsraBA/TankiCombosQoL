// features/translator/main/skiplist.js  [MAIN world]

// Messages made up ENTIRELY of universal slang are shown verbatim.
// Matching tolerates elongation and plurals; every word must match.

(function () {
  const NS = (window.__CT = window.__CT || {});

  const SKIP_SEED = [
    // greetings / partings
    'hi', 'hii', 'hello', 'helo', 'hey', 'heya', 'ayo', 'yo', 'yoo', 'sup',
    'wsup', 'wassup', 'wazzup', 'bye', 'byee', 'cya', 'cu', 'gtg', 'g2g', 'brb',
    'afk', 'wb', 'gn', 'gm',
    // match courtesy
    'gg', 'ggs', 'ggwp', 'wp', 'glhf', 'gl', 'hf', 'gh', 'gj', 'gz', 'gratz',
    'grats', 'congrats', 'cg',
    // laughter / reactions (see also LAUGH_RE)
    'lol', 'lel', 'lul', 'lulw', 'kek', 'kekw', 'xd', 'xdd', 'xddd', 'lmao', 'lmfao', 'rofl',
    'haha', 'hehe', 'hah', 'ha', 'pog', 'poggers', 'omegalul', 'sadge', 'based',
    'cringe', 'sus', 'cope', 'copium',
    // exclamations
    'omg', 'omfg', 'wtf', 'wth', 'ffs', 'smh', 'rip', 'oof', 'damn', 'bruh',
    'bro', 'man',
    // thanks / politeness
    'ty', 'tyvm', 'tysm', 'thx', 'thanks', 'thank', 'np', 'yw', 'plz', 'pls',
    'please', 'sry', 'sorry', 'mb',
    // acknowledgements
    'ok', 'okay', 'kk', 'k', 'kay', 'yes', 'ye', 'yea', 'yeah', 'yep', 'yup',
    'ya', 'yah', 'no', 'nah', 'nope', 'nop', 'idk', 'idc', 'ikr', 'imo', 'tbh',
    'btw', 'nvm', 'wdym',
    // skill / trash-talk (non-toxic)
    'ez', 'ezpz', 'izi', 'easy', 'noob', 'nub', 'newb', 'newbie', 'bot', 'pro',
    'smurf', 'tryhard', 'camper', 'camp', 'rusher', 'hacker', 'hax', 'cheater',
    'cheat', 'aimbot', 'rekt', 'owned', 'clap', 'ezclap', 'ratio', 'nice', 'nc',
    'cool', 'ns', 'wd',
    // battle callouts
    'rush', 'push', 'back', 'def', 'defend', 'help', 'heal', 'mid', 'base',
    'spawn', 'cap', 'od', 'mid', 'midd'
  ];

  function squeeze(s) { return s.replace(/(.)\1+/gu, '$1'); }
  // alternating-letter laughter / fillers that squeeze() can't fold
  const LAUGH_RE = /^(?:a*h+[aeiou]+h*|(?:ah|eh|ja|je|xa|xe|ha|he){2,}|x+d+|l+o+l+|l+u+l+)$/i;

  const SKIP = new Set();
  for (const w of SKIP_SEED) { SKIP.add(w); SKIP.add(squeeze(w)); }

  function isSkipWord(w) {
    w = w.toLowerCase();
    if (SKIP.has(w) || SKIP.has(squeeze(w)) || LAUGH_RE.test(w)) return true;
    // plural tolerance: "noobs"->"noob", "pros"->"pro", "campers"->"camper".
    const stem = w.replace(/[sz]$/, '');
    return stem !== w && (SKIP.has(stem) || SKIP.has(squeeze(stem)));
  }

  // True when every letter-run in the text is a skip word. Text with no letters
  // never reaches here (chat.js gates on hasLetter first).
  function shouldSkip(text) {
    const words = text && text.match(/\p{L}+/gu);
    if (!words) return false;
    return words.every(isSkipWord);
  }

  NS.skip = { shouldSkip, words: SKIP };

  // Debug / runtime surfaces (kept identical to the research userscript).
  window.__CT_SKIP_WORDS = SKIP;
  window.__CT_NOTR = shouldSkip;
})();
