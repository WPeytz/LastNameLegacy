/**
 * Client-side heuristic to guess which scoring categories
 * the player's answer likely covers. Not a scoring engine —
 * just keyword pattern matching for real-time feedback.
 */

interface CategoryCheck {
  key: string;
  label: string;
  test: (answer: string) => boolean;
}

// Patterns that suggest the player mentioned something in each category.
// Intentionally loose — false positives are fine, this is a hint not a judge.
const CATEGORY_CHECKS: CategoryCheck[] = [
  {
    key: "first_name",
    label: "First Name",
    // Any capitalized word that isn't a common filler word likely is a name attempt
    test: (a) => /\b[A-Z][a-z]{1,}(?:\s[A-Z][a-z]+)*\b/.test(a),
  },
  {
    key: "country",
    label: "Country",
    test: (a) => {
      const words = [
        "country", "nation", "born in", "from",
        // common countries/regions
        "usa", "america", "united states", "england", "britain", "british",
        "france", "french", "germany", "german", "italy", "italian",
        "spain", "spanish", "russia", "russian", "china", "chinese",
        "japan", "japanese", "india", "indian", "brazil", "mexico",
        "poland", "polish", "austria", "austrian", "netherlands", "dutch",
        "greece", "greek", "egypt", "egyptian", "south africa", "turkey",
        "turkish", "portugal", "portuguese", "serbia", "serbian",
        "hungary", "hungarian", "ireland", "irish", "scotland", "scottish",
        "chile", "chilean", "argentina", "venezuelan", "venezuela",
        "mongolia", "mongolian", "cuba", "cuban", "sweden", "swedish",
        "norway", "norwegian", "denmark", "danish",
      ];
      return words.some((w) => a.includes(w));
    },
  },
  {
    key: "profession",
    label: "Profession",
    test: (a) => {
      const words = [
        "physicist", "scientist", "composer", "painter", "artist", "author",
        "writer", "poet", "philosopher", "mathematician", "inventor",
        "engineer", "nurse", "doctor", "explorer", "aviator", "pilot",
        "leader", "president", "emperor", "queen", "king", "pharaoh",
        "politician", "revolutionary", "activist", "musician", "singer",
        "actor", "actress", "director", "filmmaker", "architect",
        "chemist", "biologist", "astronomer", "cosmonaut", "astronaut",
        "dancer", "sculptor", "playwright", "magician", "mystic",
        "suffragette", "abolitionist", "naturalist", "polymath",
        "conductor", "pianist", "violinist",
      ];
      return words.some((w) => a.includes(w));
    },
  },
  {
    key: "creative_works",
    label: "Creative Works",
    test: (a) => {
      const patterns = [
        /wrote\b/, /painted\b/, /composed\b/, /created\b/, /built\b/,
        /designed\b/, /published\b/, /directed\b/, /invented\b/,
        /book\b/, /novel\b/, /play\b/, /symphony\b/, /opera\b/,
        /painting\b/, /sculpture\b/, /film\b/, /movie\b/, /album\b/,
        /theory\b/, /equation\b/, /formula\b/, /law of\b/,
        /"[^"]+"/,  // quoted titles
      ];
      return patterns.some((p) => p.test(a));
    },
  },
  {
    key: "accomplishments",
    label: "Accomplishments",
    test: (a) => {
      const words = [
        "nobel", "prize", "award", "first", "founded", "discovered",
        "pioneered", "revolutionized", "achieved", "won", "established",
        "breakthrough", "famous for", "known for", "recognized",
        "contributed", "developed", "proved", "demonstrated",
      ];
      return words.some((w) => a.includes(w));
    },
  },
  {
    key: "famous_associates",
    label: "Famous Associates",
    test: (a) => {
      const words = [
        "worked with", "collaborated", "student of", "teacher of",
        "mentor", "friend of", "married", "wife", "husband", "partner",
        "rival", "influenced by", "influenced", "contemporary",
        "associate", "colleague",
      ];
      return words.some((w) => a.includes(w));
    },
  },
  {
    key: "era",
    label: "Era / Time Period",
    test: (a) => {
      const patterns = [
        /\b\d{2,4}s?\b/,           // years like 1800, 1900s
        /\bcentury\b/, /\bera\b/,
        /\bmediev/, /\brenaissance\b/, /\bvictorian\b/,
        /\bancient\b/, /\bmodern\b/, /\bclassical\b/,
        /\bbc\b/, /\bad\b/,
        /\bworld war\b/, /\bcold war\b/,
      ];
      return patterns.some((p) => p.test(a));
    },
  },
  {
    key: "extra_facts",
    label: "Extra Facts",
    test: (a) => {
      // If the answer is long enough and covers other stuff, they probably have extras
      return a.length > 200;
    },
  },
];

export function detectCoverage(answer: string): { covered: string[]; missing: string[] } {
  const lower = answer.toLowerCase();
  const covered: string[] = [];
  const missing: string[] = [];

  for (const check of CATEGORY_CHECKS) {
    if (check.test(lower)) {
      covered.push(check.label);
    } else {
      missing.push(check.label);
    }
  }

  return { covered, missing };
}
