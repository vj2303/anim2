// pages/index.js or app/page.js
'use client'
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation'; // For App Router
// import { useRouter } from 'next/router'; // For Pages Router
import AnimatedSideObjects from '../../components/AnimatedSideObjects';

export default function AnimatedCircles() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [showText, setShowText] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Listen for first scroll
    const handleScroll = () => {
      setHasScrolled(true);
      window.removeEventListener('scroll', handleScroll);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!hasScrolled) return; // Only animate after scroll
    // Animate the SVG paths when component mounts
    const paths = svgRef.current?.querySelectorAll<SVGPathElement>('.intro__logo__path');
    
    if (paths) {
      paths.forEach((path: SVGPathElement, index: number) => {
        // Add staggered animation delay
        path.style.animationDelay = `${index * 0.2}s`;
        path.classList.add('is-animated');
      });

      // Show text after animation completes
      // Calculate total animation time: longest delay + animation duration
      const totalAnimationTime = (paths.length - 1) * 0.2 * 1000 + 2000; // in milliseconds
      setTimeout(() => {
        setShowText(true);
      }, totalAnimationTime);
    }
  }, [hasScrolled]);

  const handleEnterClick = () => {
    // Navigate to main page
    router.push('/');
    
    // Alternative: You can also use window.location for simple navigation
    // window.location.href = '/';
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div className="animated-circles-container">
      <div className="intro__logo">
        <svg 
          ref={svgRef}
          className={`intro__logo__svg is-visible ${isHovered ? 'is-hovered' : ''}`}
          version="1.1" 
          id="Layer_1" 
          xmlns="http://www.w3.org/2000/svg" 
          xmlnsXlink="http://www.w3.org/1999/xlink" 
          x="0px" 
          y="0px" 
          viewBox="0 0 504 198" 
          xmlSpace="preserve"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Animated side objects (left and right) */}
          <AnimatedSideObjects />
          <path 
            className="intro__logo__path" 
            shapeRendering="optimizeQuality" 
            d="M18,99c0,49.7,40.3,90,90,90s90-40.3,90-90c0-29.8,24.2-54,54-54s54,24.2,54,54
              c0,49.7,40.3,90,90,90s90-40.3,90-90"
          />
          <path 
            className="intro__logo__path" 
            shapeRendering="optimizeQuality" 
            d="M486,99c0-49.7-40.3-90-90-90s-90,40.3-90,90c0,29.8-24.2,54-54,54s-54-24.2-54-54l0,0
              c0-49.7-40.3-90-90-90S18,49.3,18,99"
          />
          <path 
            className="intro__logo__path" 
            shapeRendering="optimizeQuality" 
            d="M467.2,99c0-39.8-32.2-72-72-72c-39.8,0-72,32.2-72,72s-32.2,72-72,72s-72-32.2-72-72
              s-32.2-72-72-72c-39.8,0-72,32.2-72,72"
          />
          <path 
            className="intro__logo__path" 
            shapeRendering="optimizeQuality" 
            d="M35.2,99c0,39.8,32.3,72,72,72c39.8,0,72-32.2,72-72c0-39.8,32.3-72,72-72
              c39.7,0,71.9,32.2,72,72c0,39.8,32.2,72,72,72s72-32.2,72-72l0,0"
          />
          <path 
            className="intro__logo__path" 
            shapeRendering="optimizeQuality" 
            d="M449.2,99L449.2,99c0-29.8-24.2-54-54-54s-54,24.2-54,54c0,49.7-40.3,90-90,90
              s-90-40.3-90-90c0-29.8-24.2-54-54-54s-54,24.2-54,54"
          />
          <path 
            className="intro__logo__path" 
            shapeRendering="optimizeQuality" 
            d="M53.2,99L53.2,99c0,29.8,24.2,54,54,54c29.8,0,54-24.2,54-54c0,0,0,0,0,0
              c0-49.7,40.3-90,90-90c49.7,0,89.9,40.3,90,90c0,29.8,24.2,54,54,54s54-24.2,54-54"
          />
          
          {/* Center text that appears before scroll */}
          {!hasScrolled && (
            <text
              x="252"
              y="105"
              textAnchor="middle"
              dominantBaseline="middle"
              className="center-text is-visible pre-scroll-text"
              style={{ cursor: 'default', fill: '#007acc' }}
            >
              Start scroll to explore
            </text>
          )}
          {/* Center text that appears after animation */}
          {hasScrolled && (
            <text 
              x="252" 
              y="105" 
              textAnchor="middle" 
              dominantBaseline="middle"
              className={`center-text ${showText ? 'is-visible' : ''}`}
              onClick={handleEnterClick}
              style={{ cursor: showText ? 'pointer' : 'default' }}
            >
              ENTER
            </text>
          )}
        </svg>
      </div>

      <style jsx>{`
        .animated-circles-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #f8f8f8;
          padding: 2rem;
        }

        .intro__logo {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .intro__logo__svg {
          width: 400px;
          height: auto;
          max-width: 90vw;
        }

        .intro__logo__path {
          fill: none;
          stroke: #333;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          opacity: 0;
          transition: stroke-width 0.3s ease-in-out;
        }

        .intro__logo__path.is-animated {
          animation: drawPath 2s ease-in-out forwards;
        }

        /* Hover effects using class instead of :hover pseudo-class */
        .intro__logo__svg.is-hovered .intro__logo__path {
          stroke-width: 3;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .intro__logo__svg.is-hovered .center-text.is-visible {
          animation: textPulse 1.5s ease-in-out infinite;
        }

        .center-text {
          font-family: 'Arial', sans-serif;
          font-size: 24px;
          font-weight: bold;
          fill: #333;
          opacity: 0;
          transform-origin: center;
          transition: all 0.5s ease-in-out;
          user-select: none; /* Prevent text selection */
        }

        .center-text.is-visible {
          opacity: 1;
          animation: textEntrance 0.8s ease-out forwards;
        }

        .center-text:hover {
          fill: #007acc;
          transform: scale(1.1);
        }

        .center-text:active {
          transform: scale(0.95);
        }

        @keyframes drawPath {
          0% {
            stroke-dashoffset: 1000;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }

        @keyframes textEntrance {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        @keyframes textPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }

        .pre-scroll-text {
          font-size: 22px;
          fill: #007acc;
          opacity: 1;
          animation: preScrollPulse 1.2s ease-in-out infinite;
        }
        @keyframes preScrollPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .intro__logo__svg {
            width: 300px;
          }
          
          .center-text {
            font-size: 20px;
          }
        }

        @media (max-width: 480px) {
          .intro__logo__svg {
            width: 250px;
          }
          
          .center-text {
            font-size: 18px;
          }
          
          .animated-circles-container {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}




