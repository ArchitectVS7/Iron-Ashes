import { KNOWN_LANDS, BoardState, BoardNode } from '../models/board.js';
import type { GameState } from '../models/game-state.js';

interface Point {
    x: number;
    y: number;
}

// ─── Human-readable node name map ──────────────────────────────────
const NODE_NAMES: Record<string, string> = {
    'keep-0': 'Court of Wind',
    'keep-1': 'Court of Fire',
    'keep-2': 'Court of Water',
    'keep-3': 'Court of Earth',
    's01': 'Western Pass',
    's02': 'Northern Bluff',
    's03': 'Eastern Ridge',
    's04': 'Ember Crossing',
    's05': 'Tidal Reach',
    's06': 'Southern Marsh',
    's07': 'Stone Road',
    's08': 'Windward Trail',
    's09': 'Shadow Gate East',
    's10': 'Shadow Gate South',
    's11': 'Shadow Gate West',
    's12': 'Shadow Gate North',
    's13': 'Fire-Wind Bridge',
    's14': 'Fire-Water Bridge',
    's15': 'Water-Earth Bridge',
    's16': 'Earth-Wind Bridge',
    's17': 'Eastern Approach',
    's18': 'Western Approach',
    'forge-ne': 'Forge of Flames',
    'forge-se': 'Forge of Tides',
    'forge-sw': 'Forge of Stone',
    'forge-nw': 'Forge of Gales',
    'dark-fortress': 'Dark Fortress',
    'hall': 'Hall of Neutrality',
};

// ─── Court colors (player faction palette) ─────────────────────────
const COURT_COLORS = [
    { fill: '#c084fc', stroke: '#a855f7', light: '#e9d5ff', name: 'Wind' },   // violet (Court 0)
    { fill: '#f87171', stroke: '#ef4444', light: '#fecaca', name: 'Fire' },   // red (Court 1)
    { fill: '#60a5fa', stroke: '#3b82f6', light: '#bfdbfe', name: 'Water' },  // blue (Court 2)
    { fill: '#4ade80', stroke: '#22c55e', light: '#bbf7d0', name: 'Earth' },  // green (Court 3)
];

// ─── Node type visual config ───────────────────────────────────────
const NODE_STYLES: Record<string, { fill: string; stroke: string; radius: number; shape: 'circle' | 'square' | 'diamond' | 'hexagon' }> = {
    standard: { fill: '#1e293b', stroke: '#475569', radius: 18, shape: 'circle' },
    forge: { fill: '#431407', stroke: '#ea580c', radius: 24, shape: 'hexagon' },
    antagonist_base: { fill: '#1a0a2e', stroke: '#8b5cf6', radius: 30, shape: 'diamond' },
    neutral_center: { fill: '#052e16', stroke: '#34d399', radius: 22, shape: 'circle' },
};

// ─── Player info for rendering fellowship tokens ───────────────────
interface PlayerRenderInfo {
    index: number;
    currentNode: string;
    isBroken: boolean;
    isActive: boolean;
    fellowshipSize: number;
}

export class BoardRenderer {
    private canvas: HTMLCanvasElement;
    /**
     * Rendering context. Null in headless environments (e.g. jsdom tests)
     * where canvas 2D is not supported. All draw methods guard on this.
     */
    private ctx: CanvasRenderingContext2D | null;
    private coordinates: Record<string, Point> = {};
    private hoveredNode: string | null = null;
    private selectedNode: string | null = null;
    private boardState: BoardState | null = null;
    private diplomaticNodes: string[] = [];
    private reachableNodes: string[] = [];
    private claimableNodes: string[] = [];
    private renderLoopId: number = 0;
    private animationFrame: number = 0;
    private players: PlayerRenderInfo[] = [];
    private antagonistForces: Array<{ id: string; type: string; currentNode: string }> = [];
    private activePlayerIndex: number = 0;
    private currentPhase: string = '';
    private currentRound: number = 0;
    private tooltipNode: string | null = null;

