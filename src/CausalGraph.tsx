import { useState } from 'react'

type NodeType = 'treatment' | 'outcome' | 'confounder' | 'collider' | 'mediator'

interface GraphNode {
  id: string
  label: string
  type: NodeType
}

interface GraphEdge {
  from: string
  to: string
  confidence: number
  rationale: string
  grounded: boolean
}

interface CausalGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  emptyMessage: string
}

const WIDTH = 680
const HALF_W = 70
const HALF_H = 24
const ROW_GAP = 64
const MAX_PER_ROW = 4
const TOP_MARGIN = 50
const BOTTOM_MARGIN = 50

const typeStyle: Record<NodeType, { fill: string; stroke: string; label: string }> = {
  treatment: { fill: '#dbe9ff', stroke: '#3b6fb0', label: 'Treatment' },
  outcome: { fill: '#dcf3e2', stroke: '#2f7a4f', label: 'Outcome' },
  confounder: { fill: '#fde8c8', stroke: '#b3711c', label: 'Confounder' },
  collider: { fill: '#fbd9d9', stroke: '#b23a3a', label: 'Collider' },
  mediator: { fill: '#eceef1', stroke: '#5c6470', label: 'Mediator' },
}

function edgeConfidencePercent(value: number) {
  return Math.round(value <= 1 ? value * 100 : value)
}

function wrapLabel(label: string): string[] {
  const words = label.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).trim().length > 18) {
      if (current) lines.push(current.trim())
      current = word
    } else {
      current = (current + ' ' + word).trim()
    }
  }
  if (current) lines.push(current)
  if (lines.length > 2) {
    const second = lines[1].length > 16 ? lines[1].slice(0, 15) + '…' : lines[1] + '…'
    return [lines[0], second]
  }
  return lines
}

function boundaryPoint(cx: number, cy: number, dx: number, dy: number) {
  if (dx === 0 && dy === 0) return { x: cx, y: cy }
  const tx = dx !== 0 ? HALF_W / Math.abs(dx) : Infinity
  const ty = dy !== 0 ? HALF_H / Math.abs(dy) : Infinity
  const t = Math.min(tx, ty)
  return { x: cx + dx * t, y: cy + dy * t }
}

// Lays nodes of a group into rows of up to MAX_PER_ROW, wrapping as needed.
// Returns the total height this group consumed.
function layoutRows(arr: GraphNode[], startY: number, positions: Record<string, { x: number; y: number }>) {
  if (arr.length === 0) return 0
  const rows: GraphNode[][] = []
  for (let i = 0; i < arr.length; i += MAX_PER_ROW) {
    rows.push(arr.slice(i, i + MAX_PER_ROW))
  }
  const left = 90
  const right = WIDTH - 90
  rows.forEach((row, rowIndex) => {
    const y = startY + rowIndex * ROW_GAP
    row.forEach((n, i) => {
      const x = row.length === 1 ? WIDTH / 2 : left + ((right - left) * i) / (row.length - 1)
      positions[n.id] = { x, y }
    })
  })
  return rows.length * ROW_GAP
}

function layout(nodes: GraphNode[]) {
  const top = nodes.filter((n) => n.type === 'confounder' || n.type === 'collider')
  const treatment = nodes.filter((n) => n.type === 'treatment')
  const mediator = nodes.filter((n) => n.type === 'mediator')
  const outcome = nodes.filter((n) => n.type === 'outcome')
  const positions: Record<string, { x: number; y: number }> = {}

  const topHeight = layoutRows(top, TOP_MARGIN, positions)
  const middleStartY = TOP_MARGIN + topHeight + 20

  const sideCount = Math.max(treatment.length, mediator.length, outcome.length, 1)
  const middleHeight = (sideCount - 1) * ROW_GAP

  function spreadColumn(arr: GraphNode[], x: number) {
    if (arr.length === 0) return
    const startY = middleStartY + middleHeight / 2 - ((arr.length - 1) * ROW_GAP) / 2
    arr.forEach((n, i) => {
      positions[n.id] = { x, y: startY + i * ROW_GAP }
    })
  }

  spreadColumn(treatment, 90)
  spreadColumn(mediator, WIDTH / 2)
  spreadColumn(outcome, WIDTH - 90)

  const bottomY = middleStartY + middleHeight + BOTTOM_MARGIN

  nodes.forEach((n, i) => {
    if (!positions[n.id]) {
      positions[n.id] = { x: 90 + ((i * 140) % (WIDTH - 180)), y: bottomY }
    }
  })

  const totalHeight = bottomY + HALF_H
  return { positions, totalHeight }
}

