import { useEffect } from 'react';

declare global {
  interface Window {
    gsap?: {
      to: (target: unknown, vars: unknown) => unknown;
      from: (target: unknown, vars: unknown) => unknown;
      fromTo: (target: unknown, fromVars: unknown, toVars: unknown) => unknown;
      set: (target: unknown, vars: unknown) => unknown;
      killTweensOf: (target: unknown) => void;
      timeline: () => unknown;
    };
  }
}

export function useGSAP() {
  useEffect(() => {
    // Load GSAP from CDN if not already loaded
    if (!window.gsap) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
      script.onload = () => {
        console.log('GSAP loaded successfully');
      };
      document.head.appendChild(script);
    }
  }, []);
} 