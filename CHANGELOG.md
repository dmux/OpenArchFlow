# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.12.1] - 2026-06-24

### Added

- AWS Glue studio components and GlueStudioPanel interface.
- PySpark editor and action logs for MiniStack AWS Glue services.

## [0.12.0] - 2026-06-20

### Changed

- Updated dependencies to their latest patch/minor releases within the current major versions, including the AWS SDK clients (`3.1073.0`), Radix UI primitives, Next.js (`16.2.9`), React and React DOM (`19.2.7`), Zod (`4.4.3`), Zustand, Yjs, Framer Motion, `tailwind-merge`, `@upstash/redis`, and the TypeScript ESLint toolchain.

### Removed

- `@types/jspdf` — the package is deprecated; `jspdf` v4 ships its own type definitions.

---

## [0.11.0] - 2026-06-20

### Added

- Keyboard shortcuts to zoom the canvas: `+` / `=` to zoom in, `-` to zoom out. The shortcuts are listed under **View** in the keyboard shortcuts dialog and are ignored while typing in inputs.

---

## [0.9.0] - 2026-05-21

### Added

**AWS Infrastructure Discovery & Import**

OpenArchFlow can now scan a live AWS account and import its resources directly into the diagram canvas.

- **24 supported services** — Lambda, S3, DynamoDB, SQS, SNS, API Gateway, EC2 instances, VPCs, ECS clusters, EKS clusters, RDS instances, ElastiCache clusters, Application/Network Load Balancers, CloudFront distributions, Route 53 hosted zones, Cognito user pools, Step Functions state machines, IAM roles, Kinesis streams, EventBridge buses, KMS keys, Secrets Manager secrets, SNS topics, and SQS queues.
- **Automatic node connections** — edges are inferred from ARN references across services: ELB→EC2 (via target groups), ECS→ALB (via `loadBalancers`), CloudFront→S3/ALB (via origins), Step Functions→Lambda (via state machine definition). The ARN index also matches path-end segments and ELB DNS names, resolving cross-service links that were previously missed.
- **Partial-failure tolerance** — each service lister runs independently; a permission error on one service produces a "No access" badge without blocking the rest of the discovery.
- **Import dialog** — a two-tab dialog (*MiniStack (Local)* / *AWS Account*) lets you configure credentials and select which resources to import. Resources are pre-selected, expandable per service, and individually toggleable before import.
- **SSO login embedded in Import dialog** — the AWS Account tab now includes a "Login with AWS SSO" button that opens the Bedrock auth flow directly. Completing the SSO login auto-fills all credential fields, eliminating manual copy-paste.

**AWS Bedrock — Direct Access Keys Authentication**

- Added a second authentication method to the Bedrock connect dialog: **Access Keys** (alongside the existing SSO / Device Authorization flow).
- Users can enter an IAM Access Key ID, Secret Access Key, and optional Session Token. The dialog skips account/role selection and proceeds straight to model listing.
- Permanent IAM credentials (no session token) are treated as non-expiring (1-year TTL). Temporary credentials with a session token are assumed to expire in 1 hour.

**Bedrock Credential Silent Refresh**

- New `useBedrockExpiry` hook monitors STS credential expiry and silently refreshes credentials using the stored SSO access token before they expire — no user interaction required.
- A warning toast appears 5 minutes before expiry. On expiry, if the SSO token is still valid, credentials are refreshed transparently. If the SSO session has also expired, the provider resets to offline with a re-auth prompt.
- A "Refresh credentials" button in the AI Provider dialog triggers the same silent refresh on demand and falls back to re-opening the auth dialog if needed.

**AI Provider Dialog — Sign-Out Actions**

- **AWS Bedrock** — new "Sign out" button clears the stored credentials and session, immediately reverting to offline mode.
- **Gemini** — new "Clear" button removes the saved API key when Gemini is the active provider.

**Google Account — Proper Three-State Logout**

- The Google account button now correctly handles three distinct states: *not signed in*, *signed in but Drive not connected*, and *signed in with Drive active*. Previously, users whose Drive token had expired were left with their avatar visible but no sign-out option.
- `disconnect()` now revokes the OAuth2 access token server-side via `google.accounts.oauth2.revoke()` and calls `disableAutoSelect()` to prevent silent One Tap re-authentication after sign-out.

### Fixed

