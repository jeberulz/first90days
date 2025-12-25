"use client";
import { useState } from "react";
import { Briefcase, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

export function Hero() {
    const [firstName, setFirstName] = useState("");
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState("idle"); // idle, loading, success, error
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus("loading");
        setErrorMessage("");

        try {
            const response = await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firstName, email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Something went wrong");
            }

            setStatus("success");
            setFirstName("");
            setEmail("");
        } catch (error) {
            console.error(error);
            setStatus("error");
            setErrorMessage(error.message);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-6 text-center animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] text-neutral-300 mb-8 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Now supporting Product & Engineering roles</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-medium text-white tracking-tight leading-[1.1] mb-6">
                Your first 90 days,
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-200 via-neutral-400 to-neutral-600">
                    engineered for impact.
                </span>
            </h1>

            <p className="text-sm md:text-base text-neutral-400 max-w-xl mx-auto leading-relaxed mb-10 font-light">
                Stop guessing expectations. Join the waitlist to generate specific
                30-60-90 day plans instantly using AI. Align with your manager and hit
                the ground running.
            </p>

            {status === "success" ? (
                <div className="flex flex-col items-center justify-center p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-in fade-in zoom-in duration-300">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3" />
                    <h3 className="text-white font-medium text-lg">You're on the list!</h3>
                    <p className="text-neutral-400 text-sm">We'll be in touch soon.</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
                        <div className="relative group w-full sm:w-auto flex-1">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-white/20 to-white/10 rounded-full blur opacity-50 group-hover:opacity-75 transition"></div>
                            <div className="relative flex items-center bg-neutral-900 rounded-full p-1 w-full border border-white/10">
                                <input
                                    type="text"
                                    placeholder="First Name"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                    className="bg-transparent border-none outline-none text-xs text-white placeholder-neutral-600 w-full h-8 px-4 focus:ring-0"
                                />
                            </div>
                        </div>

                        <div className="relative group w-full sm:w-auto flex-[1.5]">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-white/20 to-white/10 rounded-full blur opacity-50 group-hover:opacity-75 transition"></div>
                            <div className="relative flex items-center bg-neutral-900 rounded-full p-1 w-full border border-white/10">
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-transparent border-none outline-none text-xs text-white placeholder-neutral-600 w-full h-8 px-4 focus:ring-0"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={status === "loading"}
                            className="w-full sm:w-auto bg-white text-black h-10 px-6 rounded-full text-xs font-medium hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {status === "loading" ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Joining...
                                </>
                            ) : (
                                <>
                                    Join Waitlist
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </>
                            )}
                        </button>
                    </div>
                    {status === "error" && (
                        <p className="text-red-400 text-[10px] mt-2 bg-red-950/30 px-3 py-1 rounded-full border border-red-900/50">
                            {errorMessage}
                        </p>
                    )}
                </form>
            )}
        </div>
    );
}
