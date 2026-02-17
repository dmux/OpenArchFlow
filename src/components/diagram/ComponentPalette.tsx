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
            { name: "Frame/Group", service: "frame", type: "frame", description: "Groups multiple components together visually." },
            { name: "Sticky Note", service: "note", type: "note", description: "Add text notes or annotations to your diagram." },
        ]
    },
    {
        category: "Client & Devices",
        items: [
            { name: "User", service: "user", type: "client", description: "Represents an end user interacting with the system." },
            { name: "Browser", service: "browser", type: "client", description: "Web browser client for accessing applications." },
            { name: "Mobile App", service: "mobile", type: "client", description: "Native or hybrid mobile application." },
            { name: "Client App", service: "client", type: "client", description: "General purpose client application or software." },
            { name: "IoT Device", service: "iot-device", type: "client", description: "Internet of Things device or sensor." },
        ]
    },
    {
        category: "Compute",
        items: [
            { name: "EC2", service: "ec2", type: "aws-compute", description: "Secure and resizable compute capacity in the cloud." },
            { name: "Lambda", service: "lambda", type: "aws-compute", description: "Run code without thinking about servers. Pay only for the compute time you consume." },
            { name: "EKS", service: "eks", type: "aws-compute", description: "Managed Kubernetes service to run Kubernetes on AWS." },
            { name: "ECS", service: "ecs", type: "aws-compute", description: "Highly secure, reliable, and scalable way to run containers." },
            { name: "Fargate", service: "fargate", type: "aws-compute", description: "Serverless compute for containers. Works with both ECS and EKS." },
            { name: "App Runner", service: "apprunner", type: "aws-compute", description: "Fully managed service that makes it easy for developers to quickly deploy containerized web applications." },
            { name: "Batch", service: "batch", description: "Fully managed batch processing at any scale." },
            { name: "Elastic Beanstalk", service: "elasticbeanstalk", description: "Easy-to-use service for deploying and scaling web applications and services." },
            { name: "Lightsail", service: "lightsail", description: "Easy-to-use virtual private server (VPS) instances, containers, storage, and more." },
        ]
    },
    {
        category: "Containers",
        items: [
            { name: "ECR", service: "ecr", type: "aws-containers", description: "Fully managed container registry that makes it easy to store, manage, share, and deploy container images." },
            { name: "ECS", service: "ecs", type: "aws-containers", description: "Highly secure, reliable, and scalable way to run containers." },
            { name: "EKS", service: "eks", type: "aws-containers", description: "Managed Kubernetes service to run Kubernetes on AWS." },
            { name: "Fargate", service: "fargate", type: "aws-containers", description: "Serverless compute for containers. Works with both ECS and EKS." },
            { name: "EKS Anywhere", service: "eksanywhere", description: "Create and operate Kubernetes clusters on your own infrastructure." },
            { name: "ECS Anywhere", service: "ecsanywhere", description: "Run and manage container workloads on-premises using the same APIs as ECS." },
        ]
    },
    {
        category: "Database",
        items: [
            { name: "RDS", service: "rds", type: "aws-database", description: "Managed Relational Database Service for MySQL, PostgreSQL, SQL Server, etc." },
            { name: "DynamoDB", service: "dynamodb", type: "aws-database", description: "Fast, flexible NoSQL database service for single-digit millisecond performance at any scale." },
            { name: "ElastiCache", service: "elasticache", type: "aws-database", description: "In-memory data store and cache service, supporting Redis and Memcached." },
            { name: "Aurora", service: "rds", type: "aws-database", description: "MySQL and PostgreSQL-compatible relational database built for the cloud." },
            { name: "Neptune", service: "neptune", type: "aws-database", description: "Fast, reliable, fully managed graph database service." },
            { name: "DocumentDB", service: "documentdb", type: "aws-database", description: "Fast, scalable, highly available, and fully managed MongoDB-compatible database service." },
            { name: "Timestream", service: "timestream", description: "Fast, scalable, and serverless time series database service." },
            { name: "Keyspaces", service: "keyspaces", description: "Scalable, highly available, and managed Apache Cassandra-compatible database service." },
            { name: "MemoryDB", service: "memorydb", description: "Redis-compatible, durable, in-memory database service." },
            { name: "QLDB", service: "qldb", description: "Fully managed ledger database that provides a transparent, immutable, and cryptographically verifiable transaction log." },
        ]
    },
    {
        category: "Storage",
        items: [
            { name: "S3", service: "s3", type: "aws-storage", description: "Object storage built to retrieve any amount of data from anywhere." },
            { name: "EFS", service: "efs", type: "aws-storage", description: "Scalable, fully managed elastic NFS file system." },
            { name: "EBS", service: "ebs", type: "aws-storage", description: "Easy to use, high performance block storage at any scale." },
            { name: "Glacier", service: "glacier", type: "aws-storage", description: "Long-term, secure, durable S3 storage classes for data archiving." },
            { name: "FSx", service: "fsx", description: "Fully managed file systems for Windows File Server, Lustre, NetApp ONTAP, and OpenZFS." },
            { name: "Backup", service: "backup", description: "Fully managed backup service that makes it easy to centralize and automate data protection." },
            { name: "Storage Gateway", service: "storagegateway", description: "Hybrid cloud storage service that provides on-premises access to virtually unlimited cloud storage." },
        ]
    },
    {
        category: "Networking",
        items: [
            { name: "VPC", service: "vpc", type: "aws-network", description: "Provision a logically isolated section of the AWS Cloud." },
            { name: "CloudFront", service: "cloudfront", type: "aws-network", description: "Fast, highly secure and programmable content delivery network (CDN)." },
            { name: "Route 53", service: "route53", type: "aws-network", description: "Highly available and scalable cloud Domain Name System (DNS) web service." },
            { name: "API Gateway", service: "apigateway", type: "aws-network", description: "Fully managed service that makes it easy for developers to create, publish, maintain, monitor, and secure APIs." },
            { name: "ELB", service: "elb", type: "aws-network", description: "Automatically distributes incoming application traffic across multiple targets." },
        ]
    },
    {
        category: "AI & Machine Learning",
        items: [
            { name: "Bedrock", service: "bedrock", type: "aws-ai", description: "The easiest way to build and scale generative AI applications with foundation models." },
            { name: "SageMaker", service: "sagemaker", type: "aws-ai", description: "Build, train, and deploy machine learning models for any use case." },
            { name: "Rekognition", service: "rekognition", type: "aws-ai", description: "Automate your image and video analysis with machine learning." },
            { name: "Comprehend", service: "comprehend", type: "aws-ai", description: "Derive and understand insights and relationships in text." },
            { name: "Textract", service: "textract", type: "aws-ai", description: "Automatically extract printed text, handwriting, and data from any document." },
            { name: "Translate", service: "translate", description: "Fluent and accurate neural machine translation." },
            { name: "Transcribe", service: "transcribe", description: "Automatic speech recognition (ASR) service that makes it easy for developers to add speech-to-text capability." },
            { name: "Polly", service: "polly", description: "Turn text into lifelike speech." },
            { name: "Lex", service: "lex", description: "Build chatbots and conversational interfaces." },
            { name: "Personalize", service: "personalize", description: "Create real-time personalized recommendations." },
            { name: "Forecast", service: "forecast", description: "Build accurate forecasting models based on machine learning." },
            { name: "Kendra", service: "kendra", description: "Highly accurate and easy-to-use enterprise search service powered by machine learning." },
        ]
    },
    {
        category: "Application Integration",
        items: [
            { name: "SQS", service: "sqs", type: "aws-integration", description: "Fully managed message queuing service that enables you to decouple and scale microservices." },
            { name: "SNS", service: "sns", type: "aws-integration", description: "Fully managed pub/sub messaging, SMS, email, and mobile push notifications." },
            { name: "Step Functions", service: "stepfunctions", type: "aws-integration", description: "Visual workflow service that helps developers use AWS services to build distributed applications." },
            { name: "EventBridge", service: "eventbridge", type: "aws-integration", description: "Serverless event bus that helps you receive, filter, transform, route, and deliver events." },
            { name: "AppSync", service: "appsync", description: "Build serverless GraphQL and Pub/Sub APIs that simplify application development." },
            { name: "MQ", service: "mq", description: "Managed message broker service for Apache ActiveMQ and RabbitMQ." },
        ]
    },
    {
        category: "Security",
        items: [
            { name: "IAM", service: "iam", type: "aws-security", description: "Securely manage identities and access to AWS services and resources." },
            { name: "Cognito", service: "cognito", type: "aws-security", description: "Customer identity and access management (CIAM) for web and mobile apps." },
            { name: "Secrets Manager", service: "secretsmanager", type: "aws-security", description: "Rotate, manage, and retrieve database credentials, API keys, and other secrets." },
            { name: "KMS", service: "kms", type: "aws-security", description: "Create and control the keys used to encrypt or digitally sign your data." },
            { name: "WAF", service: "waf", type: "aws-security", description: "Protect your web applications from common web exploits." },
            { name: "GuardDuty", service: "guardduty", description: "Intelligent threat detection and continuous monitoring to protect your AWS accounts." },
            { name: "Inspector", service: "inspector", description: "Automate vulnerability management at scale." },
            { name: "Macie", service: "macie", description: "Discover and protect sensitive data at scale." },
            { name: "Security Hub", service: "securityhub", description: "Cloud security posture management service that performs security best practice checks." },
            { name: "Certificate Manager", service: "certificatemanager", description: "Provision, manage, and deploy public and private SSL/TLS certificates." },
            { name: "CloudHSM", service: "cloudhsm", description: "Managed hardware security module (HSM) on the AWS Cloud." },
            { name: "Shield", service: "shield", description: "Managed Distributed Denial of Service (DDoS) protection service." },
        ]
    },
    {
        category: "Developer Tools",
        items: [
            { name: "CodePipeline", service: "codepipeline", type: "aws-devtools", description: "Fully managed continuous delivery service that helps you automate your release pipelines." },
            { name: "CodeBuild", service: "codebuild", type: "aws-devtools", description: "Fully managed continuous integration service that compiles source code, runs tests, and produces software packages." },
            { name: "CodeDeploy", service: "codedeploy", type: "aws-devtools", description: "Fully managed deployment service that automates software deployments." },
            { name: "CodeCommit", service: "codecommit", type: "aws-devtools", description: "Secure, highly scalable, managed source control service." },
            { name: "CodeArtifact", service: "codeartifact", description: "Secure, scalable, and cost-effective artifact management for software development." },
            { name: "Cloud9", service: "cloud9", description: "Cloud-based integrated development environment (IDE) for writing, running, and debugging code." },
            { name: "X-Ray", service: "xray", description: "Analyze and debug production, distributed applications." },
        ]
    },
    {
        category: "Management & Governance",
        items: [
            { name: "CloudWatch", service: "cloudwatch", type: "aws-management", description: "Observability of your AWS resources and applications on AWS and on-premises." },
            { name: "CloudFormation", service: "cloudformation", type: "aws-management", description: "Model, provision, and manage AWS and third-party resources by treating infrastructure as code." },
            { name: "Systems Manager", service: "systemsmanager", type: "aws-management", description: "Operational center for your AWS resources." },
            { name: "Config", service: "config", description: "Assess, audit, and evaluate the configurations of your AWS resources." },
            { name: "CloudTrail", service: "cloudtrail", description: "Track user activity and API usage." },
            { name: "Organizations", service: "organizations", description: "Central governance and management across your AWS accounts." },
            { name: "Control Tower", service: "controltower", description: "Establish and govern a secure, multi-account AWS environment." },
            { name: "Service Catalog", service: "servicecatalog", description: "Create, manage, and govern a catalog of IT services." },
            { name: "Trusted Advisor", service: "trustedadvisor", description: "Reduce costs, increase performance, and improve security." },
        ]
    },
    {
        category: "Analytics",
        items: [
            { name: "Kinesis", service: "kinesis", type: "aws-analytics", description: "Easily collect, process, and analyze video and data streams in real time." },
            { name: "Glue", service: "glue", type: "aws-analytics", description: "Scalable, serverless data integration service that makes it easy to discover, prepare, and combine data." },
            { name: "Athena", service: "athena", type: "aws-analytics", description: "Interactive query service that makes it easy to analyze data in Amazon S3 using standard SQL." },
            { name: "EMR", service: "emr", type: "aws-analytics", description: "Industry-leading cloud big data platform for processing vast amounts of data." },
            { name: "Redshift", service: "redshift", description: "Fast, fully managed, and cost-effective data warehouse." },
            { name: "QuickSight", service: "quicksight", description: "Fast, cloud-powered business intelligence (BI) service." },
            { name: "OpenSearch", service: "opensearch", description: "Search, visualize, and analyze data." },
            { name: "MSK", service: "msk", description: "Fully managed service that makes it easy for you to build and run applications that use Apache Kafka." },
        ]
    },
    {
        category: "Migration & Transfer",
        items: [
            { name: "Database Migration Service", service: "dms", type: "aws-migration", description: "Migrate your databases to AWS with minimal downtime." },
            { name: "DataSync", service: "datasync", description: "Simple, fast, and secure online data transfer." },
            { name: "Transfer Family", service: "transferfamily", description: "Fully managed support for SFTP, FTPS, and FTP." },
            { name: "Migration Hub", service: "migrationhub", description: "Simplify and accelerate the migration of your data centers to AWS." },
        ]
    },
];

interface ComponentPaletteProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ComponentPalette({ isOpen, onOpenChange }: ComponentPaletteProps) {
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
                    <TooltipProvider delayDuration={300}>
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
                                                Icon = getAwsIcon(item.service, item.type || '');
                                            }

                                            return (
                                                <Tooltip key={`${item.service}-${item.name}`}>
                                                    <TooltipTrigger asChild>
                                                        <button
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
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right" className="max-w-[200px]">
                                                        <p className="font-semibold mb-1">{item.name}</p>
                                                        <p className="text-xs">{item.description}</p>
                                                    </TooltipContent>
                                                </Tooltip>
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
                    </TooltipProvider>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