- **PropertiesPanel height on desktop** — the panel previously stretched to the full viewport height regardless of content. It now sizes itself to fit its content with a `max-h-[calc(100vh-8rem)]` cap and overflow scrolling.
- **My Diagrams — long diagram names** — diagram cards previously truncated names to a single line. Names now wrap up to two lines (`line-clamp-2 break-words`) with action buttons repositioned as an absolute overlay.
- **Sidebar click-outside to close** — clicking anywhere outside the "My Diagrams" sidebar now closes it on all screen sizes. Previously the click-capture overlay was hidden on desktop (`md:hidden`), making the panel only closeable via its X button.
- **Bedrock credential expiration unit** — the SSO Portal returns the STS `expiration` field in Unix seconds. The route was multiplying by 1000 unconditionally, which could produce year-2554 timestamps. A threshold guard (`> 4,102,444,800`) now detects the unit before converting.
- **Import from AWS — English translation** — all labels, toasts, placeholders, and button text in the discovery dialog have been translated to English.
- **Import from AWS — missing node type mappings** — `stepfunctions`, `nlb`, `elbv2`, and `cloudfront` resource types were not mapped to canvas node types. They now correctly map to `aws-integration` and `aws-network`.

---

## [0.8.3] - 2026-05-13

### Added

**AWS Bedrock — 4th AI Provider via SSO Device Authorization Flow**

OpenArchFlow now supports AWS Bedrock as a fourth AI provider alongside Gemini, WebLLM, and Offline.

- **SSO authentication** — Authenticates via AWS IAM Identity Center using the Device Authorization Flow (no manual credential entry). A 7-step dialog guides the user: enter SSO Start URL → register OIDC client → display user code → poll for approval → select account/role → load models → select model.
- **Dynamic model list** — After authentication, available foundation models are fetched from the Bedrock API (`ListFoundationModels`) and presented grouped by provider (Anthropic, Meta, Amazon, Mistral AI, Cohere, AI21 Labs).
- **Separate SSO and Bedrock regions** — The SSO region (where IAM Identity Center is deployed) and the Bedrock region (where models run) are configured independently, supporting cross-region setups.
- **ConverseCommand inference** — Uses the model-agnostic `ConverseCommand` API, compatible with all Bedrock model families (Claude, Llama, Mistral, Titan, Cohere).
- **Full feature coverage** — Bedrock works across all AI-driven features: diagram generation, diagram chat, architecture specification, and Terraform generation.
- **Credential expiration handling** — Expired credentials are detected at page load (store rehydration), before each API call, and via server-side error codes, reopening the auth dialog automatically.
- **Orange theme** — Bedrock is visually distinguished with an orange indicator ring and icon in the toolbar.

### Fixed

- **LocalStack endpoint conflict** — Bedrock SDK clients now explicitly pin to real AWS endpoints (`bedrock.{region}.amazonaws.com`, `bedrock-runtime.{region}.amazonaws.com`), preventing conflicts when `AWS_ENDPOINT_URL` is set in the environment for LocalStack.
- **Model unavailable error** — When a selected Bedrock model is not enabled for the account, a `model_not_available` error code is returned and the AI provider dialog opens automatically with a clear message to select a different model.
- **JSON code fence stripping** — An `extractJson` helper strips markdown code fences (` ```json ``` `) from model responses before parsing, fixing "Failed to generate valid structure" errors from models that wrap their output.
- **SSO Portal API paths** — Corrected account role listing endpoint to `GET /assignment/roles?account_id={id}` (was incorrectly using `/assignment/accounts/{id}/roles`).
- **OIDC connectivity** — Replaced `@aws-sdk/client-sso-oidc` SDK calls with native `fetch` throughout the SSO proxy route, resolving `AggregateError` connection failures in the Next.js environment.

---

## [0.8.2] - 2026-05-10

### Added

**Unified Google Account — Sign-In + Drive Sync in One Flow**

OpenArchFlow now uses a single Google OAuth flow to establish both user identity and Google Drive sync simultaneously.

