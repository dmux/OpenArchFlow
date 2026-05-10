import { ServiceCategory } from "../types";

export const GENERIC_SERVICES: ServiceCategory[] = [
  {
    category: "Simulation",
    items: [
      {
        name: "Traffic Source",
        service: "traffic-source",
        type: "traffic-source",
        description:
          "Simulated traffic entry point. Generates requests at a configurable rate. Connect to any service node. Set req/s in the mock panel.",
      },
    ],
  },
  {
    category: "Diagram Tools",
    items: [
      {
        name: "Frame/Group",
        service: "frame",
        type: "frame",
        description: "Groups multiple components together visually.",
      },
      {
        name: "Swimlane",
        service: "swimlane",
        type: "swimlane",
        description:
          "Horizontal or vertical swimlane diagram with configurable lanes.",
      },
      {
        name: "Sticky Note",
        service: "note",
        type: "note",
        description: "Add text notes or annotations to your diagram.",
      },
      {
        name: "Table (ER/DDL)",
        service: "table",
        type: "table",
        description:
          "Database table with columns for ER diagrams and SQL DDL export.",
      },
      {
        name: "Custom Element",
        service: "generic",
        type: "generic",
        subtype: "custom",
        description: "A fully customizable generic component.",
      },
      {
        name: "Process",
        service: "generic",
        type: "generic",
        subtype: "process",
        description: "A generic process step or action.",
      },
      {
        name: "Database",
        service: "generic",
        type: "generic",
        subtype: "database",
        description: "A generic data store or database.",
      },
      {
        name: "File",
        service: "generic",
        type: "generic",
        subtype: "file",
        description: "Represents a file or document.",
      },
      {
        name: "Start/End",
        service: "generic",
        type: "generic",
        subtype: "start-end",
        description: "Start or end point of a flow.",
      },
      {
        name: "Decision",
        service: "generic",
        type: "generic",
        subtype: "decision",
        description: "A decision point or condition.",
      },
      {
        name: "Actor",
        service: "generic",
        type: "generic",
        subtype: "actor",
        description: "A user, actor, or lane.",
      },
    ],
  },
  {
    category: "AWS Architecture",
    items: [
      {
        name: "AWS Region",
        service: "aws-region",
        type: "frame",
        subtype: "region",
        description:
          "An AWS geographic region containing multiple Availability Zones.",
      },
      {
        name: "AWS Account",
        service: "aws-account",
        type: "frame",
        subtype: "account",
        description:
          "An AWS account boundary for resource isolation and billing.",
      },
      {
        name: "VPC",
        service: "aws-vpc",
        type: "frame",
        subtype: "vpc",
        description:
          "Virtual Private Cloud — logically isolated section of the AWS Cloud.",
      },
      {
        name: "Availability Zone",
        service: "aws-az",
        type: "frame",
        subtype: "availability-zone",
        description:
          "An isolated location within a region for fault-tolerant deployments.",
      },
      {
        name: "Public Subnet",
        service: "aws-subnet-public",
        type: "frame",
        subtype: "subnet-public",
        description:
          "A subnet with a route to the Internet Gateway — hosts public-facing resources.",
      },
      {
        name: "Private Subnet",
        service: "aws-subnet-private",
        type: "frame",
        subtype: "subnet-private",
        description:
          "A subnet without a direct internet route — hosts internal/backend resources.",
      },
      {
        name: "Internet",
        service: "aws-internet",
        type: "frame",
        subtype: "internet",
        description: "Represents the public internet or AWS Cloud boundary.",
      },
      {
        name: "On-Premises",
        service: "aws-on-premises",
        type: "frame",
        subtype: "on-premises",
        description:
          "Corporate data center or on-premises environment connected via VPN or Direct Connect.",
      },
      {
        name: "Security Zone",
        service: "aws-security-zone",
        type: "frame",
        subtype: "security-zone",
        description:
          "A DMZ or security perimeter grouping security-sensitive components.",
      },
    ],
  },
  {
    category: "UML Sequence",
    items: [
      {
        name: "Actor",
        service: "uml-actor",
        type: "sequence-actor",
        description: "UML sequence diagram actor or participant.",
      },
      {
        name: "System",
        service: "uml-system",
        type: "sequence-actor",
        subtype: "system",
        description: "External system or boundary in a sequence diagram.",
      },
    ],
  },
  {
    category: "Client & Devices",
    items: [
      {
        name: "User",
        service: "user",
        type: "client",
        description: "Represents an end user interacting with the system.",
      },
      {
        name: "Browser",
        service: "browser",
        type: "client",
        description: "Web browser client for accessing applications.",
      },
      {
        name: "Mobile App",
        service: "mobile",
        type: "client",
        description: "Native or hybrid mobile application.",
      },
      {
        name: "Client App",
        service: "client",
        type: "client",
        description: "General purpose client application or software.",
      },
      {
        name: "IoT Device",
        service: "iot-device",
        type: "client",
        description: "Internet of Things device or sensor.",
      },
    ],
  },
];
