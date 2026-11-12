'use client';

import { useEffect, useRef } from 'react';
import type { AccountMode } from '@/types/account';
import './account-access.css';

export type AccountVisualState = AccountMode | 'signed' | 'loading';

/*
 * Decorative fabrication scene for Account Access.
 * A lathe-profile form is drawn twice: once as a rotating point-cloud wireframe
 * (the idea) and once as a solid body with visible layer lines (the physical part).
 * A scan plane rises through the form and reveals the solid body layer by layer.
 * Geometry is computed once at module load so server and client markup match.
 */

const VIEW_W = 600;
const VIEW_H = 640;
const CX = 300;
const BASE_Y = 505;
const LAYERS = 30;
const PITCH = 11.5;
const TILT = 0.28;
const MERIDIANS = 18;

const f = (value: number) => value.toFixed(2);
const smooth = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

function profile(t: number) {
  const belly = 54 * Math.sin(Math.PI * Math.min(t / 0.72, 1));
  const neck = 34 * smooth(0.58, 0.86, t);
  const lip = 16 * smooth(0.88, 1, t);
  return 98 + belly - neck + lip;
}

type Layer = { y: number; r: number; ry: number };

const layers: Layer[] = Array.from({ length: LAYERS }, (_, index) => {
  const t = index / (LAYERS - 1);
  const r = profile(t);
  return { y: BASE_Y - index * PITCH, r, ry: r * TILT };
});

const top = layers[layers.length - 1];
const base = layers[0];

const frontArc = ({ y, r, ry }: Layer) => `M${f(CX - r)} ${f(y)}A${f(r)} ${f(ry)} 0 0 0 ${f(CX + r)} ${f(y)}`;
const backArc = ({ y, r, ry }: Layer) => `M${f(CX - r)} ${f(y)}A${f(r)} ${f(ry)} 0 0 1 ${f(CX + r)} ${f(y)}`;

const silhouette = [
  `M${f(CX - base.r)} ${f(base.y)}`,
  ...layers.slice(1).map((layer) => `L${f(CX - layer.r)} ${f(layer.y)}`),
  `A${f(top.r)} ${f(top.ry)} 0 0 1 ${f(CX + top.r)} ${f(top.y)}`,
  ...layers.slice(0, -1).reverse().map((layer) => `L${f(CX + layer.r)} ${f(layer.y)}`),
  `A${f(base.r)} ${f(base.ry)} 0 0 1 ${f(CX - base.r)} ${f(base.y)}`,
  'Z',
].join('');

const meridians = Array.from({ length: MERIDIANS }, (_, k) => {
  const theta = (k / MERIDIANS) * Math.PI * 2 + 0.17;
  const front = Math.sin(theta) > 0;
  const d = layers.map((layer, index) => `${index === 0 ? 'M' : 'L'}${f(CX + layer.r * Math.cos(theta))} ${f(layer.y + layer.ry * Math.sin(theta))}`).join('');
  return { d, front };
});

const PLATE_Y = BASE_Y + 18;
const plateTicks = Array.from({ length: 48 }, (_, k) => {
  const a = (k / 48) * Math.PI * 2;
  const long = k % 6 === 0;
  const r1 = 214;
  const r2 = long ? 232 : 222;
  return { d: `M${f(CX + r1 * Math.cos(a))} ${f(PLATE_Y + r1 * 0.27 * Math.sin(a))}L${f(CX + r2 * Math.cos(a))} ${f(PLATE_Y + r2 * 0.27 * Math.sin(a))}`, long, front: Math.sin(a) > 0 };
});