- **One-click sign-in** — A single popup requests `drive.file`, `profile`, and `email` scopes at once. No separate "Connect Drive" step needed after signing in.
- **Unified `GoogleAccountButton`** — The toolbar now shows one button that replaces the previous `GoogleDriveSyncButton` and `GoogleSignInButton`. Before connecting it shows a cloud icon; after connecting it displays the user's profile photo with a Drive-status dot (green = idle, blue-pulse = syncing, red = error).
- **Identity via UserInfo API** — After the OAuth token is granted, the app calls `https://www.googleapis.com/oauth2/v3/userinfo` with the same access token to retrieve name, email, and profile picture, which are persisted in Zustand and localStorage.
- **Unified popover** — Clicking the avatar opens a popover showing the user profile (photo, name, email) alongside the Drive sync status (last sync time, sync file name, error details) and actions (Sync Now, Sign out). Signing out clears both identity and the Drive token.
- **Onboarding tour updated** — The "Google Account & Drive Sync" tour step now describes the unified flow, with updated hint text for both spotlight and fallback-centered variants.

**Gemini Model Selector**

Users can now choose which Gemini model powers AI generation without leaving the app.

- **Model picker in AI Provider dialog** — A segmented button group inside the Gemini Cloud section lets users select between **2.0 Flash** (fastest), **2.5 Flash** (balanced, default), and **2.5 Pro** (most capable). The selection is persisted in Zustand + localStorage.
- **All API routes respect the choice** — The selected model is forwarded to `/api/chat`, `/api/generate`, `/api/generate-spec`, and `/api/generate-terraform`. Each route falls back to `gemini-2.5-flash` if no model is specified (backwards-compatible).
- **Clearer API key label** — The API key field now reads "Requires a Google AI Studio API key (separate from your Google account)" to avoid confusion with the new Google Sign-In.

**Laser Pointer — Excalidraw-style Trail**

The laser pointer trail now behaves like Excalidraw's:

- **Time-based decay** — Each trail point carries a timestamp and fades out automatically ~1 second after being drawn, even when the mouse is stationary.
- **`requestAnimationFrame` loop** — A continuous animation loop drives the fade, stopping itself once all points have decayed and the cursor has left the window.
- **SVG line trail** — The trail is rendered as connected `<line>` segments with a constant `strokeWidth="2"` (replacing variable-size `<div>` circles), giving a thin, consistent appearance. A second blurred layer provides a soft glow effect.

### Changed

- Version bumped to 0.8.2.

---

## [0.8.1] - 2026-05-10

### Added

**Google Drive Sync — Automatic Cloud Backup**

OpenArchFlow can now automatically sync all your diagrams to your personal Google Drive, eliminating the risk of losing work on browser data clears or device switches.

- **Auto-sync** — Every diagram change is automatically uploaded to your Google Drive (debounced 3s after the last edit). The sync file (`OpenArchFlow_Sync.json`) uses the `drive.file` scope, meaning the app can only access files it created.
- **Conflict detection** — On app load, if the cloud copy is newer than local data, a prompt appears letting you choose "Use Cloud" or "Keep Local" — no silent overwrites.
- **Sync status button** — A new Google Drive icon in the toolbar (Group 5, after Collaborate) shows real-time sync status: idle, syncing spinner, or error state with last-sync timestamp.
- **Error recovery** — Sync errors surface as toasts with a "Retry" action. Token expiry triggers a reconnect prompt.
- **Privacy-first** — The feature is entirely opt-in and gated by the `NEXT_PUBLIC_GOOGLE_CLIENT_ID` environment variable. The button is hidden when the variable is not set.
- **No backend required** — OAuth and Drive API calls run entirely in the browser using Google Identity Services.

### Changed

- Version bumped to 0.8.1.

---

## [0.8.0] - 2026-05-09

### Added

**MiniStack Local Deploy — Design, Deploy & Operate**

