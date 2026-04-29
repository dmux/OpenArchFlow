import React from 'react';
import { useDiagramStore } from '@/lib/store';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DollarSign, FileText, Download, Trash2, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BillOfMaterialsProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function BillOfMaterials({ open, onOpenChange }: BillOfMaterialsProps) {
    const { diagrams, activeDiagramId } = useDiagramStore();

    if (!activeDiagramId || !diagrams[activeDiagramId]) return null;

    const activeDiagram = diagrams[activeDiagramId];
    const nodes = activeDiagram.nodes;
    
    // Filter nodes that have pricing information
    const pricingNodes = nodes.filter(node => node.data.pricing && node.data.pricing.monthlyCost !== undefined);
    const totalMonthlyCost = pricingNodes.reduce((sum, node) => sum + (node.data.pricing?.monthlyCost || 0), 0);
    const currency = pricingNodes[0]?.data.pricing?.currency || 'USD';

    const handleExportCSV = () => {
        const headers = ['Resource', 'Service', 'Unit Rate', 'Unit', 'Quantity', 'Monthly Cost'];
        const rows = pricingNodes.map(node => [
            node.data.label,
            node.data.service,
            node.data.pricing?.rate,
            node.data.pricing?.unit,
            node.data.pricing?.quantity,
            node.data.pricing?.monthlyCost?.toFixed(2)
        ]);
        
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `BOM-${activeDiagram.name.replace(/\s+/g, '-')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl w-full flex flex-col p-0">
                <SheetHeader className="p-6 pb-2">
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <FileText size={20} />
                        <SheetTitle className="text-2xl">Bill of Materials</SheetTitle>
                    </div>
                    <SheetDescription>
                        Consolidated monthly cost estimate for <strong>{activeDiagram.name}</strong>.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Summary Card */}
                    <div className="px-6 py-4">
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                            <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-1">Total Estimated Monthly Cost</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-medium text-primary/60">{currency}</span>
                                <span className="text-5xl font-black text-primary">
                                    {totalMonthlyCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <Button variant="outline" size="sm" className="gap-2 h-8" onClick={handleExportCSV}>
                                    <Download size={14} /> Export CSV
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <ScrollArea className="flex-1 px-6">
                        <div className="py-4 space-y-6">
                            {pricingNodes.length === 0 ? (
                                <div className="text-center py-20">
                                    <DollarSign size={48} className="mx-auto text-muted-foreground/20 mb-4" />
                                    <p className="text-muted-foreground italic">No priced resources found in this diagram.</p>
                                    <p className="text-xs text-muted-foreground mt-2">Add AWS components and configure their pricing properties to see them here.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resource Breakdown</h4>
                                    {pricingNodes.map((node) => (
                                        <div key={node.id} className="flex flex-col gap-2 p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors group">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-bold text-card-foreground group-hover:text-primary transition-colors">{node.data.label}</div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                        {node.data.service} • {node.data.pricing?.unit === 'Hrs' ? 'Compute' : 'Usage'}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-foreground">
                                                        {currency} {node.data.pricing?.monthlyCost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground">monthly</div>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-border/50 text-[10px]">
                                                <div>
                                                    <span className="text-muted-foreground block">Rate</span>
                                                    <span className="font-medium">{currency} {node.data.pricing?.rate?.toFixed(4)}/{node.data.pricing?.unit}</span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground block">Quantity/Usage</span>
                                                    <span className="font-medium">{node.data.pricing?.quantity} {node.data.pricing?.unit === 'Hrs' ? 'unit(s)' : node.data.pricing?.unit}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-muted-foreground block">Region</span>
                                                    <span className="font-medium">{(node.data.metadata?.region as string) || 'us-east-1'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    
                    <div className="p-6 bg-muted/30 border-t border-border mt-auto">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <PieChart size={14} />
                            <span>Prices are estimates based on AWS On-Demand rates and may vary.</span>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
