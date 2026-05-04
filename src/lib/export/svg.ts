import { getNodesBounds, getViewportForBounds } from 'reactflow';
import type { Node } from 'reactflow';

const PADDING = 50;

export async function exportSvg(nodes: Node[]): Promise<void> {
    if (nodes.length === 0) throw new Error('No nodes to export');

    const viewportEl = document.querySelector('.react-flow__viewport') as HTMLElement | null;
    if (!viewportEl) throw new Error('Could not find diagram viewport');

    const bounds = getNodesBounds(nodes);
    const width = bounds.width + PADDING * 2;
    const height = bounds.height + PADDING * 2;

    const viewport = getViewportForBounds(bounds, width, height, 0.5, 2, PADDING);

    // Clone the viewport DOM and apply the correct transform
    const clone = viewportEl.cloneNode(true) as HTMLElement;
    clone.style.transform = `translate(${PADDING - bounds.x * viewport.zoom}px, ${PADDING - bounds.y * viewport.zoom}px) scale(${viewport.zoom})`;
    clone.style.transformOrigin = '0 0';

    // Remove non-content panels
    clone.querySelectorAll(
        '.react-flow__minimap, .react-flow__controls, .react-flow__attribution, .react-flow__panel'
    ).forEach((el) => el.remove());

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('xmlns', svgNS);
    svg.setAttribute('xmlns:xhtml', 'http://www.w3.org/1999/xhtml');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Embed styles
    const styleEl = document.createElementNS(svgNS, 'style');
    const sheets = Array.from(document.styleSheets);
    let cssText = '';
    for (const sheet of sheets) {
        try {
            cssText += Array.from(sheet.cssRules).map((r) => r.cssText).join('\n');
        } catch {
            // Cross-origin stylesheet — skip
        }
    }
    styleEl.textContent = cssText;
    svg.appendChild(styleEl);

    // Embed the ReactFlow SVG edges directly
    const rfSvg = viewportEl.querySelector('svg.react-flow__edges') as SVGElement | null;
    if (rfSvg) {
        const edgeSvg = document.createElementNS(svgNS, 'svg');
        edgeSvg.setAttribute('x', String(PADDING - bounds.x * viewport.zoom));
        edgeSvg.setAttribute('y', String(PADDING - bounds.y * viewport.zoom));
        edgeSvg.setAttribute('width', String(bounds.width * viewport.zoom + PADDING * 2));
        edgeSvg.setAttribute('height', String(bounds.height * viewport.zoom + PADDING * 2));
        const edgeClone = rfSvg.cloneNode(true) as SVGElement;
        edgeClone.style.transform = `scale(${viewport.zoom})`;
        edgeClone.style.transformOrigin = '0 0';
        edgeSvg.appendChild(edgeClone);
        svg.appendChild(edgeSvg);
    }

    // Embed nodes as foreignObject
    const fo = document.createElementNS(svgNS, 'foreignObject');
    fo.setAttribute('width', String(width));
    fo.setAttribute('height', String(height));

    const div = document.createElementNS('http://www.w3.org/1999/xhtml', 'div') as HTMLElement;
    div.style.cssText = `width:${width}px;height:${height}px;position:relative;overflow:hidden;`;
    div.appendChild(clone);
    fo.appendChild(div);
    svg.appendChild(fo);

    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'architecture-diagram.svg';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
}
