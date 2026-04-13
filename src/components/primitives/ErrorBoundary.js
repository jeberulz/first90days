"use client";

import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (typeof this.props.fallback === "function") {
      return this.props.fallback(error, this.reset);
    }
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="rounded-xl border border-warm-borderDark bg-warm-cardDark p-6 space-y-3">
        <p className="font-instrument-serif text-xl text-warm-line">
          Something went wrong loading this section
        </p>
        <p className="font-space-grotesk text-sm text-warm-300">
          {error?.message || "An unexpected error occurred."}
        </p>
        <button
          type="button"
          onClick={this.reset}
          className="font-space-grotesk text-sm text-accent hover:text-accent-hover transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }
}
