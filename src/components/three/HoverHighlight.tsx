import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { axialToWorld, HEX_3D_SIZE } from '../../utils/hexTo3D';

interface Props {
  q: number;
  r: number;
  color?: string;
}

/** Outlined hex ring drawn just above ground level to mark the hovered tile. */
export function HoverHighlight({ q, r, color = '#c8a35e' }: Props) {
  const points = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    const radius = HEX_3D_SIZE * 1.02;
    for (let i = 0; i <= 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 90);
      pts.push([radius * Math.cos(angle), 0, radius * Math.sin(angle)]);
    }
    return pts;
  }, []);

  const { x, z } = axialToWorld(q, r, HEX_3D_SIZE);

  return (
    <Line
      points={points}
      position={[x, 0.06, z]}
      color={color}
      lineWidth={2}
      transparent
      opacity={0.95}
      depthTest={false}
    />
  );
}
