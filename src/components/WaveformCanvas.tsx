import React, { useEffect, useRef } from 'react';

interface WaveformCanvasProps {
  fieldKey?: string;
  metricType?: 'temperature' | 'humidity' | 'other';
  zoneType?: 'cold' | 'hot' | 'ambient' | 'none';
  latestValue?: number | null;
  hasAlert?: boolean;
  isUpdating?: boolean;
  className?: string;
  height?: number;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  fieldKey = 'field1',
  metricType = 'temperature',
  zoneType = 'none',
  latestValue = null,
  hasAlert = false,
  isUpdating = false,
  className = '',
  height = 70,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetParamsRef = useRef({
    amplitude: 14,
    frequency: 0.015,
    speed: 0.025,
    color: '#FC4731',
  });

  const currentParamsRef = useRef({
    amplitude: 14,
    frequency: 0.015,
    speed: 0.025,
    color: '#FC4731',
  });

  // Determine dynamic target params based on data responsiveness & alert state
  useEffect(() => {
    let baseAmp = 14;
    let baseFreq = 0.015;
    let baseSpeed = 0.022;
    let strokeColor = '#FC4731';

    if (zoneType === 'cold') {
      strokeColor = '#0284C7'; // Cool blue
    } else if (zoneType === 'hot') {
      strokeColor = '#FC4731'; // Primary orange
    } else if (metricType === 'humidity') {
      strokeColor = '#0EA5E9'; // Sky cyan
      baseAmp = 10;
      baseFreq = 0.010;
      baseSpeed = 0.015; // Softer, slower modulation for humidity
    } else if (metricType === 'other') {
      strokeColor = '#8B5CF6';
    }

    if (hasAlert) {
      baseAmp = 18;
      baseFreq = 0.028; // Tighter waveform
      baseSpeed = 0.045; // Faster movement
      strokeColor = '#E11D48'; // Alert red/crimson
    } else if (isUpdating) {
      baseAmp = 22; // Energetic burst when new telemetry arrives
      baseSpeed = 0.05;
    }

    targetParamsRef.current = {
      amplitude: baseAmp,
      frequency: baseFreq,
      speed: baseSpeed,
      color: strokeColor,
    };
  }, [fieldKey, metricType, zoneType, latestValue, hasAlert, isUpdating]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = () => {
      const width = (canvas.width = canvas.parentElement?.clientWidth || 300);
      canvas.height = height;

      ctx.clearRect(0, 0, width, height);

      // Smooth lerp (transition) from current params to target params (WAVEFORM 3: FIELD TRANSITION MORPHING)
      const cur = currentParamsRef.current;
      const tgt = targetParamsRef.current;

      cur.amplitude += (tgt.amplitude - cur.amplitude) * 0.08;
      cur.frequency += (tgt.frequency - cur.frequency) * 0.08;
      cur.speed += (tgt.speed - cur.speed) * 0.08;
      cur.color = tgt.color;

      phase += prefersReducedMotion ? 0 : cur.speed;

      const midY = height / 2;

      // Draw secondary background wave fill
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 4) {
        const y = midY + Math.sin(x * cur.frequency * 0.7 + phase * 0.8) * (cur.amplitude * 0.6);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, `${cur.color}15`);
      bgGradient.addColorStop(1, `${cur.color}00`);
      ctx.fillStyle = bgGradient;
      ctx.fill();

      // Draw primary crisp waveform line
      ctx.beginPath();
      for (let x = 0; x <= width; x += 2) {
        const y = midY + Math.sin(x * cur.frequency + phase) * cur.amplitude + Math.cos(x * cur.frequency * 0.5 + phase * 1.3) * (cur.amplitude * 0.3);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.strokeStyle = cur.color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [height]);

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="block w-full" style={{ height: `${height}px` }} />
    </div>
  );
};
