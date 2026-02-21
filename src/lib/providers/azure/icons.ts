import { IconComponent } from '../types';
import { VscAzure, VscAzureDevops } from 'react-icons/vsc';
import {
    AzFunctions, AzAppService, CosmosDBcolor, AzSQLDatabase, AzMySQLClearDB, ActiveDirectory, AzKeyVault,
    AzContainerService, AzContainerRegistry, AzVMSymbol, AzVMScaleSet, AzStorageBlob, AzVirtualNetwork,
    AzVPNGateway, AzApplicationGateway, AzMonitor, AzApplicationInsights, AzDatabricks, AzDataFactory,
    AzMachineLearning, AzLogicApps, AzServiceBus, AzVirtualDatacenter, AzMonitor as MonitorIcon
} from 'azure-react-icons';
import { Shield, BrainCircuit, Bot, Search, Zap, BarChart3, Cloud, LayoutTemplate, Link, FileCode2, Container, Layers, Folder, Share2 } from 'lucide-react';

export const getAzureIcon = (service: string, type: string, subtype?: string): IconComponent => {
    const normalizedService = service?.toLowerCase().replace(/\s+/g, '') || '';
    const normalizedType = type?.toLowerCase() || '';

    // Direct service specific mappings
    const serviceMap: Record<string, IconComponent> = {
        'functions': AzFunctions,
        'appservice': AzAppService,
        'cosmosdb': CosmosDBcolor,
        'sql': AzSQLDatabase,
        'postgres': AzSQLDatabase,
        'mysql': AzMySQLClearDB,
        'mariadb': AzMySQLClearDB,
        'entraid': ActiveDirectory,
        'keyvault': AzKeyVault,
        'defender': Shield,
        'devops': VscAzureDevops,
        'aks': AzContainerService,
        'aci': AzContainerService,
        'acr': AzContainerRegistry,
        'containerapps': AzContainerService,
        'vm': AzVMSymbol,
        'vmss': AzVMScaleSet,
        'blob': AzStorageBlob,
        'files': Folder,
        'vnet': AzVirtualNetwork,
        'loadbalancer': Share2,
        'appgateway': AzApplicationGateway,
        'vpngateway': AzVPNGateway,
        'openai': BrainCircuit,
        'cognitive': BrainCircuit,
        'ml': AzMachineLearning,
        'botservice': Bot,
        'search': Search,
        'synapse': Zap,
        'databricks': AzDatabricks,
        'datafactory': AzDataFactory,
        'powerbi': BarChart3,
        'monitor': AzMonitor,
        'appinsights': AzApplicationInsights,
        'frontdoor': AzVirtualNetwork,
        'logicapps': AzLogicApps,
        'servicebus': AzServiceBus,
        'staticwebapps': AzAppService,
    };

    if (serviceMap[normalizedService]) {
        return serviceMap[normalizedService];
    }

    // Fallback to category based icons
    const typeMap: Record<string, IconComponent> = {
        'azure-compute': AzVMSymbol,
        'azure-database': AzSQLDatabase,
        'azure-storage': AzStorageBlob,
        'azure-network': AzVirtualNetwork,
        'azure-ai': BrainCircuit,
        'azure-analytics': BarChart3,
        'azure-integration': AzLogicApps,
        'azure-security': Shield,
        'azure-devops': VscAzureDevops,
        'azure-management': AzMonitor,
        'azure-containers': AzContainerService,
        'azure-web': AzAppService,
    };

    if (typeMap[normalizedType]) {
        return typeMap[normalizedType];
    }

    return VscAzure;
};
