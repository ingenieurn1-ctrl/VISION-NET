import { Layer, Rectangle, ResponsiveContainer, Sankey, Tooltip } from "recharts";

type Flow = { nodes: { name: string }[]; links: { source: number; target: number; value: number }[] };
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];
const COLUMNS = ["Source", "SaaS", "Étape atteinte"];

type NodeProps = { x?: number; y?: number; width?: number; height?: number; payload?: { name: string; value: number; depth?: number } };
function FlowNode({ x = 0, y = 0, width = 0, height = 0, payload }: NodeProps) {
  const depth = payload?.depth ?? 0;
  const last = depth === 2;
  const tx = last ? x - 10 : x + width + 10;
  const cy = y + height / 2;
  return (
    <Layer>
      <Rectangle x={x} y={y} width={width} height={Math.max(height, 4)} fill={COLORS[depth]} radius={3} />
      <text x={tx} y={cy - 7} textAnchor={last ? "end" : "start"} dy="0.35em" fontSize={12} fontWeight={600} fill="var(--foreground)">{payload?.name}</text>
      <text x={tx} y={cy + 9} textAnchor={last ? "end" : "start"} dy="0.35em" fontSize={11} fill="var(--muted-foreground)">{payload?.value} utilisateur{(payload?.value ?? 0) > 1 ? "s" : ""}</text>
    </Layer>
  );
}

type LinkProps = { sourceX?: number; targetX?: number; sourceY?: number; targetY?: number; sourceControlX?: number; targetControlX?: number; linkWidth?: number; index?: number; payload?: { source?: { depth?: number } } };
function FlowLink({ sourceX = 0, targetX = 0, sourceY = 0, targetY = 0, sourceControlX = 0, targetControlX = 0, linkWidth = 0, index = 0, payload }: LinkProps) {
  const d = payload?.source?.depth ?? 0;
  const id = `flow-grad-${index}`;
  return (
    <Layer>
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={COLORS[d]} />
          <stop offset="100%" stopColor={COLORS[d + 1]} />
        </linearGradient>
      </defs>
      <path
        d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
        fill="none" stroke={`url(#${id})`} strokeOpacity={0.35} strokeWidth={Math.max(linkWidth, 2)}
        className="transition-[stroke-opacity] hover:[stroke-opacity:0.6]"
      />
    </Layer>
  );
}

export function FlowMap({ data }: { data: Flow }) {
  const users = data.links.filter((l) => data.nodes[l.source] && !data.links.some((x) => x.target === l.source)).reduce((s, l) => s + l.value, 0);
  const height = Math.min(520, Math.max(260, data.nodes.length * 56));
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[40rem]">
        <div className="mb-3 grid grid-cols-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {COLUMNS.map((c, i) => (
            <div key={c} className={i === 1 ? "text-center" : i === 2 ? "text-right" : ""}>
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: COLORS[i] }} />{c}</span>
            </div>
          ))}
        </div>
        <div className="rounded-lg border bg-muted/30 p-3" style={{ height }}>
          <ResponsiveContainer>
            <Sankey data={data} nodeWidth={10} nodePadding={36} iterations={64} margin={{ top: 16, bottom: 16, left: 8, right: 8 }} node={<FlowNode />} link={<FlowLink />}>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)" }} />
            </Sankey>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted-foreground tabular-nums">{users} utilisateur{users > 1 ? "s" : ""} attribué{users > 1 ? "s" : ""} sur la période</p>
      </div>
    </div>
  );
}
