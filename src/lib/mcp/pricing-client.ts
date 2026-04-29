import { PricingClient, GetProductsCommand, FilterType } from "@aws-sdk/client-pricing";
import { REGION_MAPPING } from "../providers/aws/pricing-map";

export interface PricingRequest {
    serviceCode: string;
    region: string;
    attributes: Record<string, string>;
}

export interface PricingResult {
    pricePerUnit: number;
    currency: string;
    unit: string;
    description: string;
}

export class AWSPricingProvider {
    private static instance: AWSPricingProvider;
    private client!: PricingClient;

    private constructor() {
        this.initializeClient();
    }

    private initializeClient() {
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();

        this.client = new PricingClient({ 
            region: "us-east-1",
            credentials: {
                accessKeyId: accessKeyId || 'dummy',
                secretAccessKey: secretAccessKey || 'dummy',
            },
            endpoint: "https://api.pricing.us-east-1.amazonaws.com"
        });
    }

    public static getInstance(): AWSPricingProvider {
        if (!AWSPricingProvider.instance) {
            AWSPricingProvider.instance = new AWSPricingProvider();
        }
        return AWSPricingProvider.instance;
    }

    public async getPrice(request: PricingRequest): Promise<PricingResult | null> {
        if (!process.env.AWS_ACCESS_KEY_ID) {
            console.error("AWSPricingProvider: No AWS_ACCESS_KEY_ID found in environment");
            return null;
        }

        try {
            const location = REGION_MAPPING[request.region] || request.region;
            
            const filters = [
                { Field: "location", Type: FilterType.TERM_MATCH, Value: location },
                ...Object.entries(request.attributes).map(([key, value]) => ({
                    Field: key,
                    Type: FilterType.TERM_MATCH,
                    Value: value
                }))
            ];

            // Add service-specific defaults if missing to improve match rate
            if (request.serviceCode === 'AmazonS3' && !request.attributes.storageClass) {
                filters.push({ Field: "storageClass", Type: FilterType.TERM_MATCH, Value: "General Purpose" });
            }
            if (request.serviceCode === 'AmazonEC2' && !request.attributes.tenancy) {
                filters.push({ Field: "tenancy", Type: FilterType.TERM_MATCH, Value: "Shared" });
            }

            const command = new GetProductsCommand({
                ServiceCode: request.serviceCode,
                Filters: filters,
                FormatVersion: "aws_v1",
                MaxResults: 1
            });

            const response = await this.client.send(command);

            if (!response.PriceList || response.PriceList.length === 0) {
                console.warn(`No pricing found for ${request.serviceCode} with filters`, filters);
                return null;
            }

            const priceItem = JSON.parse(response.PriceList[0] as string);
            
            // Extract description
            const description = priceItem.product?.attributes?.description || 
                              `${priceItem.product?.attributes?.servicecode} ${priceItem.product?.attributes?.usageType}`;

            const onDemand = priceItem.terms?.OnDemand;
            if (!onDemand) return null;

            const firstOffer = Object.values(onDemand)[0] as any;
            const priceDimensions = firstOffer.priceDimensions;
            const dimension = Object.values(priceDimensions)[0] as any;

            const pricePerUnit = dimension.pricePerUnit;
            const currency = Object.keys(pricePerUnit)[0];
            const amount = parseFloat(pricePerUnit[currency]);

            return {
                pricePerUnit: amount,
                currency: currency,
                unit: dimension.unit,
                description: description
            };

        } catch (error) {
            console.error("Error fetching AWS price:", error);
            return null;
        }
    }
}
