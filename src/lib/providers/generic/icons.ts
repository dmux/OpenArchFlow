import { IconComponent } from "../types";
import {
  User,
  Smartphone,
  Globe,
  Monitor,
  Cpu,
  Frame,
  MessageSquare,
  Box,
  Square,
  Database,
  File,
  Play,
  HelpCircle,
  Activity,
  Layers,
  Shield,
  Table2,
  Rows3,
} from "lucide-react";
import {
  ArchitectureGroupRegion,
  ArchitectureGroupVirtualprivatecloudVPC,
  ArchitectureGroupPublicsubnet,
  ArchitectureGroupPrivatesubnet,
  ArchitectureGroupAWSCloud,
  ArchitectureGroupCorporatedatacenter,
  ArchitectureGroupAWSAccount,
} from "aws-react-icons";

const AWS_FRAME_ICONS: Record<string, IconComponent> = {
  "aws-region": ArchitectureGroupRegion,
  "aws-vpc": ArchitectureGroupVirtualprivatecloudVPC,
  "aws-subnet-public": ArchitectureGroupPublicsubnet,
  "aws-subnet-private": ArchitectureGroupPrivatesubnet,
  "aws-az": Layers,
  "aws-internet": ArchitectureGroupAWSCloud,
  "aws-on-premises": ArchitectureGroupCorporatedatacenter,
  "aws-security-zone": Shield,
  "aws-account": ArchitectureGroupAWSAccount,
};

export const getGenericIcon = (
  service: string,
  type: string,
  subtype?: string,
): IconComponent => {
  const normalizedService = service?.toLowerCase().replace(/\s+/g, "") || "";

  if (type === "frame") {
    return AWS_FRAME_ICONS[normalizedService] || Frame;
  }
  if (type === "note" || type === "annotation") return MessageSquare;
  if (type === "table") return Table2;
  if (type === "swimlane") return Rows3;

  if (type === "generic") {
    const normalizedSubtype = subtype?.toLowerCase() || "";
    switch (normalizedSubtype) {
      case "process":
        return Square;
      case "database":
        return Database;
      case "file":
        return File;
      case "start-end":
        return Play;
      case "decision":
        return HelpCircle;
      case "actor":
        return User;
      default:
        return Activity;
    }
  }

  const serviceMap: Record<string, IconComponent> = {
    user: User,
    browser: Globe,
    mobile: Smartphone,
    client: Monitor,
    "iot-device": Cpu,
  };

  if (serviceMap[normalizedService]) {
    return serviceMap[normalizedService];
  }

  return Box;
};