    public onNodeClick?: (nodeId: string) => void;

    constructor(canvas: HTMLCanvasElement | string) {
        if (typeof canvas === 'string') {
            const el = document.getElementById(canvas) as HTMLCanvasElement;
            if (!el) throw new Error(`Canvas #${canvas} not found`);
            this.canvas = el;
        } else {
            this.canvas = canvas;
        }

        this.ctx = this.canvas.getContext('2d');
        this.initCoordinates();
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('click', this.handleClick.bind(this));

        // Start animation loop
        this.startAnimationLoop();
    }

    // ─── Public API ────────────────────────────────────────────────

    public updateState(state: BoardState, diplomaticNodes: string[] = []) {
        this.boardState = state;
        this.diplomaticNodes = diplomaticNodes;
        this.render();
    }

    /**
     * Full state update — provides all game info for rich rendering.
     * Called from game-controller after any state mutation.
     */
    public updateFullState(state: GameState): void {
        this.boardState = state.boardState;
        this.activePlayerIndex = state.activePlayerIndex;
        this.currentPhase = state.phase;
        this.currentRound = state.round;

        // Extract player positions for token rendering
        this.players = state.players.map(p => ({
            index: p.index,
            currentNode: p.fellowship.currentNode,
            isBroken: p.isBroken,
            isActive: p.index === state.activePlayerIndex && state.phase === 'action',
            fellowshipSize: p.fellowship.characters.length,
        }));

        // Extract antagonist forces
        this.antagonistForces = state.antagonistForces.map(f => ({
            id: f.id,
            type: f.type,
            currentNode: f.currentNode,
        }));

        this.render();
    }

    public setHighlightedNodes(reachable: string[], claimable: string[]): void {
        this.reachableNodes = reachable;
        this.claimableNodes = claimable;
        this.render();
    }

    // ─── Coordinate System ─────────────────────────────────────────

    private initCoordinates() {
        const cx = 960;
        const cy = 540;

        const polar = (deg: number, r: number): Point => {
            const rad = (deg * Math.PI) / 180;
            return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
        };

        // Special nodes
        this.coordinates['dark-fortress'] = { x: cx, y: cy - 60 };
        this.coordinates['hall'] = { x: cx, y: cy + 60 };

        // Keeps (outer ring)
        this.coordinates['keep-1'] = polar(0, 420);
        this.coordinates['keep-2'] = polar(90, 420);
        this.coordinates['keep-3'] = polar(180, 420);
        this.coordinates['keep-0'] = polar(270, 420);

        // Outer standards
        this.coordinates['s02'] = polar(292.5, 360);
        this.coordinates['s03'] = polar(337.5, 360);
        this.coordinates['s04'] = polar(22.5, 360);
        this.coordinates['s05'] = polar(67.5, 360);
        this.coordinates['s06'] = polar(112.5, 360);
        this.coordinates['s07'] = polar(157.5, 360);
        this.coordinates['s08'] = polar(202.5, 360);
        this.coordinates['s01'] = polar(247.5, 360);

        // Bridge nodes (outer)
        this.coordinates['s13'] = polar(315, 460);
        this.coordinates['s14'] = polar(45, 460);
        this.coordinates['s15'] = polar(135, 460);
        this.coordinates['s16'] = polar(225, 460);

        // Forges (mid ring)
        this.coordinates['forge-ne'] = polar(315, 260);
        this.coordinates['forge-se'] = polar(45, 260);
        this.coordinates['forge-sw'] = polar(135, 260);
        this.coordinates['forge-nw'] = polar(225, 260);

        // Inner standards (near dark fortress)
        this.coordinates['s09'] = polar(315, 140);
        this.coordinates['s10'] = polar(45, 140);
        this.coordinates['s11'] = polar(135, 140);
        this.coordinates['s12'] = polar(225, 140);

        // Center bridges
        this.coordinates['s17'] = polar(0, 160);
        this.coordinates['s18'] = polar(180, 160);
    }

    // ─── Canvas Sizing ─────────────────────────────────────────────