export function AccountVisual({ state = 'signin' }: { state?: AccountVisualState }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof window.matchMedia !== 'function') return undefined;
    const host = node.parentElement ?? node;
    const finePointer = window.matchMedia('(pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!finePointer.matches || reducedMotion.matches) return undefined;

    let frame = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      frame = 0;
      node.style.setProperty('--ea-px', x.toFixed(3));
      node.style.setProperty('--ea-py', y.toFixed(3));
    };
    const queue = () => { if (!frame) frame = window.requestAnimationFrame(apply); };
    const onMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
      y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
      queue();
    };
    const onLeave = () => { x = 0; y = 0; queue(); };

    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerleave', onLeave);
    return () => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={ref} className="ea-visual" data-state={state}>
    <div className="ea-art" aria-hidden="true">
      <div className="ea-light" />
      <div className="ea-depth ea-depth-floor"><div className="ea-floor" /></div>
      <div className="ea-ruler ea-ruler-y" />
      <div className="ea-ruler ea-ruler-x" />
      <span className="ea-crop ea-crop-tl" /><span className="ea-crop ea-crop-bl" />

      <div className="ea-field">
        <div className="ea-depth ea-depth-back">
          <svg className="ea-svg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} focusable="false">
            <defs>
              <radialGradient id="ea-plate-shadow">
                <stop offset="0" stopColor="#000" stopOpacity=".7" />
                <stop offset="1" stopColor="#000" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="ea-plate-glow">
                <stop offset="0" stopColor="#e85823" stopOpacity=".16" />
                <stop offset="1" stopColor="#e85823" stopOpacity="0" />
              </radialGradient>
            </defs>
            <g className="ea-plate">
              <ellipse cx={CX} cy={PLATE_Y} rx={250} ry={78} fill="url(#ea-plate-glow)" />
              <ellipse cx={CX} cy={PLATE_Y + 6} rx={170} ry={40} fill="url(#ea-plate-shadow)" />
              <ellipse cx={CX} cy={PLATE_Y} rx={205} ry={55} className="ea-plate-ring" />
              <ellipse cx={CX} cy={PLATE_Y} rx={160} ry={43} className="ea-plate-ring is-faint" />
              <ellipse cx={CX} cy={PLATE_Y} rx={112} ry={30} className="ea-plate-ring is-faint" />
              {plateTicks.map((tick, index) => <path key={index} d={tick.d} className={`ea-plate-tick${tick.long ? ' is-long' : ''}${tick.front ? '' : ' is-back'}`} />)}
            </g>
            <g className="ea-orbit ea-orbit-a">
              <ellipse cx={CX} cy={330} rx={262} ry={74} transform={`rotate(-9 ${CX} 330)`} className="ea-orbit-path" />
              <ellipse cx={CX} cy={330} rx={262} ry={74} transform={`rotate(-9 ${CX} 330)`} pathLength={100} className="ea-orbit-comet" />
            </g>
            <g className="ea-orbit ea-orbit-b">
              <ellipse cx={CX} cy={362} rx={292} ry={102} transform={`rotate(7 ${CX} 362)`} className="ea-orbit-path is-dashed" />
              <ellipse cx={CX} cy={362} rx={292} ry={102} transform={`rotate(7 ${CX} 362)`} pathLength={100} className="ea-orbit-comet is-light" />
            </g>
          </svg>
        </div>

        <div className="ea-depth ea-depth-object">
          <div className="ea-object">
            <svg className="ea-svg ea-wire" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} focusable="false">
              {meridians.map((line, index) => <path key={index} d={line.d} className={`ea-meridian${line.front ? '' : ' is-back'}`} />)}
              {layers.map((layer, index) => <ellipse key={index} cx={CX} cy={f(layer.y)} rx={f(layer.r)} ry={f(layer.ry)} pathLength={120} className="ea-cloud" style={{ animationDelay: `${-(index % 6) * 0.35}s` }} />)}
            </svg>

            <div className="ea-print">
              <svg className="ea-svg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} focusable="false">
                <defs>
                  <linearGradient id="ea-body-fill" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0" stopColor="#1b1d1c" />
                    <stop offset=".22" stopColor="#4b4843" />
                    <stop offset=".46" stopColor="#34332f" />
                    <stop offset=".82" stopColor="#1a1b1a" />
                    <stop offset="1" stopColor="#2b221d" />
                  </linearGradient>
                  <linearGradient id="ea-body-shade" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="#f3efe6" stopOpacity=".08" />
                    <stop offset="1" stopColor="#000" stopOpacity=".35" />
                  </linearGradient>
                </defs>
                <path d={silhouette} fill="url(#ea-body-fill)" />
                <path d={silhouette} fill="url(#ea-body-shade)" />
                {layers.map((layer, index) => <path key={index} d={frontArc(layer)} className="ea-layer-line" />)}
                <ellipse cx={CX} cy={f(top.y)} rx={f(top.r)} ry={f(top.ry)} className="ea-opening" />
                <path d={backArc(top)} className="ea-rim" />
                <path d={silhouette} className="ea-edge" />
              </svg>
            </div>

            <div className="ea-scan"><i /></div>
          </div>
        </div>

        <div className="ea-depth ea-depth-front">
          <svg className="ea-svg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} focusable="false">
            <path d={`M${CX - 262} 330A262 74 0 0 0 ${CX + 262} 330`} transform={`rotate(-9 ${CX} 330)`} className="ea-orbit-front" />
            <circle cx={CX - 212} cy={401} r={3.5} className="ea-node" />
            <circle cx={CX + 238} cy={292} r={3} className="ea-node is-accent" />
            <g className="ea-gizmo" transform={`translate(${CX + 252} ${PLATE_Y + 52})`}>
              <path d="M0 0V-34" className="ea-axis is-z" />
              <path d="M0 0L30 9" className="ea-axis is-x" />
              <path d="M0 0L-24 10" className="ea-axis is-y" />
              <text x="-3" y="-40">Z</text>
              <text x="34" y="14">X</text>
              <text x="-36" y="18">Y</text>
            </g>
          </svg>
        </div>
      </div>
      <div className="ea-grain" />
    </div>

    <p className="ea-caption">
      <span>ESHANTVA <b>3D Studio</b></span>
      <strong>From Idea to Physical Product.</strong>
    </p>
  </div>;
}
