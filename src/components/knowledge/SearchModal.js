"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAction } from "convex/react";
import { Icon } from "@iconify/react";
import { api } from "../../../convex/_generated/api";
import { KB_CATEGORY_BY_SLUG } from "@/lib/kbCategories";

/**
 * Cmd+K semantic search modal. Mounted only on /knowledge* routes — see
 * KnowledgeBasePage which mounts it conditionally.
 *
 * Calls api.kb.semanticSearch (an action that wraps lib/kbContext.js).
 */
export default function SearchModal({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const search = useAction(api.kb.semanticSearch);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (!query.trim()) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await search({ query, limit: 10 });
        setResults(res?.matches || []);
      } catch (e) {
        console.error("[searchModal]", e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, search]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1C1917] border border-[#2C2825] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2C2825]">
          <Icon icon="solar:magnifer-linear" width={20} className="text-[#A8A29E]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your knowledge base — semantic search powered by AI"
            className="flex-1 bg-transparent border-none focus:outline-none text-white placeholder:text-[#57534E] text-sm"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-[#D97757] border-t-transparent rounded-full animate-spin" />
          )}
          <kbd className="text-[10px] bg-[#2C2825] text-[#A8A29E] px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {!query && (
            <div className="px-6 py-12 text-center text-sm text-[#A8A29E]">
              Type to search across every doc and memory in your KB.
            </div>
          )}
          {query && results.length === 0 && !loading && (
            <div className="px-6 py-12 text-center text-sm text-[#A8A29E]">
              No matches.
            </div>
          )}
          {results.length > 0 && (
            <div className="divide-y divide-[#2C2825]">
              {results.map((r) => {
                const cat = r.category ? KB_CATEGORY_BY_SLUG[r.category] : null;
                return (
                  <Link
                    key={r.documentId || r.title}
                    href={r.documentId ? `/knowledge/${r.documentId}` : "#"}
                    onClick={onClose}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-[#2C2825]/40 transition"
                  >
                    <div className="w-8 h-8 rounded-md bg-[#2C2825] flex items-center justify-center text-[#A8A29E] shrink-0">
                      <Icon icon={cat?.icon || "solar:file-text-linear"} width={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">
                          {r.title}
                        </p>
                        {r.score !== null && r.score !== undefined && (
                          <span className="text-[10px] text-[#57534E]">
                            {Math.round(r.score * 100)}%
                          </span>
                        )}
                      </div>
                      {r.headingPath && r.headingPath.length > 0 && (
                        <p className="text-[10px] text-[#57534E] mt-0.5 truncate">
                          {r.headingPath.join(" › ")}
                        </p>
                      )}
                      {r.summary || r.snippet ? (
                        <p className="text-xs text-[#A8A29E] line-clamp-2 mt-0.5">
                          {r.summary || r.snippet}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
