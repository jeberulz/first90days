"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { KB_CATEGORIES } from "@/lib/kbCategories";
import { ResponsiveModal } from "@/components/primitives";

const SUPPORTED_UPLOAD_EXTENSIONS = [
  "pdf",
  "txt",
  "md",
  "markdown",
  "html",
  "htm",
];
const ACCEPT_ATTR = ".pdf,.txt,.md,.markdown,.html,.htm,application/pdf,text/plain,text/markdown,text/html";
const UPLOAD_MAX_BYTES = 10 * 1024 * 1024; // keep in sync with convex/lib/kbRetrievalConfig.js

export default function AddKnowledgeModal({ open, onClose, defaultCategory }) {
  const createDocument = useMutation(api.kb.createDocument);
  const createUploadedDocument = useMutation(api.kb.createUploadedDocument);
  const generateUploadUrl = useMutation(api.kb.generateUploadUrl);

  const [mode, setMode] = useState("paste");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(defaultCategory || "goals_notes");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function reset() {
    setTitle("");
    setContent("");
    setFile(null);
    setError(null);
    setMode("paste");
  }

  async function handlePasteSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await createDocument({
        title: title.trim(),
        content,
        category,
        sourceType: "manual",
      });
      reset();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err?.message ?? "Something went wrong saving this note.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUploadSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    if (file.size > UPLOAD_MAX_BYTES) {
      setError("That file is larger than 10 MB.");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !SUPPORTED_UPLOAD_EXTENSIONS.includes(ext)) {
      setError(
        `Unsupported file type. Try: ${SUPPORTED_UPLOAD_EXTENSIONS.join(", ")}`
      );
      return;
    }

    setSubmitting(true);
    try {
      // 1. Ask the server for an upload URL.
      const uploadUrl = await generateUploadUrl({});
      // 2. POST the file bytes directly to Convex storage.
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) {
        throw new Error(`Upload failed (${response.status})`);
      }
      const { storageId } = await response.json();
      // 3. Register the document. The background pipeline takes over from
      //    here and populates content once extraction completes.
      await createUploadedDocument({
        title: (title.trim() || file.name),
        storageId,
        mimeType: file.type || undefined,
        category,
      });
      reset();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err?.message ?? "Upload failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const isUpload = mode === "upload";
  const handleSubmit = isUpload ? handleUploadSubmit : handlePasteSubmit;

  return (
    <ResponsiveModal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add to Knowledge Base"
      size="2xl"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="px-4 py-2 font-space-grotesk text-sm text-warm-300 hover:bg-warm-surfaceDark rounded-lg transition min-h-11"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-knowledge-form"
            disabled={submitting}
            className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg px-4 py-2 font-space-grotesk text-sm font-medium transition flex items-center gap-2 min-h-11"
          >
            {submitting ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {isUpload ? "Uploading…" : "Saving…"}
              </>
            ) : isUpload ? (
              "Upload & enrich"
            ) : (
              "Save & enrich"
            )}
          </button>
        </div>
      }
    >
      <form id="add-knowledge-form" onSubmit={handleSubmit} className="space-y-4">
        <div
          role="tablist"
          aria-label="Add knowledge mode"
          className="inline-flex rounded-lg border border-warm-borderMuted p-0.5 bg-warm-surfaceDark"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!isUpload}
            onClick={() => {
              setMode("paste");
              setError(null);
            }}
            className={`px-3 py-1.5 text-xs font-space-grotesk rounded-md transition ${
              !isUpload
                ? "bg-warm-surface text-warm-line"
                : "text-warm-300 hover:text-warm-line"
            }`}
          >
            Paste text
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isUpload}
            onClick={() => {
              setMode("upload");
              setError(null);
            }}
            className={`px-3 py-1.5 text-xs font-space-grotesk rounded-md transition ${
              isUpload
                ? "bg-warm-surface text-warm-line"
                : "text-warm-300 hover:text-warm-line"
            }`}
          >
            Upload file
          </button>
        </div>

        <p className="text-xs text-warm-300">
          Embedding + AI enrichment runs in the background. The brain learns from this entry within ~30 seconds.
        </p>

        <div className="space-y-1.5">
          <label htmlFor="kb-title" className="font-space-grotesk text-xs font-medium text-warm-300">
            Title {isUpload && <span className="text-warm-500">(optional — defaults to filename)</span>}
          </label>
          <input
            id="kb-title"
            data-autofocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-warm-surfaceDark border border-warm-borderMuted rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-warm-line placeholder:text-warm-500 focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder={
              isUpload
                ? "e.g. Engineering onboarding wiki (export)"
                : "e.g. Marcus — communication preferences"
            }
            required={!isUpload}
          />
        </div>

        {isUpload ? (
          <div className="space-y-1.5">
            <label htmlFor="kb-file" className="font-space-grotesk text-xs font-medium text-warm-300">
              File
            </label>
            <input
              id="kb-file"
              type="file"
              accept={ACCEPT_ATTR}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError(null);
              }}
              className="block w-full text-sm text-warm-line file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-warm-surface file:text-warm-line file:text-xs file:font-space-grotesk hover:file:bg-warm-surfaceDark"
            />
            <p className="text-xs text-warm-300">
              Supported: PDF, TXT, Markdown, HTML. Max 10 MB. Scanned/image-only PDFs won&apos;t extract.
            </p>
            {file && (
              <p className="text-xs text-warm-400">
                Selected: <span className="text-warm-line">{file.name}</span> ({Math.ceil(file.size / 1024)} KB)
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="kb-content" className="font-space-grotesk text-xs font-medium text-warm-300">
              Content
            </label>
            <textarea
              id="kb-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-warm-surfaceDark border border-warm-borderMuted rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-warm-line placeholder:text-warm-500 resize-y focus:outline-none focus:ring-1 focus:ring-accent min-h-[160px]"
              rows={8}
              placeholder="Paste a doc, write notes, or describe context the AI brain should know about."
              required
            />
            <p className="text-xs text-warm-300">
              Tip: Entries shorter than 200 characters skip enrichment. Aim for at least a paragraph for the best AI memory extraction.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="kb-category" className="font-space-grotesk text-xs font-medium text-warm-300">
            Category
          </label>
          <select
            id="kb-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-warm-surfaceDark border border-warm-borderMuted rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-warm-line focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {KB_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}
      </form>
    </ResponsiveModal>
  );
}
