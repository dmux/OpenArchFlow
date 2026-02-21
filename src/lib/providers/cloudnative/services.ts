import { ServiceCategory } from '../types';

export const CLOUDNATIVE_SERVICES: ServiceCategory[] = [
    {
        category: "Cloud Native",
        items: [
            { name: "Kubernetes", service: "kubernetes", type: "cloud-native", description: "Open-source system for automating deployment, scaling, and management of containerized applications." },
            { name: "ArgoCD", service: "argocd", type: "cloud-native", description: "Declarative, GitOps continuous delivery tool for Kubernetes." },
            { name: "Crossplane", service: "crossplane", type: "cloud-native", description: "Open source, CNCF project built on the foundation of Kubernetes to orchestrate anything." },
            { name: "Prometheus", service: "prometheus", type: "cloud-native", description: "Open-source systems monitoring and alerting toolkit." },
            { name: "Grafana", service: "grafana", type: "cloud-native", description: "Open source analytics & monitoring solution for every database." },
            { name: "Terraform", service: "terraform", type: "cloud-native", description: "Infrastructure as code software tool created by HashiCorp." },
            { name: "Helm", service: "helm", type: "cloud-native", description: "The package manager for Kubernetes." },
            { name: "Istio", service: "istio", type: "cloud-native", description: "Open platform for providing a uniform way to integrate microservices, manage traffic flow across microservices, enforce policies and aggregate telemetry data." },
            { name: "Docker", service: "docker", type: "cloud-native", description: "Set of platform as a service products that use OS-level virtualization to deliver software in packages called containers." },
            { name: "Vault", service: "vault", type: "cloud-native", description: "Tool for securely accessing secrets." },
            { name: "OpenTelemetry", service: "opentelemetry", type: "cloud-native", description: "Collection of tools, APIs, and SDKs used to instrument, generate, collect, and export telemetry data." },
            { name: "Envoy", service: "envoy", type: "cloud-native", description: "Edge and service proxy designed for cloud-native applications." },
            { name: "Nginx", service: "nginx", type: "cloud-native", description: "Web server that can also be used as a reverse proxy, load balancer, mail proxy and HTTP cache." },
            { name: "Consul", service: "consul", type: "cloud-native", description: "Service networking solution to connect and secure services across any runtime platform and public or private cloud." },
            { name: "Kong", service: "kong", type: "cloud-native", description: "Cloud-native API gateway and service mesh." },
            { name: "Cloudflare", service: "cloudflare", type: "cloud-native", description: "Global network designed to make everything you connect to the Internet secure, private, fast, and reliable." },
        ]
    },
    {
        category: "CI/CD & DevOps",
        items: [
            { name: "GitHub Actions", service: "githubactions", type: "cloud-native", description: "Automate your workflow from idea to production." },
            { name: "GitLab", service: "gitlab", type: "cloud-native", description: "The single DevOps platform." },
            { name: "Jenkins", service: "jenkins", type: "cloud-native", description: "Open source automation server." },
            { name: "Ansible", service: "ansible", type: "cloud-native", description: "Open-source software provisioning, configuration management, and application-deployment tool." },
            { name: "Pulumi", service: "pulumi", type: "cloud-native", description: "Universal infrastructure as code." },
        ]
    },
    {
        category: "Observability",
        items: [
            { name: "Datadog", service: "datadog", type: "cloud-native", description: "Monitoring and security platform for cloud applications." },
            { name: "Sentry", service: "sentry", type: "cloud-native", description: "Developer-first error tracking and performance monitoring." },
            { name: "New Relic", service: "newrelic", type: "cloud-native", description: "Full-stack observability platform for software engineers." },
            { name: "Dynatrace", service: "dynatrace", type: "cloud-native", description: "Software intelligence platform based on AI and automation." },
            { name: "Splunk", service: "splunk", type: "cloud-native", description: "Data platform for searching, monitoring, and analyzing machine-generated big data." },
            { name: "Elastic", service: "elastic", type: "cloud-native", description: "Search, observability, and security built on the Elastic Stack." },
            { name: "Kibana", service: "kibana", type: "cloud-native", description: "Data visualization dashboard for Elasticsearch." },
            { name: "Logstash", service: "logstash", type: "cloud-native", description: "Server-side data processing pipeline that ingests data from multiple sources simultaneously." },
            { name: "Jaeger", service: "jaeger", type: "cloud-native", description: "Open source, end-to-end distributed tracing." },
            { name: "Fluentd", service: "fluentd", type: "cloud-native", description: "Open source data collector for unified logging layer." },
        ]
    },
    {
        category: "Hosting & PaaS",
        items: [
            { name: "Vercel", service: "vercel", type: "cloud-native", description: "Platform for frontend frameworks and static sites." },
            { name: "Fly.io", service: "flyio", type: "cloud-native", description: "Deploy app servers close to your users." },
            { name: "Heroku", service: "heroku", type: "cloud-native", description: "Cloud platform as a service supporting several programming languages." },
            { name: "Netlify", service: "netlify", type: "cloud-native", description: "Hosting and serverless backend services for web applications." },
        ]
    },
    {
        category: "Modern Databases",
        items: [
            { name: "Neon", service: "neon", type: "cloud-native", description: "Serverless Postgres built for the cloud." },
            { name: "Supabase", service: "supabase", type: "cloud-native", description: "Open source Firebase alternative." },
            { name: "PlanetScale", service: "planetscale", type: "cloud-native", description: "Serverless MySQL database." },
            { name: "Turso", service: "turso", type: "cloud-native", description: "Edge database based on libSQL." },
            { name: "Neo4j", service: "neo4j", type: "cloud-native", description: "Graph database management system." },
        ]
    }
];