    private resize() {
        const rect = this.canvas.getBoundingClientRect();
        // Use device pixel ratio for sharp rendering
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        if (this.ctx) {
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        this.render();
    }

    // ─── Animation Loop ────────────────────────────────────────────

    private startAnimationLoop() {
        const tick = () => {
            this.animationFrame++;
            // Re-render every ~2 seconds for pulse effects (at 60fps)
            if (this.animationFrame % 120 === 0 || this.diplomaticNodes.length > 0) {
                this.render();
            }
            this.renderLoopId = requestAnimationFrame(tick);
        };
        this.renderLoopId = requestAnimationFrame(tick);
    }

    // ─── Input Handling ────────────────────────────────────────────

    private handleMouseMove(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        if (w === 0 || h === 0) return;

        const scale = Math.min(w / 1920, h / 1080);
        const offsetX = (w - 1920 * scale) / 2;
        const offsetY = (h - 1080 * scale) / 2;

        const logicalX = (e.clientX - rect.left - offsetX) / scale;
        const logicalY = (e.clientY - rect.top - offsetY) / scale;

        let found: string | null = null;
        for (const [id, pos] of Object.entries(this.coordinates)) {
            const dx = logicalX - pos.x;
            const dy = logicalY - pos.y;
            const hitRadius = NODE_STYLES[KNOWN_LANDS.nodes[id]?.type ?? 'standard']?.radius ?? 18;
            if (dx * dx + dy * dy < (hitRadius + 15) * (hitRadius + 15)) {
                found = id;
                break;
            }
        }

        if (this.hoveredNode !== found) {
            this.hoveredNode = found;
            this.tooltipNode = found;
            this.canvas.style.cursor = found ? 'pointer' : 'default';
            this.render();
        }
    }

    private handleClick(_e: MouseEvent) {
        if (this.hoveredNode) {
            this.selectedNode = this.hoveredNode;
            if (this.onNodeClick) {
                this.onNodeClick(this.hoveredNode);
            }
            this.render();
        } else {
            this.selectedNode = null;
            this.render();
        }
    }

    // ─── Main Render ───────────────────────────────────────────────

    public render() {
        if (!this.ctx) return;

        const ctx = this.ctx;
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const w = rect.width;
        const h = rect.height;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Scale to fit logical 1920x1080 into actual canvas
        const scale = Math.min(w / 1920, h / 1080) * dpr;
        const offsetX = (this.canvas.width - 1920 * scale) / 2;
        const offsetY = (this.canvas.height - 1080 * scale) / 2;
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        // Background
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(-offsetX / scale, -offsetY / scale, this.canvas.width / scale, this.canvas.height / scale);

        // Decorative rings
        this.drawDecorations(ctx);

        // Connections
        this.drawConnections(ctx);

        // Nodes
        for (const node of Object.values(KNOWN_LANDS.nodes)) {
            this.drawNode(ctx, node);
        }

        // Player fellowship tokens
        this.drawPlayerTokens(ctx);

        // Antagonist forces
        this.drawAntagonistForces(ctx);

        // Tooltip
        if (this.tooltipNode && this.hoveredNode) {
            this.drawTooltip(ctx, this.tooltipNode);
        }

        ctx.restore();
    }

    // ─── Decorative Elements ───────────────────────────────────────

    private drawDecorations(ctx: CanvasRenderingContext2D) {
        // Outer faint guide ring
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
        ctx.lineWidth = 1;
        [420, 260, 140].forEach(r => {
            ctx.beginPath();
            ctx.arc(960, 540, r, 0, Math.PI * 2);
            ctx.stroke();
        });

        // Cardinal direction labels
        ctx.fillStyle = 'rgba(100, 116, 139, 0.3)';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('N', 960, 85);
        ctx.fillText('S', 960, 1000);
        ctx.fillText('E', 1430, 545);
        ctx.fillText('W', 490, 545);
    }

    // ─── Connection Lines ──────────────────────────────────────────

    private drawConnections(ctx: CanvasRenderingContext2D) {
        ctx.lineWidth = 2;
        const drawn = new Set<string>();

        for (const node of Object.values(KNOWN_LANDS.nodes)) {
            const p1 = this.coordinates[node.id];
            if (!p1) continue;

            for (const conn of node.connections) {
                const hash = [node.id, conn].sort().join('-');
                if (drawn.has(hash)) continue;
                drawn.add(hash);

                const p2 = this.coordinates[conn];
                if (!p2) continue;

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);

                // Highlight connections for hovered or reachable nodes
                const isHighlighted =
                    this.hoveredNode === node.id || this.hoveredNode === conn;
                const isReachablePath =
                    this.reachableNodes.includes(node.id) || this.reachableNodes.includes(conn);

                if (isHighlighted) {
                    ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
                    ctx.lineWidth = 3;
                } else if (isReachablePath) {
                    ctx.strokeStyle = 'rgba(52, 211, 153, 0.3)';
                    ctx.lineWidth = 2.5;
                } else {
                    ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
                    ctx.lineWidth = 1.5;
                }
                ctx.stroke();
            }
        }
    }

