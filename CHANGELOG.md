# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.5.0] - 2026-05-03

### Added

**Editor Foundations (draw.io feature parity — Phase 1)**
- **Undo / Redo** — Full temporal history via `zundo` middleware. `Ctrl+Z` undoes, `Ctrl+Y` redoes. Node drag operations are batched as single undo steps.
- **Global Keyboard Shortcuts** — `Ctrl+C/V` copy/paste (new UUIDs on paste), `Ctrl+D` duplicate, `Ctrl+A` select all, `Ctrl+L` auto-layout, `Delete` remove selected nodes, `Ctrl+?` open shortcuts help dialog.
- **Keyboard Shortcuts Dialog** — Centralized shortcut definitions grouped by category, accessible via `Ctrl+?`.
- **Alignment Toolbar** — Contextual floating toolbar appears when 2+ nodes are selected: align left / center / right / top / middle / bottom, distribute horizontally / vertically.
- **Export SVG & PDF** — Export dropdown now offers PNG, SVG, and PDF in addition to the previous PNG-only option.
- **Snap-to-Grid** — All nodes snap to a 16×16 grid by default.
- **Smart Alignment Guides** — Figma-style temporary guide lines appear during node drag when edges or centers align with neighboring nodes.
- **Collaboration Cursors** — Real-time remote cursors with peer name labels rendered as an overlay on the canvas.

**Power User Productivity (Phase 2)**
- **Layer System** — Diagrams now support named layers with show/hide, lock, and color options. Nodes can be assigned to layers. Locked layers prevent drag/connect/select. Hidden layers are filtered from the canvas.
- **Template Library** — 7 ready-to-use architecture templates: AWS Three-Tier Web App, AWS Serverless API, AWS Event-Driven Architecture, AWS Microservices Platform, AWS Data Lake, Generic Flowchart, and CI/CD Pipeline.
- **Mermaid Import** — Import `flowchart`, `sequenceDiagram`, and `classDiagram` Mermaid code directly from the Sidebar. Pure text parser — no heavy Mermaid runtime bundled.
- **Universal Style Panel** — Fill color, border color, text color, border width, and opacity controls for all node types. Applies to all selected nodes simultaneously (batch).
- **Connector Style Panel** — Per-edge controls for routing type (smooth step / straight / step / bezier), color, width, and dashed line toggle.
- **Custom Properties Editor** — Add, edit, and delete arbitrary key-value metadata on any node directly from the Properties Panel.

**New Diagram Types (Phase 3)**
- **ER / Database Diagrams** — `TableNode` displays entity name, columns with PK (amber) and FK (blue) key icons, type, and nullable markers. Per-row source/target handles for FK relationship edges. Inline column editor in the Properties Panel (add/edit/delete columns with PK/FK/NN flags). SQL DDL import modal in Sidebar parses `CREATE TABLE` statements and auto-links foreign keys.
- **Sequence UML Diagrams** — `SequenceActorNode` renders an actor box, a dashed vertical lifeline with 16 message-slot handles, and a bottom box. Mermaid `sequenceDiagram` parser updated to wire edges to the correct lifeline slot handles. UML Sequence category added to the Component Palette (Actor, System).
- **Swimlane Diagrams** — `SwimlaneNode` with configurable lanes (horizontal or vertical direction), per-lane color and title, add/delete lanes from the Properties Panel.
- **Custom SVG Shape Upload** — Upload `.svg` files from the Component Palette. Shapes are sanitized client-side via the native `DOMParser` (strips `<script>`, `<foreignObject>`, `on*` attributes, and `javascript:` hrefs) and stored in the diagram state.
- **Waypoints & Connector Styles** — `StyledEdge` custom edge type supports all routing modes, custom stroke color/width, and dashed lines via the Properties Panel.

**Collaboration**
- **Rename Guest User** — Users can now set a custom display name directly in the Collaboration popover. The name is persisted in `localStorage` and immediately broadcast to all peers via Yjs awareness.

### Fixed

- Replaced `dompurify` (SSR-unsafe) with a native `DOMParser`-based SVG sanitizer, fixing Vercel build failures caused by browser globals being accessed during server-side rendering.
- Extracted `CustomPropertiesEditor` to a top-level component to fix a React Rules of Hooks violation (hooks called inside an IIFE in JSX).
- Moved layer filtering from the Zustand selector into a `useMemo` hook to prevent an infinite re-render loop caused by `useShallow` detecting new array references on every render.

### Technical

- Added `zundo` for temporal undo/redo middleware on the Zustand store.
- Added `jspdf` for PDF export support.
- New files: `SequenceActorNode`, `TableNode`, `SwimlaneNode`, `CustomShapeNode`, `StyledEdge`, `AlignmentToolbar`, `AlignmentGuides`, `CollaborationCursors`, `LayersPanel`, `TemplatesDialog`, `KeyboardShortcutsDialog`.
- New libs: `src/lib/import/mermaid.ts`, `src/lib/import/sql-ddl.ts`, `src/lib/templates/index.ts`, `src/lib/shortcuts.ts`.

---

## [0.4.0] - 2026-04-29

### Added

**Real-time P2P Collaboration** — Design architectures together in real-time with zero-knowledge privacy:
- **Peer-to-Peer Architecture**: Direct browser-to-browser synchronization using **WebRTC** and **Yjs (CRDT)**.
- **End-to-End Encryption (E2EE)**: All diagram data is encrypted before leaving the browser. The decryption key is stored in the URL fragment (`#hash`), which is **never sent** to the signaling server.
- **Zero-Knowledge Privacy**: No central server stores or can read your diagrams. The signaling server only facilitates the initial P2P handshake.
- **Presence Features**: Real-time peer count and connection status indicator on the toolbar.
- **Seamless Sharing**: Generate secure invite links that include the diagram ID and the encryption key.
- **Custom Signaling Infrastructure**: Dedicated signaling server deployed on Fly.io (`y-webrtc-signaling.openarchflow.cloud`) for high reliability.

### Technical

- Added `yjs` and `y-webrtc` dependencies.
- Implemented `src/lib/collaboration.ts` for managing shared documents and WebRTC providers.
- Integrated Yjs observers into `useDiagramStore` for bi-directional state synchronization.
- Created `CollaborateButton` component with Popover-based sharing UI.
- Added `scripts/signaling.mjs` and `Dockerfile` for the private signaling server.

---

## [0.3.2] - 2026-04-29

### Fixed

- **Pricing Resilience**: Added mandatory filters (`preInstalledSw`, `capacitystatus`) to AWS Pricing queries to prevent "Price not found" errors on EC2 resources.
- Improved OS string handling for AWS Price List compatibility.

---

## [0.3.1] - 2026-04-28

### Added

- Added **Vercel Speed Insights** for real-user performance monitoring and web vitals tracking

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

[Unreleased]: https://github.com/dmux/OpenArchFlow/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/dmux/OpenArchFlow/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/dmux/OpenArchFlow/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/dmux/OpenArchFlow/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/dmux/OpenArchFlow/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/dmux/OpenArchFlow/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/dmux/OpenArchFlow/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/dmux/OpenArchFlow/releases/tag/v0.1.0
