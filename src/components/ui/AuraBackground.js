'use client';

import { useEffect } from 'react';

export function AuraBackground() {
    useEffect(() => {
        // Only run on client
        if (typeof window === 'undefined') return;

        if (!window.UnicornStudio) {
            window.UnicornStudio = { isInitialized: false };
        }

        // specific check to prevent double loading if already present
        const existingScript = document.querySelector('script[src*="unicornStudio.umd.js"]');

        if (!existingScript) {
            const i = document.createElement("script");
            i.src = "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js";
            i.onload = function () {
                if (!window.UnicornStudio.isInitialized) {
                    // The library exposes 'UnicornStudio' on window when loaded
                    if (window.UnicornStudio && window.UnicornStudio.init) {
                        window.UnicornStudio.init();
                    } else if (typeof UnicornStudio !== 'undefined') {
                        // Fallback if it's GLOBAL
                        UnicornStudio.init();
                    }
                    window.UnicornStudio.isInitialized = true;
                }
            };
            (document.head || document.body).appendChild(i);
        } else {
            // If script exists, just try to init if not initialized
            if (!window.UnicornStudio.isInitialized) {
                if (window.UnicornStudio && window.UnicornStudio.init) {
                    window.UnicornStudio.init();
                    window.UnicornStudio.isInitialized = true;
                }
            }
        }
    }, []);

    return (
        <div
            className="aura-background-component top-0 w-full h-screen -z-10 absolute pointer-events-none"
            data-alpha-mask="80"
            style={{
                maskImage: 'linear-gradient(to bottom, transparent, black 0%, black 80%, transparent)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 0%, black 80%, transparent)'
            }}
        >
            <div className="aura-background-component top-0 w-full -z-10 absolute h-full">
                <div data-us-project="EET25BiXxR2StNXZvAzF" className="absolute w-full h-full left-0 top-0 -z-10"></div>
            </div>
        </div>
    );
}