    // ─── Node Rendering ────────────────────────────────────────────

    private drawNode(ctx: CanvasRenderingContext2D, node: BoardNode) {
        const pos = this.coordinates[node.id];
        if (!pos) return;

        const style = NODE_STYLES[node.type] ?? NODE_STYLES.standard;
        const isHovered = this.hoveredNode === node.id;
        const isSelected = this.selectedNode === node.id;
        const isReachable = this.reachableNodes.includes(node.id);
        const isClaimable = this.claimableNodes.includes(node.id);
        const state = this.boardState?.[node.id];

        ctx.save();
        ctx.translate(pos.x, pos.y);

        // Determine fill based on ownership
        let fillColor = style.fill;
        let strokeColor = style.stroke;
        const radius = style.radius;

        if (state?.claimedBy !== null && state?.claimedBy !== undefined) {
            const courtIdx = state.claimedBy;
            if (courtIdx >= 0 && courtIdx < COURT_COLORS.length) {
                // Player-owned: tint the node
                fillColor = this.blendColors(style.fill, COURT_COLORS[courtIdx].fill, 0.6);
                strokeColor = COURT_COLORS[courtIdx].stroke;
            } else if (courtIdx === -1) {
                // Shadowking-claimed
                fillColor = '#2d1b4e';
                strokeColor = '#7c3aed';
            }
        }

        // Draw shape
        this.drawNodeShape(ctx, style.shape, radius, fillColor, strokeColor);

        // Highlight rings
        if (isSelected || isHovered || isReachable || isClaimable) {
            ctx.beginPath();
            ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
            ctx.lineWidth = 2.5;

            if (isClaimable) {
                ctx.strokeStyle = '#f59e0b';
                ctx.setLineDash([5, 5]);
            } else if (isReachable) {
                ctx.strokeStyle = '#10b981';
                ctx.setLineDash([]);
            } else if (isSelected) {
                ctx.strokeStyle = '#fcd34d';
                ctx.setLineDash([5, 5]);
            } else {
                ctx.strokeStyle = 'rgba(254, 243, 199, 0.5)';
                ctx.setLineDash([]);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Diplomatic nodes: animated ring
        if (this.diplomaticNodes.includes(node.id)) {
            ctx.beginPath();
            ctx.arc(0, 0, radius + 12, 0, Math.PI * 2);
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.lineDashOffset = -(this.animationFrame / 2) % 12;
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Ownership flag (small colored dot in corner)
        if (state?.claimedBy !== null && state?.claimedBy !== undefined && state.claimedBy >= 0) {
            const flagX = radius - 4;
            const flagY = -(radius - 4);
            ctx.beginPath();
            ctx.arc(flagX, flagY, 6, 0, Math.PI * 2);
            ctx.fillStyle = COURT_COLORS[state.claimedBy]?.fill ?? '#fff';
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Wanderer token indicator
        if (state?.hasWanderer) {
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(0, -(radius + 14), 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 11px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', 0, -(radius + 14));
        }

        // Node name label
        const displayName = NODE_NAMES[node.id] ?? node.id;
        ctx.fillStyle = isHovered ? '#e2e8f0' : '#94a3b8';
        ctx.font = isHovered ? 'bold 11px Inter' : '10px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Multi-line for long names
        const words = displayName.split(' ');
        if (words.length > 2 && displayName.length > 12) {
            const mid = Math.ceil(words.length / 2);
            ctx.fillText(words.slice(0, mid).join(' '), 0, radius + 10);
            ctx.fillText(words.slice(mid).join(' '), 0, radius + 22);
        } else {
            ctx.fillText(displayName, 0, radius + 12);
        }

        // Type indicator for special nodes
        if (node.type === 'forge') {
            ctx.fillStyle = '#ea580c';
            ctx.font = 'bold 14px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚒', 0, 0);
        } else if (node.type === 'antagonist_base') {
            ctx.fillStyle = '#a78bfa';
            ctx.font = 'bold 16px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('☠', 0, 0);
        } else if (node.type === 'neutral_center') {
            ctx.fillStyle = '#34d399';
            ctx.font = 'bold 13px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚖', 0, 0);
        }

        ctx.restore();
    }

    private drawNodeShape(
        ctx: CanvasRenderingContext2D,
        shape: string,
        radius: number,
        fill: string,
        stroke: string,
    ) {
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2.5;

        switch (shape) {
            case 'hexagon': {
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i - Math.PI / 6;
                    const x = radius * Math.cos(angle);
                    const y = radius * Math.sin(angle);
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
            }
            case 'diamond': {
                ctx.beginPath();
                ctx.moveTo(0, -radius);
                ctx.lineTo(radius, 0);
                ctx.lineTo(0, radius);
                ctx.lineTo(-radius, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
            }
            case 'square': {
                ctx.beginPath();
                ctx.rect(-radius, -radius, radius * 2, radius * 2);
                ctx.fill();
                ctx.stroke();
                break;
            }
            default: {
                // Circle
                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;
            }
        }
    }

    // ─── Player Tokens ─────────────────────────────────────────────

    private drawPlayerTokens(ctx: CanvasRenderingContext2D) {
        // Group players by node for stacking
        const nodeToPlayers = new Map<string, PlayerRenderInfo[]>();
        for (const p of this.players) {
            if (!nodeToPlayers.has(p.currentNode)) {
                nodeToPlayers.set(p.currentNode, []);
            }
            nodeToPlayers.get(p.currentNode)!.push(p);
        }

        for (const [nodeId, players] of nodeToPlayers) {
            const pos = this.coordinates[nodeId];
            if (!pos) continue;

            const nodeStyle = NODE_STYLES[KNOWN_LANDS.nodes[nodeId]?.type ?? 'standard'];
            const baseOffset = nodeStyle?.radius ?? 18;

            players.forEach((player, stackIdx) => {
                const offsetX = (stackIdx - (players.length - 1) / 2) * 24;
                const tokenX = pos.x + offsetX;
                const tokenY = pos.y + baseOffset + 30;

                const court = COURT_COLORS[player.index] ?? COURT_COLORS[0];

                ctx.save();
                ctx.translate(tokenX, tokenY);

                // Active player pulse
                if (player.isActive) {
                    const pulse = 0.3 + 0.15 * Math.sin(this.animationFrame * 0.05);
                    ctx.beginPath();
                    ctx.arc(0, 0, 16, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${this.hexToRgb(court.fill)}, ${pulse})`;
                    ctx.fill();
                }

                // Token body (shield shape)
                ctx.beginPath();
                ctx.arc(0, 0, 11, 0, Math.PI * 2);
                ctx.fillStyle = player.isBroken ? '#374151' : court.fill;
                ctx.fill();
                ctx.strokeStyle = player.isBroken ? '#6b7280' : court.stroke;
                ctx.lineWidth = 2;
                ctx.stroke();

                // Player number
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 11px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`P${player.index + 1}`, 0, 0);

                // Broken indicator
                if (player.isBroken) {
                    ctx.strokeStyle = '#ef4444';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(-8, -8);
                    ctx.lineTo(8, 8);
                    ctx.moveTo(8, -8);
                    ctx.lineTo(-8, 8);
                    ctx.stroke();
                }

                // Fellowship size badge
                if (player.fellowshipSize > 1) {
                    ctx.beginPath();
                    ctx.arc(9, -9, 7, 0, Math.PI * 2);
                    ctx.fillStyle = '#1e293b';
                    ctx.fill();
                    ctx.strokeStyle = court.stroke;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fillStyle = '#e2e8f0';
                    ctx.font = '8px Inter';
                    ctx.fillText(String(player.fellowshipSize), 9, -9);
                }

                ctx.restore();
            });
        }
    }

    // ─── Antagonist Force Rendering ────────────────────────────────

    private drawAntagonistForces(ctx: CanvasRenderingContext2D) {
        // Group forces by node
        const nodeToForces = new Map<string, Array<{ id: string; type: string }>>();
        for (const f of this.antagonistForces) {
            if (!nodeToForces.has(f.currentNode)) {
                nodeToForces.set(f.currentNode, []);
            }
            nodeToForces.get(f.currentNode)!.push(f);
        }

        for (const [nodeId, forces] of nodeToForces) {
            const pos = this.coordinates[nodeId];
            if (!pos) continue;

            const nodeStyle = NODE_STYLES[KNOWN_LANDS.nodes[nodeId]?.type ?? 'standard'];
            const baseOffset = nodeStyle?.radius ?? 18;

            const lieutenants = forces.filter(f => f.type === 'lieutenant');
            const minions = forces.filter(f => f.type === 'minion');

            let offsetX = -(baseOffset + 18);

            // Draw Death Knights (lieutenants)
            for (const _lt of lieutenants) {
                ctx.save();
                ctx.translate(pos.x + offsetX, pos.y);

                // Danger glow
                const pulse = 0.2 + 0.1 * Math.sin(this.animationFrame * 0.03);
                ctx.beginPath();
                ctx.arc(0, 0, 14, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
                ctx.fill();

                // Body
                ctx.beginPath();
                ctx.arc(0, 0, 10, 0, Math.PI * 2);
                ctx.fillStyle = '#7f1d1d';
                ctx.fill();
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Skull icon
                ctx.fillStyle = '#fca5a5';
                ctx.font = 'bold 10px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('⚔', 0, 0);

                ctx.restore();
                offsetX -= 22;
            }

            // Draw Blight Wraith count badge
            if (minions.length > 0) {
                ctx.save();
                ctx.translate(pos.x + offsetX, pos.y);

                ctx.beginPath();
                ctx.arc(0, 0, 10, 0, Math.PI * 2);
                ctx.fillStyle = '#3b0764';
                ctx.fill();
                ctx.strokeStyle = '#a855f7';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.fillStyle = '#e9d5ff';
                ctx.font = 'bold 10px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(minions.length), 0, 0);

                ctx.restore();
            }
        }
    }

    // ─── Tooltip ───────────────────────────────────────────────────

    private drawTooltip(ctx: CanvasRenderingContext2D, nodeId: string) {
        const pos = this.coordinates[nodeId];
        if (!pos) return;

        const node = KNOWN_LANDS.nodes[nodeId];
        if (!node) return;

        const state = this.boardState?.[nodeId];
        const name = NODE_NAMES[nodeId] ?? nodeId;

        // Build tooltip lines
        const lines: string[] = [name];

        // Type
        const typeLabels: Record<string, string> = {
            standard: 'Stronghold',
            forge: 'Forge Keep (+3 banners)',
            antagonist_base: 'Dark Fortress (unclaimable)',
            neutral_center: 'Hall of Neutrality',
        };
        lines.push(typeLabels[node.type] ?? node.type);

        // Ownership
        if (state?.claimedBy !== null && state?.claimedBy !== undefined) {
            if (state.claimedBy >= 0 && state.claimedBy < COURT_COLORS.length) {
                lines.push(`Claimed by: Court of ${COURT_COLORS[state.claimedBy].name} (P${state.claimedBy + 1})`);
            } else if (state.claimedBy === -1) {
                lines.push('Claimed by: Shadowking');
            }
        } else if (node.type === 'standard' || node.type === 'forge') {
            lines.push('Unclaimed');
        }

        // Wanderer
        if (state?.hasWanderer) {
            lines.push('Unknown Wanderer present');
        }

        // Forces
        if (state?.antagonistForces && state.antagonistForces.length > 0) {
            const ltCount = state.antagonistForces.filter(id => id.startsWith('lieutenant')).length;
            const mCount = state.antagonistForces.filter(id => id.startsWith('minion')).length;
            if (ltCount > 0) lines.push(`Death Knights: ${ltCount}`);
            if (mCount > 0) lines.push(`Blight Wraiths: ${mCount}`);
        }

        // Players present
        const playersHere = this.players.filter(p => p.currentNode === nodeId);
        if (playersHere.length > 0) {
            const playerStrs = playersHere.map(p =>
                `P${p.index + 1} (${COURT_COLORS[p.index]?.name ?? '?'})${p.isBroken ? ' [BROKEN]' : ''}`
            );
            lines.push(`Players: ${playerStrs.join(', ')}`);
        }

        // Render tooltip box
        ctx.save();

        const padding = 10;
        const lineHeight = 16;
        const tooltipWidth = 220;
        const tooltipHeight = lines.length * lineHeight + padding * 2;

        // Position: above the node, clamped to viewport
        let tx = pos.x - tooltipWidth / 2;
        let ty = pos.y - (NODE_STYLES[node.type]?.radius ?? 18) - tooltipHeight - 20;

        // Clamp
        if (tx < 10) tx = 10;
        if (tx + tooltipWidth > 1910) tx = 1910 - tooltipWidth;
        if (ty < 10) ty = pos.y + (NODE_STYLES[node.type]?.radius ?? 18) + 45;

        // Background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
        ctx.lineWidth = 1;
        this.roundRect(ctx, tx, ty, tooltipWidth, tooltipHeight, 6);
        ctx.fill();
        ctx.stroke();

        // Text
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        lines.forEach((line, i) => {
            if (i === 0) {
                ctx.fillStyle = '#f1f5f9';
                ctx.font = 'bold 12px Inter';
            } else {
                ctx.fillStyle = '#94a3b8';
                ctx.font = '11px Inter';
            }
            ctx.fillText(line, tx + padding, ty + padding + i * lineHeight);
        });

        ctx.restore();
    }

    // ─── Utility Methods ───────────────────────────────────────────

    private roundRect(
        ctx: CanvasRenderingContext2D,
        x: number, y: number, w: number, h: number, r: number,
    ) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    private blendColors(base: string, overlay: string, amount: number): string {
        const b = this.hexToRgbArray(base);
        const o = this.hexToRgbArray(overlay);
        const r = Math.round(b[0] + (o[0] - b[0]) * amount);
        const g = Math.round(b[1] + (o[1] - b[1]) * amount);
        const bl = Math.round(b[2] + (o[2] - b[2]) * amount);
        return `rgb(${r}, ${g}, ${bl})`;
    }

    private hexToRgb(hex: string): string {
        const arr = this.hexToRgbArray(hex);
        return `${arr[0]}, ${arr[1]}, ${arr[2]}`;
    }

    private hexToRgbArray(hex: string): [number, number, number] {
        const h = hex.replace('#', '');
        return [
            parseInt(h.substring(0, 2), 16) || 0,
            parseInt(h.substring(2, 4), 16) || 0,
            parseInt(h.substring(4, 6), 16) || 0,
        ];
    }
}
