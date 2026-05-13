"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import {
  CORRIDORS,
  GRID_MAJOR,
  GRID_MINOR,
  NEIGHBORHOODS,
  PANEL_HEIGHT,
  PANEL_WIDTH,
} from "../lib/la";
import type { UserCorridor } from "../lib/scheduleStore";
import type { PanelKind } from "../lib/types";

export interface PanelHandle {
  getVehicleNodes(): (SVGGElement | null)[];
  getUserVehicleNodes(): (SVGGElement | null)[];
}

interface Props {
  panelKind: PanelKind;
  title: string;
  eyebrow: string;
  caption: string;
  showCorridorPulses: boolean;
  vehicleCount: number;
  userCorridors?: UserCorridor[];
}

export const Panel = forwardRef<PanelHandle, Props>(function Panel(
  { panelKind, title, eyebrow, caption, showCorridorPulses, vehicleCount, userCorridors = [] },
  ref,
) {
  const vehicleNodes = useRef<(SVGGElement | null)[]>([]);
  const userVehicleNodes = useRef<(SVGGElement | null)[]>([]);
  useImperativeHandle(ref, () => ({
    getVehicleNodes: () => vehicleNodes.current,
    getUserVehicleNodes: () => userVehicleNodes.current,
  }));

  const filterId = `glow-${panelKind}`;
  const bgId = `bg-${panelKind}`;
  const vehicleGlowId = `vehicle-glow-${panelKind}`;

  const minorVerticals: number[] = [];
  for (let x = 0; x <= PANEL_WIDTH; x += GRID_MINOR) minorVerticals.push(x);
  const minorHorizontals: number[] = [];
  for (let y = 0; y <= PANEL_HEIGHT; y += GRID_MINOR) minorHorizontals.push(y);
  const majorVerticals: number[] = [];
  for (let x = 0; x <= PANEL_WIDTH; x += GRID_MAJOR) majorVerticals.push(x);
  const majorHorizontals: number[] = [];
  for (let y = 0; y <= PANEL_HEIGHT; y += GRID_MAJOR) majorHorizontals.push(y);

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: "#0B1020",
        borderRadius: 14,
        padding: 12,
        border: "1px solid #1E293B",
      }}
    >
      <div style={{ marginBottom: 8, display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <div
          style={{
            fontSize: 9,
            color: panelKind === "commutepass" ? "#22D3EE" : "#64748B",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {eyebrow}
        </div>
        <div style={{ fontSize: 16, color: "#F1F5F9", fontWeight: 700 }}>{title}</div>
        <div
          style={{
            fontSize: 11,
            color: "#94A3B8",
            fontStyle: "italic",
            letterSpacing: "0.01em",
          }}
        >
          {caption}
        </div>
      </div>

      <svg viewBox={`0 0 ${PANEL_WIDTH} ${PANEL_HEIGHT}`} width="100%" style={{ display: "block" }}>
        <defs>
          <radialGradient id={bgId} cx="50%" cy="40%" r="80%">
            <stop offset="0%" stopColor="#0F1A35" />
            <stop offset="100%" stopColor="#070C1C" />
          </radialGradient>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={vehicleGlowId} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>

        <rect x={0} y={0} width={PANEL_WIDTH} height={PANEL_HEIGHT} fill={`url(#${bgId})`} rx={12} />

        {/* Minor grid */}
        <g opacity={0.09} stroke="#3B82F6" strokeWidth={0.5}>
          {minorVerticals.map((x) => (
            <line key={`mv-${x}`} x1={x} y1={0} x2={x} y2={PANEL_HEIGHT} />
          ))}
          {minorHorizontals.map((y) => (
            <line key={`mh-${y}`} x1={0} y1={y} x2={PANEL_WIDTH} y2={y} />
          ))}
        </g>

        {/* Major grid (avenue / street emphasis) */}
        <g opacity={0.18} stroke="#3B82F6" strokeWidth={0.8}>
          {majorVerticals.map((x) => (
            <line key={`Mv-${x}`} x1={x} y1={0} x2={x} y2={PANEL_HEIGHT} />
          ))}
          {majorHorizontals.map((y) => (
            <line key={`Mh-${y}`} x1={0} y1={y} x2={PANEL_WIDTH} y2={y} />
          ))}
        </g>

        {/* Neighborhoods as rounded rectangles */}
        {NEIGHBORHOODS.map((h) => {
          const w = h.r * 2;
          const ht = h.r * 1.5;
          return (
            <g key={h.name}>
              <rect
                x={h.cx - w / 2}
                y={h.cy - ht / 2}
                width={w}
                height={ht}
                rx={6}
                fill="#15294D"
                stroke="#22416E"
                strokeWidth={0.85}
                opacity={0.7}
              />
              <text
                x={h.cx}
                y={h.cy + 3}
                fontSize={9.5}
                textAnchor="middle"
                fill="#8FA8C9"
                fontWeight={600}
                letterSpacing="0.04em"
              >
                {h.name}
              </text>
            </g>
          );
        })}

        {/* Corridors */}
        {CORRIDORS.map(([a, b], i) => {
          const A = NEIGHBORHOODS[a];
          const B = NEIGHBORHOODS[b];
          return (
            <g key={i} filter={showCorridorPulses ? `url(#${filterId})` : undefined}>
              <line
                x1={A.cx}
                y1={A.cy}
                x2={B.cx}
                y2={B.cy}
                stroke={showCorridorPulses ? "#22D3EE" : "#1E3A5F"}
                strokeWidth={showCorridorPulses ? 2 : 1}
                strokeDasharray={showCorridorPulses ? "0" : "4 6"}
                opacity={showCorridorPulses ? 0.9 : 0.5}
              />
              {showCorridorPulses && (
                <circle cx={(A.cx + B.cx) / 2} cy={(A.cy + B.cy) / 2} r={4} fill="#22D3EE" opacity={0.85} />
              )}
            </g>
          );
        })}

        {/* User-scheduled corridors — orange to distinguish from system-generated
            teal corridors, finer weight + animated dash flow + small midpoint bead. */}
        {userCorridors.map((uc) => {
          const midX = (uc.from.cx + uc.to.cx) / 2;
          const midY = (uc.from.cy + uc.to.cy) / 2;
          return (
            <g key={uc.id}>
              <line
                x1={uc.from.cx}
                y1={uc.from.cy}
                x2={uc.to.cx}
                y2={uc.to.cy}
                stroke="#FB923C"
                strokeWidth={4}
                opacity={0.22}
              />
              <line
                x1={uc.from.cx}
                y1={uc.from.cy}
                x2={uc.to.cx}
                y2={uc.to.cy}
                stroke="#FB923C"
                strokeWidth={1.75}
                strokeDasharray="7 4"
                opacity={1}
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="-11"
                  dur="1.2s"
                  repeatCount="indefinite"
                />
              </line>
              <circle cx={midX} cy={midY} r={3.5} fill="#FB923C">
                <animate
                  attributeName="r"
                  values="3;4.5;3"
                  dur="1.6s"
                  repeatCount="indefinite"
                />
              </circle>
              <text
                x={midX}
                y={midY - 9}
                fontSize={8}
                fontWeight={800}
                fill="#FB923C"
                textAnchor="middle"
                letterSpacing="0.16em"
              >
                SCHEDULED
              </text>
            </g>
          );
        })}

        {/* Vehicles */}
        {Array.from({ length: vehicleCount }).map((_, i) => (
          <g
            key={i}
            ref={(el) => {
              vehicleNodes.current[i] = el;
            }}
            transform="translate(0, 0)"
          >
            <circle r={5.5} fill="#6B7280" opacity={0.35} filter={`url(#${vehicleGlowId})`} />
            <circle r={3.2} fill="#6B7280" />
          </g>
        ))}

        {/* User-scheduled ride vehicles — one per user corridor. Driven by
            the parent's rAF loop based on the schedule's departure time. */}
        {userCorridors.map((uc, i) => (
          <g
            key={`user-${uc.id}`}
            ref={(el) => {
              userVehicleNodes.current[i] = el;
            }}
            transform={`translate(${uc.from.cx}, ${uc.from.cy})`}
          >
            <circle r={6} fill="#6B7280" opacity={0.45} filter={`url(#${vehicleGlowId})`} />
            <circle r={3.6} fill="#6B7280" />
            <circle r={5.2} fill="none" stroke="#FB923C" strokeWidth={1} opacity={0.85} />
          </g>
        ))}
      </svg>
    </div>
  );
});
