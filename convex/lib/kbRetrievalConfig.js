/**
 * Single source of truth for KB retrieval / pipeline tuning knobs.
 *
 * Every threshold, weight, cap, and limit that governs how the brain behaves
 * lives here. Until this file existed, these values were scattered across
 * kbContext.js, kbPipeline.js, and kbPrompts.js — making any retrieval
 * improvement a cross-file hunt.
 *
 * Rule of thumb: if you find yourself adding a magic number to a KB file,
 * add it here first and import it there.
 *
 * Values suffixed with "_DEFAULT" are meant to become user-overridable via
 * settings.kb.* once the UI exists. The Priority 5 work (memory feedback)
 * will start reading these from per-user settings.
 */

// ---------------------------------------------------------------------------
// Retrieval (rag.search)
// ---------------------------------------------------------------------------

/** Vector similarity floor for plan-generation / AI context fetches. */
export const CONTEXT_SIMILARITY_THRESHOLD_DEFAULT = 0.3;

/** Vector similarity floor for the Cmd+K user-facing search. Looser. */
export const SEARCH_SIMILARITY_THRESHOLD_DEFAULT = 0.2;

/** Default top-K for context fetches. */
export const CONTEXT_TOP_K_DEFAULT = 12;

/**
 * Over-fetch multiplier for re-ranking.
 * We fetch `CONTEXT_TOP_K * OVERFETCH_MULTIPLIER` hits from RAG, then re-rank
 * (Priority 2 work) and trim back to TOP_K. Gives re-ranking headroom.
 */
export const CONTEXT_OVERFETCH_MULTIPLIER = 2;

/** Max memories injected into a single plan/suggestion prompt. */
export const CONTEXT_MAX_MEMORIES_DEFAULT = 8;

// ---------------------------------------------------------------------------
// Re-ranking (Priority 2)
// ---------------------------------------------------------------------------

/**
 * Weight applied to (importance / 100) when re-ranking citations.
 * Final score = (1 - w) * similarity + w * normalizedImportance + recencyBonus
 * 0 = off (pure similarity). Keep <= 0.3 to avoid stagnation.
 */
export const RERANK_IMPORTANCE_WEIGHT = 0.25;

/** Additive weight on recency decay. */
export const RERANK_RECENCY_WEIGHT = 0.05;

/** Half-life for recency bonus (days). */
export const RERANK_RECENCY_HALFLIFE_DAYS = 30;

// ---------------------------------------------------------------------------
// Chunking (Priority 1)
// ---------------------------------------------------------------------------

/** Target chunk size in characters (~800 tokens @ 4 chars/token). */
export const CHUNK_TARGET_CHARS = 3200;

/** Overlap between adjacent chunks to preserve cross-boundary context. */
export const CHUNK_OVERLAP_CHARS = 600;

/** Docs below this size are indexed as a single chunk (current behavior). */
export const CHUNK_SINGLE_CHUNK_CEILING = 1200;

/**
 * Maximum chunks surfaced from any single document in a prompt context block.
 * Retrieval over-fetches and then groups results by document, keeping at most
 * this many top-scoring chunks per doc. Prevents a single long doc from
 * crowding the context window. Tune: raise if retrieval feels too narrow,
 * lower if prompts get dominated by one source.
 */
export const CHUNK_MAX_PER_DOC_IN_CONTEXT = 2;

// ---------------------------------------------------------------------------
// Enrichment
// ---------------------------------------------------------------------------

/** Max input content sent to the enrichment LLM. */
export const ENRICHMENT_CONTENT_CAP_CHARS = 12000;

/** Minimum content length to trigger enrichment (shorter is noise). */
export const ENRICHMENT_MIN_CONTENT_CHARS = 200;

/** Max memory candidates accepted from a single enrichment response. */
export const MAX_MEMORY_CANDIDATES_PER_DOC = 8;

/** Minimum confidence to accept an LLM-predicted category assignment. */
export const AUTO_CATEGORIZE_CONFIDENCE_FLOOR = 0.7;

// ---------------------------------------------------------------------------
// Memory consolidation / feedback (Priority 5)
// ---------------------------------------------------------------------------

/** Cosine similarity threshold for "this memory already exists" checks. */
export const MEMORY_SEMANTIC_DEDUP_THRESHOLD = 0.85;

/** Confidence bump applied when a memory is used in a prompt. */
export const MEMORY_IMPLICIT_BOOST = 0.02;

/** Confidence bump applied when a user clicks "confirm" on a memory. */
export const MEMORY_EXPLICIT_BOOST = 0.2;

/** Weekly decay multiplier for memories unused in the past 30 days. */
export const MEMORY_WEEKLY_DECAY = 0.95;

// ---------------------------------------------------------------------------
// File extraction (Priority 3)
// ---------------------------------------------------------------------------

/** Max upload size in bytes. Rejected at the upload mutation boundary. */
export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** Warn users when uploads exceed this size (extraction latency climbs). */
export const UPLOAD_WARN_BYTES = 2 * 1024 * 1024; // 2 MB

/** Extracted text is capped to this length. Longer docs are truncated. */
export const EXTRACTED_TEXT_MAX_CHARS = 2_000_000; // ~500k tokens

/**
 * Supported upload mime types. Anything outside this set is rejected at
 * the upload boundary. Add new formats here first, then wire up the
 * extractor in convex/lib/extractors/index.js.
 */
export const SUPPORTED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "text/html",
  "application/xhtml+xml",
];

/** Supported file extensions (used as a fallback when mimeType is missing). */
export const SUPPORTED_UPLOAD_EXTENSIONS = [
  "pdf",
  "txt",
  "md",
  "markdown",
  "html",
  "htm",
];
