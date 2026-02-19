import { Server, Database, Shield, Globe, Layers, Zap, HardDrive, Network, Clock } from 'lucide-react';

export const AWS_SAA_PROMPTS = [
    {
        icon: Layers,
        title: "Highly Available 3-Tier Web App",
        prompt: "Design a highly available 3-tier web application architecture. The presentation layer should use an Application Load Balancer targeting an Auto Scaling Group of EC2 instances across multiple Availability Zones. The logic layer should also use an internal ALB with an ASG. The data layer should use Amazon Aurora Multi-AZ for high availability and read replicas for read scaling. Include Route 53 for DNS and CloudFront for content delivery."
    },
    {
        icon: Zap,
        title: "Serverless Image Processing",
        prompt: "Create a serverless image processing solution. Users upload images to an S3 bucket, which triggers a Lambda function. The Lambda function processes the image (e.g., resizing) and stores the result in another S3 bucket. Metadata about the image processing job should be stored in DynamoDB. Use SNS to send a notification to the user upon completion."
    },
    {
        icon: Shield,
        title: "Secure VPC VPN Connectivity",
        prompt: "Design a secure network architecture connecting an on-premises data center to an AWS VPC. Use a Virtual Private Gateway on the AWS side and a Customer Gateway on the on-premises side to establish a Site-to-Site VPN connection. The VPC should have public and private subnets, with the VPN terminating in the private subnets. Ensure security groups and NACLs are configured to allow only necessary traffic."
    },
    {
        icon: Globe,
        title: "Global Content Delivery with Failover",
        prompt: "Architect a solution for a global website requiring low latency and high availability. Use Amazon CloudFront as the CDN, backed by S3 buckets in two different regions (e.g., US-East-1 and EU-West-1) configured with Cross-Region Replication (CRR). Use Route 53 with latency-based routing and health checks to failover between the two S3 origins if one becomes unavailable."
    },
    {
        icon: Database,
        title: "Disaster Recovery (Warm Standby)",
        prompt: "Design a Warm Standby Disaster Recovery strategy. The primary region runs a full capacity production environment with EC2 instances and an RDS database. The DR region maintains a scaled-down version of the application tier (stopped instances or minimal ASG) and a read replica of the RDS database. In the event of a disaster, promote the Read Replica to primary and scale up the application tier in the DR region using Auto Scaling."
    },
    {
        icon: HardDrive,
        title: "HPC with FSx for Lustre",
        prompt: "Design a High Performance Computing (HPC) cluster on AWS. Use a cluster placement group for EC2 instances to minimize network latency. Store the large datasets on Amazon FSx for Lustre, linked to an S3 bucket for long-term storage. The EC2 instances should process the data from FSx and write results back to S3."
    },
    {
        icon: Network,
        title: "Transit Gateway Hub-and-Spoke",
        prompt: "Create a scalable network using AWS Transit Gateway. Connect multiple VPCs (e.g., Shared Services VPC, Dev VPC, Prod VPC) and an on-premises VPN connection to a central Transit Gateway. Route traffic between VPCs and on-premises through the TGW, treating the Shared Services VPC as a centralized egress point for internet access using a NAT Gateway."
    },
    {
        icon: Clock,
        title: "Event-Driven Batch Processing",
        prompt: "Design an event-driven batch processing architecture. Files dropped into an S3 bucket should generate an event in EventBridge. EventBridge triggers an AWS Batch job definition to process the file using Fargate compute environments. The Batch job reads the file from S3, processes it, and writes the output to a different S3 bucket."
    }
];