export default function CausalGraph({ nodes, edges, emptyMessage }: CausalGraphProps) {
  const lowestConfidenceEdge = edges.length
    ? [...edges].sort((a, b) => a.confidence - b.confidence)[0]
    : null
  const [selected, setSelected] = useState<GraphEdge | null>(lowestConfidenceEdge)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  if (!nodes || nodes.length === 0) {
    return <p className="causal-graph-empty">{emptyMessage}</p>
  }

  const { positions, totalHeight } = layout(nodes)

  return (
    <div className="causal-graph">
      <svg
        viewBox={`0 0 ${WIDTH} ${totalHeight}`}
        className="causal-graph-svg"
        role="img"
        aria-label="Causal structure diagram"
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#7a7368" />
          </marker>
        </defs>

        {edges.map((edge, i) => {
          const from = positions[edge.from]
          const to = positions[edge.to]
          if (!from || !to) return null
          const dx = to.x - from.x
          const dy = to.y - from.y
          const start = boundaryPoint(from.x, from.y, dx, dy)
          const end = boundaryPoint(to.x, to.y, -dx, -dy)
          const pct = edgeConfidencePercent(edge.confidence)
          const opacity = 0.35 + (pct / 100) * 0.65
          return (
            <g key={`edge-${i}`}>
              <line
                x1={start.x} y1={start.y} x2={end.x} y2={end.y}
                stroke="transparent" strokeWidth={16}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelected(edge)}
              />
              <line
                x1={start.x} y1={start.y} x2={end.x} y2={end.y}
                stroke="#7a7368" strokeOpacity={opacity} strokeWidth={2}
                strokeDasharray={edge.grounded ? undefined : '6 5'}
                markerEnd="url(#arrow)" pointerEvents="none"
              />
            </g>
          )
        })}

        {nodes.map((node) => {
          const pos = positions[node.id]
          if (!pos) return null
          const style = typeStyle[node.type] ?? typeStyle.mediator
          const lines = wrapLabel(node.label)
          return (
            <g
              key={node.id}
              transform={`translate(${pos.x - HALF_W}, ${pos.y - HALF_H})`}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedNode(node)}
            >
              <title>{node.label}</title>
              <rect width={HALF_W * 2} height={HALF_H * 2} rx={10} fill={style.fill} stroke={style.stroke} strokeWidth={1.5} />
              <text x={HALF_W} y={HALF_H} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#2b2820">
                {lines.map((line, i) => (
                  <tspan key={i} x={HALF_W} dy={i === 0 ? (lines.length > 1 ? -6 : 0) : 13}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="causal-graph-legend">
        {(Object.keys(typeStyle) as NodeType[]).map((key) => (
          <span key={key} className="legend-item">
            <span className="legend-swatch" style={{ background: typeStyle[key].fill, borderColor: typeStyle[key].stroke }} />
            {typeStyle[key].label}
          </span>
        ))}
        <span className="legend-item"><span className="legend-line solid" /> Grounded in source</span>
        <span className="legend-item"><span className="legend-line dashed" /> Inferred only</span>
      </div>
      <p className="causal-graph-hint">↑ Tap a box for its full label, or an arrow for the reasoning behind it</p>
      {selected && (
        <div className="causal-graph-tooltip">
          <button type="button" onClick={() => setSelected(null)} aria-label="Close">×</button>
          <p><strong>{edgeConfidencePercent(selected.confidence)}% confidence</strong> · {selected.grounded ? 'Grounded in source' : 'Inferred, not grounded'}</p>
          <p>{selected.rationale}</p>
        </div>
      )}
      {selectedNode && (
        <div className="causal-graph-tooltip">
          <button type="button" onClick={() => setSelectedNode(null)} aria-label="Close">×</button>
          <p><strong>{typeStyle[selectedNode.type]?.label ?? 'Node'}</strong></p>
          <p>{selectedNode.label}</p>
        </div>
      )}
    </div>
  )
}
