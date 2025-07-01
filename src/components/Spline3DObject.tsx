'use client';
import Spline from '@splinetool/react-spline';

interface Spline3DObjectProps {
  scene: string;
  style?: React.CSSProperties;
  className?: string;
}

export default function Spline3DObject({ scene, style, className }: Spline3DObjectProps) {
  // If you need to fetch data, use useEffect and useState here
  return (
    <div style={style} className={className}>
      <Spline scene={scene} />
    </div>
  );
}