OpenArchFlow can now deploy your AWS architecture diagrams to a local AWS emulator ([MiniStack](https://ministack.dev) — LocalStack-compatible) running on `localhost:4566`, turning it into a full **design → deploy → operate** platform for local development without any AWS account or real cloud costs.

**Deploy Engine**

- **One-click Deploy All** — Deploy every supported node in your diagram to MiniStack with a single click from the MiniStack panel (Rocket icon in the toolbar). Progress is reported per-node in real time.
- **Per-node deploy** — Deploy, re-deploy, or reset individual resources from the Properties Panel's collapsible "MiniStack Deployment" section.
- **Resource name override** — Customize the MiniStack resource name before deploying via the Properties Panel input (sanitized and suffixed with the node ID for uniqueness).
- **Idempotent deploys** — Re-deploying an already-existing resource detects it and updates the status without error.
- **Teardown** — Delete all deployed resources from MiniStack with a single "Teardown All" action.
- **Status badges** — Each diagram node shows a bottom-left badge (`deploying` spinner / `deployed` green / `error` red / `not_supported` grey) at a glance.

**Supported services (13 total):**

| Category | Service | What gets created |
|---|---|---|
| Storage | S3 | `CreateBucketCommand` |
| Compute | Lambda | `CreateFunctionCommand` (stub handler; upload your own zip from the console) |
| Database | DynamoDB | `CreateTableCommand` (hash key: `id`) |
| Messaging | SQS | `CreateQueueCommand` |
| Messaging | SNS | `CreateTopicCommand` |
| Messaging | EventBridge | `CreateEventBusCommand` |
| Messaging | Kinesis | `CreateStreamCommand` (1 shard) |
| API | API Gateway | `CreateRestApiCommand` + routes from mock endpoints + CORS + `test` stage |
| Security | IAM | `CreateRoleCommand` |
| Security | KMS | `CreateKeyCommand` |
| Security | Secrets Manager | `CreateSecretCommand` |
| Security | SSM Parameter Store | `PutParameterCommand` |
| Observability | CloudWatch Logs | Read-only console (groups, streams, live polling) |

**Mini Console (per-service interactive UIs)**

- **S3 Console** — List objects, upload files, delete objects.
- **SQS Console** — Queue attributes, receive and delete messages, send test messages.
- **DynamoDB Console** — Table info, scan items, put item.
- **Lambda Console** — Function configuration, environment variables editor, invoke with custom payload, upload real `.zip` code, live CloudWatch log streaming.
- **SNS Console** — Topic attributes, subscriptions, publish test message, add subscription.
- **EventBridge Console** — Bus info, rules list, put custom events.
- **API Gateway Console** — Routes and stages list, add route (method + path + optional Lambda), test endpoint invocation.
- **CloudWatch Console** — Log groups and streams browser, live polling of log events (2 s interval).

**Simulation + MiniStack Hybrid Mode**

- **Real-traffic simulation** — When `ministackConfig.enabled` and a node is `deployed`, simulation requests are routed to the actual MiniStack resource instead of the synthetic engine. Wall-clock latency replaces the simulated value.
- **Traffic Source node** — New node type (purple, `Users` icon) that generates simulation traffic at a configurable `req/s`. Shows a live `✓`/`✗` status icon (top-right corner) that opens a scrollable response popover on click.
- **Supported in simulation**: Lambda, SQS, DynamoDB, SNS, EventBridge, S3, API Gateway.

**Browser-Direct Architecture**

- All AWS SDK v3 calls go directly from the browser to `localhost:4566` — no Next.js API route proxy required. This means the panel works even when the app is hosted on Vercel (the user's browser calls their local MiniStack directly).
- MiniStack CORS support enables this without any extra configuration.

### Technical

- New files: `src/lib/ministack/types.ts`, `src/lib/ministack/client.ts`, `src/lib/ministack/service-map.ts`, `src/lib/ministack/browser-actions.ts` (~750 lines — all SDK logic, browser-safe).
- New files: `src/components/ministack/MiniStackConfigDialog.tsx`, `src/components/ministack/MiniStackPanel.tsx`, `src/components/ministack/MiniConsoleDialog.tsx`, `src/components/ministack/consoles/` (8 console components).
- New files: `src/components/diagram/nodes/TrafficSourceNode.tsx`, `src/lib/simulation/ministack-executor.ts`.
- API routes retained but no longer called by the UI: `src/app/api/ministack/{deploy,health,logs,resource,teardown}`.
- `AppNodeData` extended with `ministack?: MiniStackNodeState`.
- Store extended with `ministackConfig`, `setMinistackConfig`, `setNodeMinistackState`, `resetAllMinistackStates`.
- New dependencies: `@aws-sdk/client-s3`, `@aws-sdk/client-sqs`, `@aws-sdk/client-dynamodb`, `@aws-sdk/client-lambda`, `@aws-sdk/client-sns`, `@aws-sdk/client-api-gateway`, `@aws-sdk/client-eventbridge`, `@aws-sdk/client-iam`, `@aws-sdk/client-secrets-manager`, `@aws-sdk/client-ssm`, `@aws-sdk/client-kinesis`, `@aws-sdk/client-cloudwatch-logs`, `@aws-sdk/client-kms`.

---

## [0.7.0] - 2026-05-05

### Added

**Terraform IaC Generation**

- **HashiCorp Terraform code generation** — Export your AWS architecture diagram directly as production-ready HCL (`.tf`). Generates `main.tf` (provider block + one resource per AWS node + `depends_on` inferred from edges), `variables.tf`, and `outputs.tf`.
- **Cloud-agnostic IaC abstraction** — `IaCGenerator` interface decouples the generator from Terraform so CDK, Pulumi, or CloudFormation can be added as future providers without touching the UI.
- **60+ AWS → Terraform resource mappings** — Covers EC2, Lambda, RDS, DynamoDB, S3, VPC, ALB, API Gateway, CloudFront, Route 53, SQS, SNS, EKS, ECS, ElastiCache, ECR, and more. Each mapping includes default required args and exportable output attributes.
- **AI-enhanced generation** — `/api/generate-terraform` route combines Gemini 2.5 Flash with the HashiCorp Terraform MCP server (`docker run -i --rm hashicorp/terraform-mcp-server`) to enrich the output with real provider schemas, IAM roles, and security groups. Falls back to static generation when AI is unavailable.
- **Monaco Editor with HCL syntax** — Dedicated `TerraformEditor` component with full HCL/Terraform language registration (keywords, tokenizer, bracket matching, auto-close, snippet completions) and two custom themes: `terraform-dark` (`#1a1a2e` background) and `terraform-light` (`#faf5ff` background), both using Terraform purple (`#7B42BC`) accents.
- **Editor theme toggle** — Three-button segmented control in the file tabs bar: Monitor (sync with app theme), Sun (force light), Moon (force dark). Fixed a bug where custom Monaco themes weren't applied after HMR reloads by moving `defineTheme` calls before the language-registration guard.
- **TerraformPanel** — Slide-in sheet panel (right side, `z-[9999]`, rendered via React Portal) with:
  - *Code tab*: Monaco editor with `main.tf` / `variables.tf` / `outputs.tf` file subtabs, copy, and download buttons.
  - *Resources tab*: list of all generated Terraform resources with type chips and click-to-navigate.
  - *Settings tab*: AWS region selector, provider version selector, resource summary, and quick actions.
  - Fullscreen mode (toggle button + Esc key to exit).
  - "AI Enhance" button in the header and "Generate with AI" primary action in the footer.
  - Empty state illustration when no AWS nodes are present.
- **Terraform button in UnifiedToolbar** — `SiTerraform` icon with purple gradient active state; export dropdown gains a "Terraform (.tf)" entry for quick download without opening the panel.
- **IaC config in PropertiesPanel** — Collapsible "Infrastructure as Code" section for `aws-*` nodes: auto-detected resource type, editable resource name (shown as `resource_type.resource_name` HCL reference), and exported attributes chips. Persisted to `node.data.iacConfig.terraform`.

### Fixed

- Suppressed false-positive React Flow `nodeTypes` warning in development by disabling React Strict Mode (`reactStrictMode: false`).

### Technical

- New files: `src/lib/iac/types.ts`, `src/lib/iac/terraform/resource-map.ts`, `src/lib/iac/terraform/generator.ts`, `src/lib/iac/terraform/index.ts`, `src/lib/mcp/terraform-client.ts`, `src/lib/export/terraform.ts`, `src/app/api/generate-terraform/route.ts`, `src/components/diagram/TerraformEditor.tsx`, `src/components/diagram/TerraformPanel.tsx`.
- New dependency: `@monaco-editor/react ^4.7.0`.
- `AppNodeData` extended with `iacConfig?: { terraform?: TerraformNodeConfig }`.

---

## [0.6.0] - 2026-05-04

### Added

**Simulation Engine — Phase 2 (Live Traffic & Fault Injection)**

- **Typed edge status in callbacks** — Engine now emits per-edge status (`active` / `error` / `throttled`) on every tick, enabling real-time traffic visualization directly on diagram edges.
- **Per-edge HTTP traffic visualization** — Edges pulse with colors during simulation: green (active), red (error/killed), orange (throttled). All colored edges have a glow effect. Implemented in `FlowCanvas` via `activeSimulationEdges` map in the Zustand store.
- **SimulationMetrics panel** — Popover accessible from the SimulationControls bar showing a table with Node | Requests | Err% | p95 Latency | Throttled | Cache Hit% | Est. Cost columns. Includes a summary bar (total requests, error rate, cumulative cost).
- **TraceViewer panel** — Popover showing completed request traces as expandable waterfall rows. Each hop displays node label, latency bar, and status icon. Clear button resets trace history.
- **Fault Injection — Kill Service** — New "Kill / Restore" toggle in the Properties Panel (visible during simulation). Killed nodes immediately emit `ServiceUnavailableException`; inbound edges turn red. `killedNodes` count badge shown in the SimulationControls bar.
- **Traffic Multiplier** — 1×, 2×, 5× traffic buttons in the SimulationControls bar multiply the request spawn rate without restarting the simulation.
- **Live property updates during simulation** — Changing Latency (ms) or Failure Rate (%) sliders in the Properties Panel while the simulation is running takes effect on the very next tick. A green "Live" indicator appears on the mock config section when `isPlaying`. Implemented via `updateNodes()` on `SimulationEngine` and a `useDiagramStore.subscribe` watcher in the facade.
- **Quick Start traffic banner** — When a Client or Gateway node is selected and no `requestsPerSecond` is configured, the Properties Panel shows a banner with "5 req/s" and "20 req/s buttons to instantly set up traffic and run the simulation.
- **AWS service behavior profiles** — `aws-behaviors.ts` defines realistic latency distributions, failure modes, throttle error codes, concurrency limits, and per-request cost estimates for Lambda, API Gateway, DynamoDB, S3, SQS, SNS, ElastiCache, RDS, ECS, and more.

**Templates**

- **Serverless Circuit Breaker** — Lambda-based CB wrapper reading breaker state from DynamoDB; downstream Orders Lambda pre-configured with 65% failure rate; fallback via ElastiCache; CloudWatch → SNS trip alert. Client pre-configured at 8 req/s.
- **ECS Microservices + Circuit Breaker** — App Mesh (Envoy proxy) routing between Orders and Payment services. Payment pre-configured with 70% failure and 1.2 s latency; fallback replica at 5% failure. X-Ray traces + CloudWatch EMF observability. Client pre-configured at 10 req/s.
- **Additional AWS templates** — Static Website (S3 + CloudFront + Route 53), ECS Fargate App, ML Training Pipeline (SageMaker), Multi-Region Disaster Recovery.
- **Additional Azure templates** — Three-Tier Web App (Front Door + App Service + SQL), Serverless Functions (Event Hub + Azure Functions + Cosmos DB).
- **Generic ER Diagram** — Users / Orders / Products / OrderItems schema ready for SQL DDL export.

**Editor**

- **Node Grouping / Ungrouping** — Select multiple nodes and group them under a `FrameNode` parent via the toolbar. Ungroup detaches children.
- **SQL DDL Export** — Export ER diagrams as `CREATE TABLE` SQL from the export dropdown.
- **Minimap + Layout controls** — Mini-map overlay and one-click auto-layout in the canvas toolbar.
- **Custom pen cursor for laser pointer** — Laser pointer mode now uses a custom SVG cursor for better visual clarity.

### Fixed

- Removed stale `require()` call in `CloudNode` that broke the metrics badge.
- Fixed `getSnapshot` infinite loop in `SimulationMetrics` caused by returning a new object from the Zustand selector on every render — split into three separate primitive selectors.
- Fixed `activeEdgeIds` being emitted by the engine but never reaching the canvas — wired via `setActiveSimulationEdges` in the store facade.
- Unparent children nodes when a parent `FrameNode` is deleted to prevent ReactFlow orphan errors.

### Technical

- `SimulationEngine` fields `_nodes` / `_edges` are now instance-level; `updateNodes()` allows hot-swapping the node array mid-simulation.
- New store fields: `killedNodes: Set<string>`, `trafficMultiplier: number`, `activeSimulationEdges: Map<string, "active"|"error"|"throttled">`, `simulationTraces: RequestTrace[]`.
- New store actions: `toggleKillNode`, `setTrafficMultiplier`, `setActiveSimulationEdges`, `addSimulationTraces`, `clearSimulationTraces`, `updateNodeMetrics`.
- New components: `SimulationMetrics`, `TraceViewer`.
- New files: `src/lib/simulation/SimulationEngine.ts`, `src/lib/simulation/aws-behaviors.ts`.
- `NodeSimulationStatus` extended with `requestCount`, `errorCount`, `latencies`, `queueDepth`, `cacheHits`, `cacheMisses`, `throttleCount`, `activeConcurrency`, `cumulativeCostUsd`.

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
