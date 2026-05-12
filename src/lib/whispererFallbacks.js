/**
 * Hand-authored fallback tips for when the AI provider is unavailable.
 * Keyed by task category. Each tip is evergreen — 1-2 sentences of
 * concrete coaching advice that holds without any context from the
 * user's task. Categories match the values used in `activities.category`.
 */
export const WHISPERER_FALLBACK_TIPS = {
  learning: [
    "Block 20 minutes. Read with one question in mind — write the answer down before moving on.",
    "Skim the table of contents first; pick the two sections that will give you the strongest signal, and skip the rest.",
    "When you're done, summarise it in 3 bullet points you could explain at a coffee meeting. If you can't, you didn't learn it yet.",
  ],
  shipping: [
    "Define the smallest version that proves the point. Ship that. Iterate from real feedback, not from imagined objections.",
    "Write the announcement first — if the announcement is hard to write, the scope is too big or the value is too thin.",
    "Identify the one decision-blocker. If it's a missing approval, ask now. If it's a missing detail, write down what you'd assume and proceed.",
  ],
  relationships: [
    "Start the meeting by stating one specific thing you've noticed about their work. Curiosity beats pleasantries.",
    "Ask: 'What's the one thing I could do to make your life easier in the next two weeks?' — then actually do it.",
    "Don't pitch yourself. Ask about their goals first; align yours to theirs in the second meeting.",
  ],
  influence: [
    "Identify who has the cheapest 'yes' that unlocks the rest. Start there.",
    "Bring data, not opinion. One chart that lands beats five paragraphs that don't.",
    "Show you've heard the dissent before you make the case. 'Here's why X is reasonable, and here's why I'd still go with Y' wins more rooms.",
  ],
  default: [
    "Write down the one specific outcome you want from this task before you start. Done > perfect.",
    "If you're stuck, narrow the scope: what's the smallest piece you could finish in the next 30 minutes?",
  ],
};

/**
 * Pick a deterministic-feeling tip for a given category. Cycles through
 * the array using the supplied seed (defaults to the current minute) so
 * the user doesn't see the same tip back-to-back.
 */
export function pickFallbackTip(category, seed = Date.now()) {
  const key = category && WHISPERER_FALLBACK_TIPS[category] ? category : "default";
  const pool = WHISPERER_FALLBACK_TIPS[key];
  const idx = Math.abs(Math.floor(seed / 60000)) % pool.length;
  return { tip: pool[idx], category: key };
}
