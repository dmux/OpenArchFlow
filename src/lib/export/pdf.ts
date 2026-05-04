import { getNodesBounds, getViewportForBounds } from 'reactflow';
import type { Node } from 'reactflow';
import html2canvas from 'html2canvas';

const PADDING = 50;

export async function exportPdf(nodes: Node[]): Promise<void> {
    if (nodes.length === 0) throw new Error('No nodes to export');

    const viewportEl = document.querySelector('.react-flow__viewport') as HTMLElement | null;
    if (!viewportEl) throw new Error('Could not find diagram viewport');

    const bounds = getNodesBounds(nodes);
    const imageWidth = bounds.width + PADDING * 2;
    const imageHeight = bounds.height + PADDING * 2;

    const viewport = getViewportForBounds(bounds, imageWidth, imageHeight, 0.5, 2, PADDING);

    const canvas = await html2canvas(viewportEl, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        width: imageWidth,
        height: imageHeight,
        onclone: (clonedDoc) => {
            const cloned = clonedDoc.querySelector('.react-flow__viewport') as HTMLElement;
            if (cloned) {
                const offsetX = PADDING - bounds.x * viewport.zoom;
                const offsetY = PADDING - bounds.y * viewport.zoom;
                cloned.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${viewport.zoom})`;
            }
        },
        ignoreElements: (el) =>
            el.classList?.contains('react-flow__minimap') ||
            el.classList?.contains('react-flow__controls') ||
            el.classList?.contains('react-flow__attribution') ||
            el.classList?.contains('react-flow__panel'),
    });

    const { jsPDF } = await import('jspdf');
    const orientation = imageWidth > imageHeight ? 'landscape' : 'portrait';
    const pdf = new jsPDF({ orientation, unit: 'px', format: [imageWidth, imageHeight] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imageWidth, imageHeight);
    pdf.save('architecture-diagram.pdf');
}
