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
import { Plus, Search, Box, Frame, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDiagramStore } from "@/lib/store";
import { getAwsIcon } from "@/lib/aws-icon-registry";
import { cn } from "@/lib/utils";

// Define categories and services
const AWS_SERVICES = [
    {
        category: "Diagram Tools",
        items: [
            { name: "Frame/Group", service: "frame", type: "frame" },
            { name: "Sticky Note", service: "note", type: "note" },
        ]
    },
    {
        category: "Client & Devices",
        items: [
            { name: "User", service: "user", type: "client" },
            { name: "Browser", service: "browser", type: "client" },
            { name: "Mobile App", service: "mobile", type: "client" },
            { name: "Client App", service: "client", type: "client" },
            { name: "IoT Device", service: "iot-device", type: "client" },
        ]
    },
    {
        category: "Compute",
        items: [
            { name: "EC2", service: "ec2", type: "aws-compute" },
            { name: "Lambda", service: "lambda", type: "aws-compute" },
            { name: "EKS", service: "eks", type: "aws-compute" },
            { name: "ECS", service: "ecs", type: "aws-compute" },
            { name: "Fargate", service: "fargate", type: "aws-compute" },
            { name: "App Runner", service: "apprunner", type: "aws-compute" },
            { name: "Batch", service: "batch", type: "aws-compute" },
            { name: "Elastic Beanstalk", service: "elasticbeanstalk", type: "aws-compute" },
            { name: "Lightsail", service: "lightsail", type: "aws-compute" },
        ]
    },
    {
        category: "Containers",
        items: [
            { name: "ECR", service: "ecr", type: "aws-containers" },
            { name: "ECS", service: "ecs", type: "aws-containers" },
            { name: "EKS", service: "eks", type: "aws-containers" },
            { name: "Fargate", service: "fargate", type: "aws-containers" },
            { name: "EKS Anywhere", service: "eksanywhere", type: "aws-containers" },
            { name: "ECS Anywhere", service: "ecsanywhere", type: "aws-containers" },
        ]
    },
    {
        category: "Database",
        items: [
            { name: "RDS", service: "rds", type: "aws-database" },
            { name: "DynamoDB", service: "dynamodb", type: "aws-database" },
            { name: "ElastiCache", service: "elasticache", type: "aws-database" },
            { name: "Aurora", service: "rds", type: "aws-database" },
            { name: "Neptune", service: "neptune", type: "aws-database" },
            { name: "DocumentDB", service: "documentdb", type: "aws-database" },
            { name: "Timestream", service: "timestream", type: "aws-database" },
            { name: "Keyspaces", service: "keyspaces", type: "aws-database" },
            { name: "MemoryDB", service: "memorydb", type: "aws-database" },
            { name: "QLDB", service: "qldb", type: "aws-database" },
        ]
    },
    {
        category: "Storage",
        items: [
            { name: "S3", service: "s3", type: "aws-storage" },
            { name: "EFS", service: "efs", type: "aws-storage" },
            { name: "EBS", service: "ebs", type: "aws-storage" },
            { name: "Glacier", service: "glacier", type: "aws-storage" },
            { name: "FSx", service: "fsx", type: "aws-storage" },
            { name: "Backup", service: "backup", type: "aws-storage" },
            { name: "Storage Gateway", service: "storagegateway", type: "aws-storage" },
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
        category: "AI & Machine Learning",
        items: [
            { name: "Bedrock", service: "bedrock", type: "aws-ai" },
            { name: "SageMaker", service: "sagemaker", type: "aws-ai" },
            { name: "Rekognition", service: "rekognition", type: "aws-ai" },
            { name: "Comprehend", service: "comprehend", type: "aws-ai" },
            { name: "Textract", service: "textract", type: "aws-ai" },
            { name: "Translate", service: "translate", type: "aws-ai" },
            { name: "Transcribe", service: "transcribe", type: "aws-ai" },
            { name: "Polly", service: "polly", type: "aws-ai" },
            { name: "Lex", service: "lex", type: "aws-ai" },
            { name: "Personalize", service: "personalize", type: "aws-ai" },
            { name: "Forecast", service: "forecast", type: "aws-ai" },
            { name: "Kendra", service: "kendra", type: "aws-ai" },
        ]
    },
    {
        category: "Application Integration",
        items: [
            { name: "SQS", service: "sqs", type: "aws-integration" },
            { name: "SNS", service: "sns", type: "aws-integration" },
            { name: "Step Functions", service: "stepfunctions", type: "aws-integration" },
            { name: "EventBridge", service: "eventbridge", type: "aws-integration" },
            { name: "AppSync", service: "appsync", type: "aws-integration" },
            { name: "MQ", service: "mq", type: "aws-integration" },
        ]
    },
    {
        category: "Security",
        items: [
            { name: "IAM", service: "iam", type: "aws-security" },
            { name: "Cognito", service: "cognito", type: "aws-security" },
            { name: "Secrets Manager", service: "secretsmanager", type: "aws-security" },
            { name: "KMS", service: "kms", type: "aws-security" },
            { name: "WAF", service: "waf", type: "aws-security" },
            { name: "GuardDuty", service: "guardduty", type: "aws-security" },
            { name: "Inspector", service: "inspector", type: "aws-security" },
            { name: "Macie", service: "macie", type: "aws-security" },
            { name: "Security Hub", service: "securityhub", type: "aws-security" },
            { name: "Certificate Manager", service: "certificatemanager", type: "aws-security" },
            { name: "CloudHSM", service: "cloudhsm", type: "aws-security" },
            { name: "Shield", service: "shield", type: "aws-security" },
        ]
    },
    {
        category: "Developer Tools",
        items: [
            { name: "CodePipeline", service: "codepipeline", type: "aws-devtools" },
            { name: "CodeBuild", service: "codebuild", type: "aws-devtools" },
            { name: "CodeDeploy", service: "codedeploy", type: "aws-devtools" },
            { name: "CodeCommit", service: "codecommit", type: "aws-devtools" },
            { name: "CodeArtifact", service: "codeartifact", type: "aws-devtools" },
            { name: "Cloud9", service: "cloud9", type: "aws-devtools" },
            { name: "X-Ray", service: "xray", type: "aws-devtools" },
        ]
    },
    {
        category: "Management & Governance",
        items: [
            { name: "CloudWatch", service: "cloudwatch", type: "aws-management" },
            { name: "CloudFormation", service: "cloudformation", type: "aws-management" },
            { name: "Systems Manager", service: "systemsmanager", type: "aws-management" },
            { name: "Config", service: "config", type: "aws-management" },
            { name: "CloudTrail", service: "cloudtrail", type: "aws-management" },
            { name: "Organizations", service: "organizations", type: "aws-management" },
            { name: "Control Tower", service: "controltower", type: "aws-management" },
            { name: "Service Catalog", service: "servicecatalog", type: "aws-management" },
            { name: "Trusted Advisor", service: "trustedadvisor", type: "aws-management" },
        ]
    },
    {
        category: "Analytics",
        items: [
            { name: "Kinesis", service: "kinesis", type: "aws-analytics" },
            { name: "Glue", service: "glue", type: "aws-analytics" },
            { name: "Athena", service: "athena", type: "aws-analytics" },
            { name: "EMR", service: "emr", type: "aws-analytics" },
            { name: "Redshift", service: "redshift", type: "aws-analytics" },
            { name: "QuickSight", service: "quicksight", type: "aws-analytics" },
            { name: "OpenSearch", service: "opensearch", type: "aws-analytics" },
            { name: "MSK", service: "msk", type: "aws-analytics" },
        ]
    },
    {
        category: "Migration & Transfer",
        items: [
            { name: "Database Migration Service", service: "dms", type: "aws-migration" },
            { name: "DataSync", service: "datasync", type: "aws-migration" },
            { name: "Transfer Family", service: "transferfamily", type: "aws-migration" },
            { name: "Migration Hub", service: "migrationhub", type: "aws-migration" },
        ]
    },
];

interface ComponentPaletteProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function ComponentPalette({ isOpen, onOpenChange }: ComponentPaletteProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const addNode = useDiagramStore((state) => state.addNode);

    const filteredServices = AWS_SERVICES.map(category => ({
        // ... same filtering logic ...
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
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="w-[400px] sm:w-[500px] flex flex-col p-0 ml-20 my-4 h-[calc(100vh-32px)] rounded-2xl shadow-2xl border-border bg-background/95 backdrop-blur-xl">
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
                                        // Use custom icons for diagram tools
                                        let Icon;
                                        if (item.type === 'frame') {
                                            Icon = Frame;
                                        } else if (item.type === 'annotation') {
                                            Icon = MessageSquare;
                                        } else if (item.type === 'note') {
                                            Icon = MessageSquare;
                                        } else {
                                            Icon = getAwsIcon(item.service, item.type);
                                        }

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
