import React from 'react';
import {
    ArchitectureServiceAmazonEC2,
    ArchitectureServiceAWSLambda,
    ArchitectureServiceAmazonDynamoDB,
    ArchitectureServiceAmazonRDS,
    ArchitectureServiceAmazonSimpleStorageService,
    ArchitectureServiceAmazonEFS,
    ArchitectureServiceAmazonVirtualPrivateCloud,
    ArchitectureServiceAmazonRoute53,
    ArchitectureServiceAmazonSimpleQueueService,
    ArchitectureServiceAmazonSimpleNotificationService,
    CategorySecurityIdentityCompliance,
    ArchitectureServiceAmazonCloudWatch,
    ArchitectureServiceAmazonElasticKubernetesService,
    ArchitectureServiceAmazonElasticContainerService,
    ArchitectureServiceAWSAmplify,
    ArchitectureServiceAmazonAPIGateway,
    ResourceElasticLoadBalancingApplicationLoadBalancer,
    ArchitectureServiceAmazonCloudFront,
    ArchitectureServiceAmazonElastiCache,
    ArchitectureServiceAmazonKinesis,
    CategoryCompute,
    CategoryDatabase,
    CategoryStorage,
    CategoryNetworkingContentDelivery,
} from 'aws-react-icons';
import { Cloud, Box, LucideIcon } from 'lucide-react';

// Define a type that can be either an AWS Icon component or a Lucide Icon
type IconComponent = React.ComponentType<any> | LucideIcon;

export const getAwsIcon = (service: string, type: string): IconComponent => {
    // Normalize input
    const normalizedService = service?.toLowerCase().replace(/\s+/g, '') || '';
    const normalizedType = type?.toLowerCase() || '';

    // 1. Direct Service Mapping
    const serviceMap: Record<string, React.ComponentType<any>> = {
        'ec2': ArchitectureServiceAmazonEC2,
        'lambda': ArchitectureServiceAWSLambda,
        's3': ArchitectureServiceAmazonSimpleStorageService,
        'dynamodb': ArchitectureServiceAmazonDynamoDB,
        'rds': ArchitectureServiceAmazonRDS,
        'vpc': ArchitectureServiceAmazonVirtualPrivateCloud,
        'sqs': ArchitectureServiceAmazonSimpleQueueService,
        'sns': ArchitectureServiceAmazonSimpleNotificationService,
        'iam': CategorySecurityIdentityCompliance, // Best fit for generic IAM
        'cloudwatch': ArchitectureServiceAmazonCloudWatch,
        'eks': ArchitectureServiceAmazonElasticKubernetesService,
        'ecs': ArchitectureServiceAmazonElasticContainerService,
        'efs': ArchitectureServiceAmazonEFS,
        'route53': ArchitectureServiceAmazonRoute53,
        'amplify': ArchitectureServiceAWSAmplify,
        'apigateway': ArchitectureServiceAmazonAPIGateway,
        'elb': ResourceElasticLoadBalancingApplicationLoadBalancer,
        'elasticloadbalancing': ResourceElasticLoadBalancingApplicationLoadBalancer,
        'cloudfront': ArchitectureServiceAmazonCloudFront,
        'elasticache': ArchitectureServiceAmazonElastiCache,
        'kinesis': ArchitectureServiceAmazonKinesis,
    };

    // Check for exact match or partial match in service name
    if (serviceMap[normalizedService]) {
        return serviceMap[normalizedService];
    }

    // Try to find a key that is contained within the service string
    const foundServiceKey = Object.keys(serviceMap).find(key => normalizedService.includes(key));
    if (foundServiceKey) {
        return serviceMap[foundServiceKey];
    }

    // 2. Type Mapping (Fallback)
    const typeMap: Record<string, React.ComponentType<any>> = {
        'aws-compute': CategoryCompute,
        'aws-database': CategoryDatabase,
        'aws-storage': CategoryStorage,
        'aws-network': CategoryNetworkingContentDelivery,
        'compute': CategoryCompute,
        'database': CategoryDatabase,
        'storage': CategoryStorage,
        'network': CategoryNetworkingContentDelivery,
    };

    if (typeMap[normalizedType]) {
        return typeMap[normalizedType];
    }

    // 3. Last Resort Fallback
    return Box;
};
