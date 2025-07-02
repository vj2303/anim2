import React from 'react';

/**
 * AnimatedSideObjects renders animated SVG shapes to the left and right of a central path.
 * The objects float and rotate, and are visually separated from the path.
 * You can adjust the positions or add more shapes as needed.
 */
const AnimatedSideObjects: React.FC = () => {
  return (
    <g>
      {/* Left Side Object (Circle) */}
      <g className="side-object left-object">
        <circle cx="60" cy="99" r="18" />
        {/* You can add more shapes here for variety */}
      </g>
      {/* Right Side Object (Polygon) */}
      <g className="side-object right-object">
        <polygon points="444,99 462,81 480,99 462,117" />
        {/* You can add more shapes here for variety */}
      </g>
      <style>{`
        .side-object circle,
        .side-object polygon {
          fill: #4ade80;
          opacity: 0.8;
          transform-origin: center;
          animation: floatY 2.5s ease-in-out infinite alternate, rotateZ 6s linear infinite;
        }
        .left-object circle {
          fill: #3b82f6;
        }
        .right-object polygon {
          fill: #f59e0b;
        }
        @keyframes floatY {
          0% { transform: translateY(0); }
          100% { transform: translateY(-18px); }
        }
        @keyframes rotateZ {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </g>
  );
};

export default AnimatedSideObjects; 