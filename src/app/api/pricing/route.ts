import { NextRequest, NextResponse } from 'next/server';
import { AWSPricingProvider } from '@/lib/mcp/pricing-client';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { serviceCode, region, attributes } = body;

        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

        if (!accessKeyId || !secretAccessKey || accessKeyId === 'test') {
            return NextResponse.json({ 
                error: "AWS credentials not configured correctly. Current Key ID starts with: " + (accessKeyId?.substring(0, 4) || "none")
            }, { status: 500 });
        }

        if (!serviceCode || !region) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const pricingProvider = AWSPricingProvider.getInstance();
        const result = await pricingProvider.getPrice({
            serviceCode,
            region,
            attributes: attributes || {}
        });

        if (!result) {
            return NextResponse.json({ error: "Price not found" }, { status: 404 });
        }

        return NextResponse.json({
            pricePerUnit: result.pricePerUnit,
            currency: result.currency,
            unit: result.unit,
            description: result.description
        });

    } catch (error) {
        console.error("API Error in /api/pricing:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
