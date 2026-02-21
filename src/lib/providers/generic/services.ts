import { ServiceCategory } from '../types';

export const GENERIC_SERVICES: ServiceCategory[] = [
    {
        category: "Diagram Tools",
        items: [
            { name: "Frame/Group", service: "frame", type: "frame", description: "Groups multiple components together visually." },
            { name: "Sticky Note", service: "note", type: "note", description: "Add text notes or annotations to your diagram." },
            { name: "Process", service: "generic", type: "generic", subtype: "process", description: "A generic process step or action." },
            { name: "Database", service: "generic", type: "generic", subtype: "database", description: "A generic data store or database." },
            { name: "File", service: "generic", type: "generic", subtype: "file", description: "Represents a file or document." },
            { name: "Start/End", service: "generic", type: "generic", subtype: "start-end", description: "Start or end point of a flow." },
            { name: "Decision", service: "generic", type: "generic", subtype: "decision", description: "A decision point or condition." },
            { name: "Actor", service: "generic", type: "generic", subtype: "actor", description: "A user, actor, or lane." },
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
];
