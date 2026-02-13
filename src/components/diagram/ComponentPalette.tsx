'use client';

import React, { useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Search, Box } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDiagramStore } from "@/lib/store";
import { getAwsIcon } from "@/lib/aws-icon-registry";
import { cn } from "@/lib/utils";

// Define categories and services
const AWS_SERVICES = [
    {
        category: "Compute",
        items: [
            { name: "EC2", service: "ec2", type: "aws-compute" },
            { name: "Lambda", service: "lambda", type: "aws-compute" },
            { name: "EKS", service: "eks", type: "aws-compute" },
            { name: "ECS", service: "ecs", type: "aws-compute" },
            { name: "App Runner", service: "apprunner", type: "aws-compute" },
        ]
    },
    {
        category: "Database",
        items: [
            { name: "RDS", service: "rds", type: "aws-database" },
            { name: "DynamoDB", service: "dynamodb", type: "aws-database" },
            { name: "ElastiCache", service: "elasticache", type: "aws-database" },
            { name: "Aurora", service: "rds", type: "aws-database" },
        ]
    },
    {
        category: "Storage",
        items: [
            { name: "S3", service: "s3", type: "aws-storage" },
            { name: "EFS", service: "efs", type: "aws-storage" },
            { name: "EBS", service: "ebs", type: "aws-storage" },
            { name: "Glacier", service: "s3-glacier", type: "aws-storage" },
        ]
    },
    {
        category: "Networking",
        items: [
            { name: "VPC", service: "vpc", type: "aws-network" },
            { name: "CloudFront", service: "cloudfront", type: "aws-network" },
            { name: "Route 53", service: "route53", type: "aws-network" },
            { name: "API Gateway", service: "apigateway", type: "aws-network" },
            { name: "ELB", service: "elb", type: "aws-network" },
        ]
    },
    {
        category: "Security",
        items: [
            { name: "IAM", service: "iam", type: "aws-security" },
            { name: "KMS", service: "kms", type: "aws-security" },
            { name: "WAF", service: "waf", type: "aws-security" },
        ]
    },
    {
        category: "Management",
        items: [
            { name: "CloudWatch", service: "cloudwatch", type: "aws-management" },
            { name: "CloudFormation", service: "cloudformation", type: "aws-management" },
        ]
    },
    {
        category: "Analytics",
        items: [
            { name: "Kinesis", service: "kinesis", type: "aws-analytics" },
        ]
    },
];

export default function ComponentPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const addNode = useDiagramStore((state) => state.addNode);

    const filteredServices = AWS_SERVICES.map(category => ({
        ...category,
        items: category.items.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.service.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(category => category.items.length > 0);

    const handleAddNode = (item: any) => {
        const id = crypto.randomUUID();
        const newNode = {
            id,
            type: item.type,
            position: { x: 100 + Math.random() * 50, y: 100 + Math.random() * 50 }, // Random offset to avoid perfect overlap
            data: {
                label: item.name,
                service: item.service,
                type: item.type,
            },
        };
        addNode(newNode);
        // Optional: Close palette after adding? Maybe keep open for multiple adds.
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="default"
                    size="icon"
                    className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                    title="Add AWS Component"
                >
                    <Plus className="h-6 w-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col p-0">
                <SheetHeader className="p-6 pb-2 border-b">
                    <SheetTitle className="flex items-center gap-2">
                        <Box className="w-5 h-5 text-primary" />
                        Component Library
                    </SheetTitle>
                    <SheetDescription>
                        Browse and add AWS components to your architecture.
                    </SheetDescription>
                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search services (e.g., EC2, S3)..."
                            className="pl-9 bg-secondary/50 border-0 focus-visible:ring-1"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1 p-6 pt-2">
                    <div className="space-y-6">
                        {filteredServices.map((category) => (
                            <div key={category.category} className="space-y-3">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                    {category.category}
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {category.items.map((item) => {
                                        const Icon = getAwsIcon(item.service, item.type);
                                        return (
                                            <button
                                                key={`${item.service}-${item.name}`}
                                                onClick={() => handleAddNode(item)}
                                                className="flex flex-col items-center justify-center p-3 h-24 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/50 hover:shadow-sm transition-all text-center group"
                                            >
                                                <div className="p-2 rounded-full bg-muted group-hover:bg-background transition-colors mb-2">
                                                    <Icon className="w-8 h-8" />
                                                </div>
                                                <span className="text-xs font-medium truncate w-full px-1">
                                                    {item.name}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {filteredServices.length === 0 && (
                            <div className="text-center py-10 text-muted-foreground">
                                <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <p>No components found matching "{searchQuery}"</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
