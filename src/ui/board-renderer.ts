import { KNOWN_LANDS, BoardState, BoardNode } from '../models/board.js';

interface Point {
    x: number;
    y: number;
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
    public onNodeClick?: (nodeId: string) => void;

    constructor(canvasId: string) {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) throw new Error(`Canvas #${canvasId} not found`);
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.initCoordinates();
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('click', this.handleClick.bind(this));

        this.render();
    }

    public updateState(state: BoardState, diplomaticNodes: string[] = []) {
        this.boardState = state;
        this.diplomaticNodes = diplomaticNodes;

        if (this.diplomaticNodes.length > 0 && !this.renderLoopId) {
            const loop = () => {
                this.render();
                if (this.diplomaticNodes.length > 0) {
                    this.renderLoopId = requestAnimationFrame(loop);
                } else {
                    this.renderLoopId = 0;
                }
            };
            this.renderLoopId = requestAnimationFrame(loop);
        } else {
            this.render();
        }
    }

    public setHighlightedNodes(reachable: string[], claimable: string[]): void {
        this.reachableNodes = reachable;
        this.claimableNodes = claimable;
        this.render();
    }

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

        // Keeps
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

        // Bridge nodes
        this.coordinates['s13'] = polar(315, 460);
        this.coordinates['s14'] = polar(45, 460);
        this.coordinates['s15'] = polar(135, 460);
        this.coordinates['s16'] = polar(225, 460);

        // Forges
        this.coordinates['forge-ne'] = polar(315, 260);
        this.coordinates['forge-se'] = polar(45, 260);
        this.coordinates['forge-sw'] = polar(135, 260);
        this.coordinates['forge-nw'] = polar(225, 260);

        // Inner standards
        this.coordinates['s09'] = polar(315, 140);
        this.coordinates['s10'] = polar(45, 140);
        this.coordinates['s11'] = polar(135, 140);
        this.coordinates['s12'] = polar(225, 140);

        // Center bridges
        this.coordinates['s17'] = polar(0, 160);
        this.coordinates['s18'] = polar(180, 160);
    }

    private resize() {
        const parent = this.canvas.parentElement;
        if (parent) {
            this.canvas.width = parent.clientWidth;
            this.canvas.height = parent.clientHeight;
        }
        this.render();
    }

    private handleMouseMove(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = 1920 / rect.width;
        const scaleY = 1080 / rect.height;

        // Use the actual CSS scaling or bounding client rect logic
        // We render using a fixed 1920x1080 logical coordinate system, scaled via transform or canvas context
        const logicalX = (e.clientX - rect.left) * scaleX;
        const logicalY = (e.clientY - rect.top) * scaleY;

        let found: string | null = null;
        for (const [id, pos] of Object.entries(this.coordinates)) {
            const dx = logicalX - pos.x;
            const dy = logicalY - pos.y;
            if (dx * dx + dy * dy < 30 * 30) { // 60x60 hit area (r=30)
                found = id;
                break;
            }
        }

        if (this.hoveredNode !== found) {
            this.hoveredNode = found;
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

    public render() {
        // Guard: headless environments (jsdom) return null from getContext('2d')
        if (!this.ctx) return;

        const w = this.canvas.width;
        const h = this.canvas.height;

        // Avoid drawing if zero dimensions
        if (w === 0 || h === 0) return;

        this.ctx.clearRect(0, 0, w, h);

        this.ctx.save();

        // Scale from logical 1920x1080 to actual canvas size
        const scale = Math.min(w / 1920, h / 1080);
        const offsetX = (w - 1920 * scale) / 2;
        const offsetY = (h - 1080 * scale) / 2;

        this.ctx.translate(offsetX, offsetY);
        this.ctx.scale(scale, scale);

        // Draw background elements if any (map texture etc)
        this.ctx.fillStyle = '#111827';
        this.ctx.fillRect(0, 0, 1920, 1080);

        // Draw grid or decorative compass
        this.drawDecorations();

        // Draw connections
        this.ctx.lineWidth = 3;
        const drawnHex = new Set<string>();

        for (const node of Object.values(KNOWN_LANDS.nodes)) {
            const p1 = this.coordinates[node.id];
            if (!p1) continue;

            for (const conn of node.connections) {
                // Prevent drawing same line twice
                const hash = [node.id, conn].sort().join('-');
                if (drawnHex.has(hash)) continue;
                drawnHex.add(hash);

                const p2 = this.coordinates[conn];
                if (!p2) continue;

                this.ctx.beginPath();
                this.ctx.moveTo(p1.x, p1.y);
                this.ctx.lineTo(p2.x, p2.y);
                this.ctx.strokeStyle = '#4b5563'; // Tailwind gray-600
                // Highlight logic
                if (this.hoveredNode === node.id || this.hoveredNode === conn) {
                    this.ctx.strokeStyle = '#9ca3af'; // Tailwind gray-400
                }
                this.ctx.stroke();
            }
        }

        // Draw nodes
        for (const node of Object.values(KNOWN_LANDS.nodes)) {
            this.drawNode(node);
        }

        this.ctx.restore();
    }

    private drawDecorations() {
        if (!this.ctx) return;
        this.ctx.strokeStyle = '#1f2937';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(960, 540, 420, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(960, 540, 260, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(960, 540, 140, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    private drawNode(node: BoardNode) {
        if (!this.ctx) return;
        const pos = this.coordinates[node.id];
        if (!pos) return;

        const isHovered = this.hoveredNode === node.id;
        const isSelected = this.selectedNode === node.id;
        const state = this.boardState?.[node.id];

        this.ctx.save();
        this.ctx.translate(pos.x, pos.y);

        // Base colors
        let fillColor = '#374151'; // standard dark gray
        let strokeColor = '#9ca3af'; // light gray border
        let radius = 16;

        if (node.type === 'forge') {
            fillColor = '#7c2d12'; // orange-900
            strokeColor = '#ea580c'; // orange-600
            radius = 22;
            // Draw a subtle gear/square for forge
            this.ctx.fillStyle = fillColor;
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.rect(-radius, -radius, radius * 2, radius * 2);
            this.ctx.fill();
            this.ctx.stroke();
        } else if (node.type === 'antagonist_base') {
            fillColor = '#4c1d95'; // violet-900
            strokeColor = '#a78bfa'; // violet-400
            radius = 28;
            // Diamond
            this.ctx.beginPath();
            this.ctx.moveTo(0, -radius);
            this.ctx.lineTo(radius, 0);
            this.ctx.lineTo(0, radius);
            this.ctx.lineTo(-radius, 0);
            this.ctx.closePath();
            this.ctx.fillStyle = fillColor;
            this.ctx.fill();
            this.ctx.lineWidth = 3;
            this.ctx.strokeStyle = strokeColor;
            this.ctx.stroke();
        } else if (node.type === 'neutral_center') {
            fillColor = '#064e3b'; // emerald-900
            strokeColor = '#34d399'; // emerald-400
            radius = 24;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
            this.ctx.fillStyle = fillColor;
            this.ctx.fill();
            this.ctx.lineWidth = 3;
            this.ctx.strokeStyle = strokeColor;
            this.ctx.stroke();
        } else {
            // Standard stronghold
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
            this.ctx.fillStyle = fillColor;
            this.ctx.fill();
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = strokeColor;
            this.ctx.stroke();
        }

        const isReachable = this.reachableNodes.includes(node.id);
        const isClaimable = this.claimableNodes.includes(node.id);

        // Selection / Hover / Highlight
        if (isSelected || isHovered || isReachable || isClaimable) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);

            if (isSelected) this.ctx.strokeStyle = '#fcd34d';
            else if (isClaimable) this.ctx.strokeStyle = '#f59e0b';
            else if (isReachable) this.ctx.strokeStyle = '#10b981';
            else this.ctx.strokeStyle = '#fef3c7';

            this.ctx.lineWidth = isSelected || isClaimable || isReachable ? 3 : 1.5;
            if (isSelected || isClaimable) {
                this.ctx.setLineDash([5, 5]);
            }
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        if (this.diplomaticNodes.includes(node.id)) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius + 12, 0, Math.PI * 2);
            this.ctx.strokeStyle = '#3b82f6';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([6, 6]);
            this.ctx.lineDashOffset = -(Date.now() / 50) % 12;
            this.ctx.stroke();
            this.ctx.setLineDash([]);

            this.ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
            this.ctx.fill();
        }

        // Board State Visuals
        if (state) {
            // Claimed Court ID
            if (state.claimedBy !== null) {
                const courtColors = ['#f87171', '#60a5fa', '#34d399', '#fbbf24'];
                this.ctx.fillStyle = courtColors[state.claimedBy] || '#ffffff';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, radius - 6, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Wanderer Toggle
            if (state.hasWanderer) {
                // Draw a small gray cloaked figure / question mark face-down
                this.ctx.fillStyle = '#1e293b';
                this.ctx.beginPath();
                this.ctx.arc(0, -radius - 10, 10, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.strokeStyle = '#94a3b8';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();

                this.ctx.fillStyle = '#94a3b8';
                this.ctx.font = 'bold 12px Inter';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('?', 0, -radius - 10);
            }

            // Antagonist forces
            if (state.antagonistForces && state.antagonistForces.length > 0) {
                this.ctx.fillStyle = '#dc2626'; // red-600
                this.ctx.beginPath();
                this.ctx.arc(radius + 5, 0, 8, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = '10px Inter';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(state.antagonistForces.length.toString(), radius + 5, 0);
            }
        }

        // Label
        this.ctx.fillStyle = '#9ca3af';
        this.ctx.font = '12px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(node.id, 0, radius + 16);

        this.ctx.restore();
    }
}
