import { Database, FileJson, Server, Layers, Archive, Activity, Zap, HardDrive, BarChart3, Workflow } from 'lucide-react';

export const AWS_DEA_PROMPTS = [
    {
        icon: Database,
        title: "Transactional Data Lakehouse",
        prompt: "Design a transactional data lakehouse using AWS Lake Formation and Amazon S3. Ingest data from RDS PostgreSQL using AWS Glue. Use Apache Iceberg format for the S3 data lake to support ACID transactions. Provide access to data via Amazon Athena for ad-hoc queries and Amazon Redshift Spectrum for data warehousing workloads."
    },
    {
        icon: Activity,
        title: "Real-time Log Analytics",
        prompt: "Architect a real-time log analytics pipeline. Logs are streamed from EC2 instances using Kinesis Agent to Kinesis Data Streams. Use Kinesis Data Firehose to transform (convert to Parquet) and deliver logs to S3. Use Amazon OpenSearch Service for real-time indexing and visualization (Kibana) of the logs, ingesting directly from Kinesis Data Streams or via Lambda."
    },
    {
        icon: Workflow,
        title: "Glue ETL Orchestration",
        prompt: "Create an ETL workflow orchestration using AWS Glue Workflows. The workflow should start with a Glue Crawler scanning a landing zone S3 bucket. Upon completion, trigger a Glue Job to clean and transform the data (PySpark). Finally, trigger another Glue Job to load the processed data into a Redshift data warehouse. Use Glue Triggers to manage dependencies."
    },
    {
        icon: FileJson,
        title: "Serverless CDC Pipeline",
        prompt: "Design a generic ongoing replication pipeline using AWS DMS (Database Migration Service) to capture changes (CDC) from an on-premises Oracle database. The target is an S3 bucket (raw layer). Trigger a Lambda function upon new object arrival in S3 to parse the CDC records and update a target DynamoDB table for a real-time view of the data."
    },
    {
        icon: HardDrive,
        title: "Redshift Data Sharing",
        prompt: "Architect a multi-cluster Redshift environment using Redshift Data Sharing. You have a central 'Producer' Redshift Serverless workgroup that ingests and transforms data. You have multiple 'Consumer' Redshift Provisioned clusters for different business units (Marketing, Sales). Configure Data Sharing so consumers can query live data from the producer without copying it."
    },
    {
        icon: Layers,
        title: "Data Mesh with DataZone",
        prompt: "Implement a Data Mesh architecture using Amazon DataZone. Define a 'Sales' Domain and a 'Marketing' Domain. The Sales domain publishes a data product (revenue table in Glue Data Catalog) to the DataZone catalog. The Marketing domain subscribes to this product. Use Lake Formation tags to enforce fine-grained access control on the shared assets."
    }
];
