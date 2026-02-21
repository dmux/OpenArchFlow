import { ServiceCategory } from '../types';

export const AZURE_SERVICES: ServiceCategory[] = [
    {
        category: "Compute",
        items: [
            { name: "Virtual Machines", service: "vm", type: "azure-compute", description: "Provision Windows and Linux virtual machines in seconds." },
            { name: "Virtual Machine Scale Sets", service: "vmss", type: "azure-compute", description: "Manage and scale up to thousands of Linux and Windows VMs." },
            { name: "App Service", service: "appservice", type: "azure-compute", description: "Quickly create powerful cloud apps for web and mobile." },
            { name: "Functions", service: "functions", type: "azure-compute", description: "Process events with serverless code." },
            { name: "Azure Spring Apps", service: "spring-apps", type: "azure-compute", description: "Build and deploy Spring Boot applications with a fully managed service from Microsoft and VMware." },
            { name: "Batch", service: "batch", type: "azure-compute", description: "Cloud-scale job scheduling and compute management." },
        ]
    },
    {
        category: "Containers",
        items: [
            { name: "Azure Kubernetes Service (AKS)", service: "aks", type: "azure-containers", description: "Deploy and scale containers on managed Kubernetes." },
            { name: "Container Instances", service: "aci", type: "azure-containers", description: "Run Docker containers on-demand in a managed, serverless Azure environment." },
            { name: "Container Registry", service: "acr", type: "azure-containers", description: "Store and manage container images across all types of deployments." },
            { name: "Container Apps", service: "containerapps", type: "azure-containers", description: "Build and deploy modern apps and microservices using serverless containers." },
        ]
    },
    {
        category: "Databases",
        items: [
            { name: "Cosmos DB", service: "cosmosdb", type: "azure-database", description: "Globally distributed, multi-model database for any scale." },
            { name: "SQL Database", service: "sql", type: "azure-database", description: "Managed, intelligent SQL in the cloud." },
            { name: "Database for PostgreSQL", service: "postgres", type: "azure-database", description: "Fully managed, intelligent, and scalable PostgreSQL." },
            { name: "Database for MySQL", service: "mysql", type: "azure-database", description: "Fully managed, scalable MySQL database." },
            { name: "Database for MariaDB", service: "mariadb", type: "azure-database", description: "Managed MariaDB database service for app developers." },
            { name: "Cache for Redis", service: "redis", type: "azure-database", description: "Power applications with high-throughput, low-latency data access." },
            { name: "SQL Managed Instance", service: "sqlmi", type: "azure-database", description: "Managed SQL instance with broad SQL Server engine compatibility." },
        ]
    },
    {
        category: "Storage",
        items: [
            { name: "Blob Storage", service: "blob", type: "azure-storage", description: "Massively scalable and secure object storage." },
            { name: "Files", service: "files", type: "azure-storage", description: "Simple, secure, and fully managed cloud file shares." },
            { name: "Queue Storage", service: "queues", type: "azure-storage", description: "Effectively scale apps according to traffic." },
            { name: "Table Storage", service: "tables", type: "azure-storage", description: "NoSQL key-value store using massive semi-structured datasets." },
            { name: "Data Lake Storage", service: "datalake", type: "azure-storage", description: "Massively scalable, secure data lake functionality built on Azure Blob Storage." },
            { name: "Managed Disks", service: "manageddisks", type: "azure-storage", description: "Persistent, secured disk options supporting virtual machines." },
        ]
    },
    {
        category: "Networking",
        items: [
            { name: "Virtual Network", service: "vnet", type: "azure-network", description: "Provision private networks, optionally connect to on-premises datacenters." },
            { name: "Load Balancer", service: "loadbalancer", type: "azure-network", description: "Deliver high availability and network performance to your applications." },
            { name: "Application Gateway", service: "appgateway", type: "azure-network", description: "Build highly scalable web applications safely." },
            { name: "VPN Gateway", service: "vpngateway", type: "azure-network", description: "Establish secure, cross-premises connectivity." },
            { name: "Azure DNS", service: "dns", type: "azure-network", description: "Host your DNS domain in Azure." },
            { name: "Content Delivery Network", service: "cdn", type: "azure-network", description: "Ensure secure, reliable content delivery with broad global reach." },
            { name: "Traffic Manager", service: "trafficmanager", type: "azure-network", description: "Route incoming traffic for high performance and availability." },
            { name: "ExpressRoute", service: "expressroute", type: "azure-network", description: "Dedicated private network fiber connections to Azure." },
            { name: "Azure Front Door", service: "frontdoor", type: "azure-network", description: "Modern cloud Content Delivery Network (CDN), dynamic site acceleration, and global load balancing." },
            { name: "Virtual WAN", service: "vwan", type: "azure-network", description: "Optimize and automate branch-to-branch connectivity." },
            { name: "Azure Firewall", service: "firewall", type: "azure-network", description: "Cloud-native and intelligent network firewall security." },
        ]
    },
    {
        category: "AI & Machine Learning",
        items: [
            { name: "Azure OpenAI", service: "openai", type: "azure-ai", description: "Advanced language models for writing, coding, and reasoning." },
            { name: "Cognitive Services", service: "cognitive", type: "azure-ai", description: "Add smart API capabilities to enable contextual interactions." },
            { name: "Machine Learning", service: "ml", type: "azure-ai", description: "Bring AI to everyone with an end-to-end, scalable, trusted platform." },
            { name: "Bot Service", service: "botservice", type: "azure-ai", description: "Intelligent, serverless bot service that scales on demand." },
            { name: "Cognitive Search", service: "search", type: "azure-ai", description: "Enterprise search that uses built-in AI capabilities to identify and explore relevant content at scale." },
        ]
    },
    {
        category: "Analytics",
        items: [
            { name: "Synapse Analytics", service: "synapse", type: "azure-analytics", description: "Limitless analytics service with unmatched time to insight." },
            { name: "Databricks", service: "databricks", type: "azure-analytics", description: "Design AI with an Apache Spark-based analytics platform." },
            { name: "Data Factory", service: "datafactory", type: "azure-analytics", description: "Hybrid data integration at enterprise scale, made easy." },
            { name: "Stream Analytics", service: "streamanalytics", type: "azure-analytics", description: "Real-time stream processing serverless analytics." },
            { name: "Power BI", service: "powerbi", type: "azure-analytics", description: "Interactive data visualization BI tools." },
            { name: "Event Hubs", service: "eventhubs", type: "azure-analytics", description: "Receive telemetry from millions of devices." },
        ]
    },
    {
        category: "Integration",
        items: [
            { name: "Logic Apps", service: "logicapps", type: "azure-integration", description: "Automate the access and use of data across clouds without writing code." },
            { name: "Service Bus", service: "servicebus", type: "azure-integration", description: "Connect across private and public cloud environments." },
            { name: "Event Grid", service: "eventgrid", type: "azure-integration", description: "Get reliable event delivery at massive scale." },
            { name: "API Management", service: "apim", type: "azure-integration", description: "Publish APIs to developers, partners, and employees securely and at scale." },
        ]
    },
    {
        category: "Identity & Security",
        items: [
            { name: "Microsoft Entra ID (Azure AD)", service: "entraid", type: "azure-security", description: "Synchronize on-premises directories and enable single sign-on." },
            { name: "Key Vault", service: "keyvault", type: "azure-security", description: "Safeguard and maintain control of keys and other secrets." },
            { name: "Microsoft Defender for Cloud", service: "defender", type: "azure-security", description: "Unified security management and advanced threat protection." },
            { name: "Azure DDoS Protection", service: "ddos", type: "azure-security", description: "Protect your Azure resources from denial of service (DDoS) attacks." },
            { name: "Microsoft Sentinel", service: "sentinel", type: "azure-security", description: "Cloud-native SIEM and SOAR solution." },
            { name: "Azure Policy", service: "policy", type: "azure-security", description: "Implement corporate governance and standards at scale for Azure resources." },
        ]
    },
    {
        category: "DevOps & Management",
        items: [
            { name: "Azure DevOps", service: "devops", type: "azure-devops", description: "Services for teams to share code, track work, and ship software." },
            { name: "Azure Monitor", service: "monitor", type: "azure-management", description: "Full observability into your applications, infrastructure, and network." },
            { name: "Application Insights", service: "appinsights", type: "azure-management", description: "Application performance management and analytics." },
            { name: "Log Analytics", service: "loganalytics", type: "azure-management", description: "Edit and run log queries with data in Azure Monitor logs." },
            { name: "Azure Resource Manager (ARM)", service: "arm", type: "azure-management", description: "Deploy, manage, and monitor all the resources for your solution as a group." },
            { name: "Azure Arc", service: "arc", type: "azure-management", description: "Secure, develop, and operate infrastructure, apps, and Azure services anywhere." },
            { name: "Azure Backup", service: "backup", type: "azure-management", description: "Simplify data protection and protect against ransomware." },
            { name: "Site Recovery", service: "siterecovery", type: "azure-management", description: "Keep your business running with built-in disaster recovery service." },
        ]
    },
    {
        category: "Web",
        items: [
            { name: "Static Web Apps", service: "staticwebapps", type: "azure-web", description: "A modern web app service that offers streamlined full-stack development." },
            { name: "Azure SignalR Service", service: "signalr", type: "azure-web", description: "Add real-time web functionalities easily." },
        ]
    }
];
