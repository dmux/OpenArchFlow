import { ServiceCategory } from '../types';

/**
 * Services that Databricks Studio can run PySpark code for (via minilake).
 * Keep in sync with the Studio's node filter.
 */
export const DATABRICKS_RUNNABLE_SERVICES = ['databricks-job', 'databricks-notebook'] as const;

export const DATABRICKS_SERVICES: ServiceCategory[] = [
    {
        category: "Compute",
        items: [
            { name: "Workspace", service: "databricks-workspace", type: "databricks-compute", description: "Collaborative environment for notebooks, jobs, clusters and data assets." },
            { name: "Cluster", service: "databricks-cluster", type: "databricks-compute", description: "Managed Apache Spark cluster for interactive and automated workloads." },
            { name: "SQL Warehouse", service: "databricks-sql-warehouse", type: "databricks-compute", description: "Serverless-style compute for SQL queries and BI dashboards." },
        ]
    },
    {
        category: "Data Engineering",
        items: [
            { name: "Job", service: "databricks-job", type: "databricks-orchestration", description: "Scheduled or on-demand workflow that runs PySpark, notebook or SQL tasks. Runnable in Databricks Studio." },
            { name: "Notebook", service: "databricks-notebook", type: "databricks-orchestration", description: "Interactive PySpark/SQL notebook. Runnable in Databricks Studio." },
            { name: "Delta Live Tables", service: "databricks-pipeline", type: "databricks-orchestration", description: "Declarative pipelines for reliable batch and streaming data transformations." },
            { name: "Auto Loader", service: "databricks-autoloader", type: "databricks-orchestration", description: "Incrementally ingests new files from cloud storage into Delta tables." },
        ]
    },
    {
        category: "Data Governance",
        items: [
            { name: "Unity Catalog", service: "databricks-catalog", type: "databricks-governance", description: "Unified governance for data and AI assets across workspaces." },
            { name: "Schema", service: "databricks-schema", type: "databricks-governance", description: "Namespace inside a catalog that groups tables, volumes and functions." },
            { name: "Delta Table", service: "databricks-table", type: "databricks-governance", description: "Open-format table with ACID transactions, time travel and schema enforcement." },
            { name: "Volume", service: "databricks-volume", type: "databricks-governance", description: "Governed storage for non-tabular files such as CSV, images and models." },
        ]
    },
    {
        category: "Machine Learning",
        items: [
            { name: "MLflow", service: "databricks-mlflow", type: "databricks-ml", description: "Experiment tracking and model registry." },
            { name: "Model Serving", service: "databricks-model-serving", type: "databricks-ml", description: "Real-time endpoints for deploying ML and generative AI models." },
        ]
    },
];
