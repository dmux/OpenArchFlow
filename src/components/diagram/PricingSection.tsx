import React, { useEffect, useState, useCallback } from 'react';
import { useDiagramStore, AppNode } from '@/lib/store';
import { DollarSign, Loader2, AlertCircle, Globe, Zap } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SERVICE_CODE_MAP, COMMON_ATTRIBUTES, ATTRIBUTE_LABELS, ATTRIBUTE_OPTIONS, REGION_MAPPING, USAGE_FIELDS } from '@/lib/providers/aws/pricing-map';

interface PricingSectionProps {
    node: AppNode;
}

export default function PricingSection({ node }: PricingSectionProps) {
    const { updateNode } = useDiagramStore();
    const { service, metadata, pricing } = node.data;
    const serviceCode = SERVICE_CODE_MAP[service?.toLowerCase()] || null;
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const region = metadata?.region || 'us-east-1';
    const attributes = metadata?.pricingAttributes || {};
    const usageConfig = USAGE_FIELDS[serviceCode || ''] || { key: 'quantity', label: 'Quantity', unit: 'units', defaultValue: 1 };
    const quantity = metadata?.usageQuantity ?? usageConfig.defaultValue;

    const fetchPrice = useCallback(async (currentRegion: string, currentAttrs: any, currentQuantity: number) => {
        if (!serviceCode) return;
        
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/pricing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serviceCode,
                    region: currentRegion,
                    attributes: currentAttrs
                })
            });

            const data = await response.json();

            if (response.ok) {
                const rate = data.pricePerUnit;
                const unit = data.unit;
                
                let monthlyCost = 0;
                if (unit === 'Hrs') {
                    monthlyCost = rate * 730 * currentQuantity;
                } else if (unit === 'GB-Mo') {
                    monthlyCost = rate * currentQuantity;
                } else if (unit === 'Request' || unit === 'Requests') {
                    // Assume quantity for requests is in millions if it's a large number, 
                    // or just direct if usageConfig says so.
                    monthlyCost = rate * currentQuantity;
                } else {
                    // Fallback
                    monthlyCost = rate * currentQuantity;
                }

                updateNode(node.id, {
                    pricing: {
                        rate,
                        unit,
                        hourlyCost: unit === 'Hrs' ? rate : undefined,
                        monthlyCost,
                        quantity: currentQuantity,
                        currency: data.currency,
                        lastUpdated: Date.now()
                    }
                });
            } else {
                setError(data.error || "Price not found");
                updateNode(node.id, { pricing: { ...pricing, error: data.error, loading: false } });
            }
        } catch (err) {
            setError("Network error");
        } finally {
            setLoading(false);
        }
    }, [node.id, serviceCode, updateNode, pricing]);

    // Debounce effect
    useEffect(() => {
        if (!serviceCode) return;

        const timer = setTimeout(() => {
            fetchPrice(region, attributes, quantity);
        }, 800);

        return () => clearTimeout(timer);
    }, [region, JSON.stringify(attributes), quantity, serviceCode]);

    if (!serviceCode) return null;

    const availableAttributes = COMMON_ATTRIBUTES[serviceCode] || [];

    return (
        <div className="space-y-4 border rounded-lg p-3 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <DollarSign size={14} /> Cost Estimate (AWS)
                </h3>
                {loading && <Loader2 size={14} className="animate-spin text-primary" />}
            </div>

            <div className="grid gap-3">
                {/* Region Selector */}
                <div>
                    <Label className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                        <Globe size={10} /> Region
                    </Label>
                    <select
                        value={region}
                        onChange={(e) => {
                            updateNode(node.id, {
                                metadata: { ...metadata, region: e.target.value }
                            });
                        }}
                        className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 mt-1"
                    >
                        {Object.keys(REGION_MAPPING).map(r => (
                            <option key={r} value={r}>{REGION_MAPPING[r]}</option>
                        ))}
                    </select>
                </div>

                {/* Attributes Selectors */}
                {availableAttributes.map(attr => (
                    <div key={attr}>
                        <Label className="text-[10px] uppercase text-muted-foreground">
                            {ATTRIBUTE_LABELS[attr] || attr}
                        </Label>
                        {ATTRIBUTE_OPTIONS[attr] ? (
                            <select
                                value={attributes[attr] || ''}
                                onChange={(e) => {
                                    updateNode(node.id, {
                                        metadata: {
                                            ...metadata,
                                            pricingAttributes: { ...attributes, [attr]: e.target.value }
                                        }
                                    });
                                }}
                                className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 mt-1"
                            >
                                <option value="">Select...</option>
                                {ATTRIBUTE_OPTIONS[attr].map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        ) : (
                            <Input
                                value={attributes[attr] || ''}
                                onChange={(e) => {
                                    updateNode(node.id, {
                                        metadata: {
                                            ...metadata,
                                            pricingAttributes: { ...attributes, [attr]: e.target.value }
                                        }
                                    });
                                }}
                                className="h-8 text-xs mt-1"
                                placeholder={`e.g.: ${attr === 'instanceType' ? 't3.micro' : 'value'}`}
                            />
                        )}
                    </div>
                ))}

                {/* Usage / Quantity Multiplier */}
                <div className="pt-2 border-t border-primary/10">
                    <Label className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                        <Zap size={10} /> {usageConfig.label} ({usageConfig.unit})
                    </Label>
                    <div className="flex gap-2 items-center mt-1">
                        <Input
                            type="number"
                            value={quantity}
                            onChange={(e) => {
                                updateNode(node.id, {
                                    metadata: { ...metadata, usageQuantity: parseFloat(e.target.value) || 0 }
                                });
                            }}
                            className="h-8 text-xs w-24"
                        />
                        <span className="text-[10px] text-muted-foreground italic">
                            {pricing?.unit === 'Hrs' ? 'x 730 hrs/mo' : `per ${pricing?.unit || 'unit'}`}
                        </span>
                    </div>
                </div>
            </div>

            {/* Price Display */}
            <div className="mt-2 pt-2 border-t border-primary/10">
                {error ? (
                    <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
                        <AlertCircle size={14} />
                        <span>{error}</span>
                    </div>
                ) : pricing?.rate !== undefined ? (
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs text-muted-foreground">Unit Rate:</span>
                            <span className="text-sm font-bold text-primary">
                                {pricing.currency} {pricing.rate.toFixed(4)} <span className="text-[10px] font-normal">/{pricing.unit}</span>
                            </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs text-muted-foreground">Monthly Estimate:</span>
                            <span className="text-lg font-bold text-primary">
                                {pricing.currency} {pricing.monthlyCost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="text-[10px] text-muted-foreground italic text-center py-2">
                        Configure properties to estimate cost.
                    </div>
                )}
            </div>
        </div>
    );
}
