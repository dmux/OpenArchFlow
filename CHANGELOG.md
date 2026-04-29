# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.3.0] - 2026-04-28

### Added

**AWS Pricing Integration** — Real-time cost estimation for AWS resources:
- Integration with official **AWS Price List API** via MCP-inspired provider
- Support for **Compute** (EC2, RDS) with hourly/monthly instance rates
- Support for **Storage** (S3, EFS) with GB-Mo usage metrics
- Support for **Serverless/Integration** (Lambda, SQS) with invocation/request rates
- **Dynamic Cost Configuration** — adjust Region, Instance Type, and usage quantities (count, storage size, requests) in the properties panel
- **Bill of Materials (BOM) Panel** — Consolidated monthly architecture cost view listing all priced resources
- **CSV Export** — Download a detailed cost breakdown for external reporting or spreadsheets
- Standardized all UI components and labels to English for a consistent global experience

### Changed

- Removed MiniMap from the canvas to provide a cleaner and more focused user interface
- Updated `UnifiedToolbar` with a dedicated Cost Summary button ($)

### Technical

- Added `@aws-sdk/client-pricing` and `dotenv` dependencies
- Implemented `AWSPricingProvider` with forced us-east-1 endpoint for reliable global pricing data
- Separated pricing metadata from UI components to allow cross-platform (client/server) usage without Node.js module errors

---

## [0.2.0] - 2026-04-27

### Added

**AWS Architecture Groups** — pre-styled container shapes for drawing real-world AWS solution diagrams:
- `AWS Region` (orange border) — geographic region boundary
- `AWS Account` (purple border) — account-level isolation boundary
- `VPC` (blue border) — Virtual Private Cloud container
- `Availability Zone` (yellow border) — fault-isolation zone grouping
- `Public Subnet` (green border) — internet-routable subnet
- `Private Subnet` (slate border) — internal/backend subnet
- `Internet / Cloud` (cyan border) — public internet boundary
- `On-Premises / Corporate` (gray border) — data center or hybrid connectivity zone
- `Security Zone / DMZ` (red border) — perimeter security grouping

**Networking services:**
- AWS Network Firewall — stateful VPC-level firewall
- AWS PrivateLink — private cross-VPC/service connectivity
- Global Accelerator — anycast global traffic acceleration
- VPC Endpoint — private access to AWS services
- Elastic IP — static public IPv4 address
- Customer Gateway — VPN customer-side endpoint
- VPN Gateway — VPC-side VPN termination
- Network ACL — stateless subnet-level firewall
- NLB (Network Load Balancer) — Layer 4 load balancing

**Compute services:**
- AWS Amplify — full-stack web and mobile app platform

**Application Integration:**
- Amazon AppFlow — SaaS data integration
- Amazon MWAA — Managed Workflows for Apache Airflow

**Storage:**
- AWS Snow Family — physical data transfer devices (Snowcone, Snowball, Snowmobile)
- S3 Transfer Acceleration — fast long-distance S3 transfers

**Analytics:**
- Amazon Data Firehose — real-time streaming data delivery
- AWS Lake Formation — data lake setup and governance

**Management & Governance:**
- AWS Compute Optimizer — ML-based resource rightsizing
- AWS Health Dashboard — service health and personal health alerts
- AWS Well-Architected Tool — workload review against best practices
- AWS Resource Groups — tag-based resource organization

**Security, Identity & Compliance:**
- AWS Firewall Manager — centralized firewall rule management
- Amazon Detective — security investigation and root-cause analysis
- AWS IAM Identity Center — workforce SSO and multi-account access
- AWS Verified Access — Zero Trust application access (no VPN)

**AI & Machine Learning:**
- Amazon Q — generative AI assistant for business and development
- AWS HealthLake — FHIR-compliant health data store and analytics

**Developer Tools:**
- Amazon CodeGuru — AI-powered code quality and performance recommendations

### Changed

- `FrameNode` now applies automatic AWS color theming based on the node's `subtype` (e.g. `vpc` → blue, `subnet-public` → green) — no manual color configuration needed
- Sidebar footer now displays the current app version alongside the diagram count

### Technical

- Added `NEXT_PUBLIC_APP_VERSION` env var injected at build time from `package.json`
- Added `src/lib/version.ts` for centralized version access across the client

---

## [0.1.0] - 2026-02-17

### Added

**Core Diagramming Engine**
- ReactFlow-based canvas with drag-and-drop node placement
- Auto-layout via dagre algorithm (hierarchical organization)
- Node resize, selection, and inline label editing
- Edge routing with automatic connection handles
- FrameNode for grouping components
- NoteNode and AnnotationNode for documentation
- GenericNode with subtypes: process, database, file, start/end, decision, actor
- Custom icon support for diagram nodes via the properties panel
- Node styling controls (colors, borders) for generic nodes

**AI Engine (Dual)**
- **Cloud AI** — Google Gemini 2.5 Flash for fast architecture generation
- **Local AI** — WebLLM (Phi-3-mini via WebGPU) for fully offline, private generation
- Incremental generation — AI can modify and append to existing diagrams
- AWS Documentation MCP integration — real-time AWS best-practice context via `awslabs.aws-documentation-mcp-server`
- Diagram Chat — conversational AI assistant for explanations, pricing estimates, and security reviews
- Pre-built certification example prompts (AWS SAA, DEA) with pagination

**Component Library (Providers)**
- **AWS** — 100+ services: Compute, Containers, Database, Storage, Networking, AI/ML, Security, Developer Tools, Management, Analytics, Migration
- **Azure** — Compute, Database, Network, Storage (azure-react-icons)
- **Cloud Native** — Kubernetes, Docker, Prometheus, Grafana, Istio, and more
- **Integration** — Stripe, PayPal, Twilio, SendGrid, Slack, Discord, GitHub, and more
- **Generic** — Diagram shapes, flowchart elements, clients, and IoT devices

**Architecture Simulation**
- Playback engine to simulate data flows and traffic patterns across diagram nodes
- Simulation log panel with real-time event streaming
- Configurable mock latency and failure rates per node

**Presentation Tools**
- Laser pointer mode for live diagram presentations
- MiniMap for navigation on large diagrams

**Documentation Generation**
- AI-generated technical specifications (Markdown)
- Architecture overviews, component descriptions, and best-practice recommendations
- Preview rendered Markdown or copy raw content

**Multi-Diagram Management**
- Create, rename, delete, and switch between multiple diagrams
- Paginated sidebar with dynamic height calculation
- Export individual diagram as JSON
- Backup all diagrams as a single JSON file
- Import single diagram or full backup with automatic conflict resolution (renaming duplicates)
- Backward-compatible import format

**UI/UX**
- Dark mode support with glassmorphism effects
- Unified toolbar with main tools, action tools, and simulation controls
- Component palette with per-provider tabs and search
- Properties panel for node editing
- Gemini API key dialog with inline error feedback
- PWA manifest and favicon

---

[Unreleased]: https://github.com/dmux/OpenArchFlow/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/dmux/OpenArchFlow/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/dmux/OpenArchFlow/releases/tag/v0.1.0
