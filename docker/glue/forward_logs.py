#!/usr/bin/env python3
import sys
import os
import time
import urllib.request
import boto3

# Discover the working MiniStack endpoint from the sibling container
endpoints = [
    os.environ.get("MINISTACK_ENDPOINT"),
    "http://host.docker.internal:4566",
    "http://172.17.0.1:4566",
    "http://ministack:4566",
    "http://localhost:4566"
]

# Filter valid and unique endpoints preserving order
endpoints = [e for e in endpoints if e]
seen = set()
endpoints = [e for e in endpoints if not (e in seen or seen.add(e))]

endpoint = "http://host.docker.internal:4566"  # fallback default
for ep in endpoints:
    try:
        # Test connection
        urllib.request.urlopen(f"{ep}/", timeout=1)
        endpoint = ep
        sys.stderr.write(f"[log-forwarder] Successfully connected to MiniStack at: {endpoint}\n")
        sys.stderr.flush()
        break
    except Exception:
        continue

log_group = os.environ.get("GLUE_LOG_GROUP", "/aws-glue/jobs/output")
log_stream = os.environ.get("GLUE_LOG_STREAM", "spark-stdout-stream")

# Set up boto3 client pointing to discovered endpoint
client = boto3.client(
    "logs",
    endpoint_url=endpoint,
    region_name=os.environ.get("AWS_DEFAULT_REGION", "us-east-1"),
    aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID", "mock"),
    aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY", "mock")
)

# Ensure group and stream exist
try:
    client.create_log_group(logGroupName=log_group)
except Exception:
    pass

try:
    client.create_log_stream(logGroupName=log_group, logStreamName=log_stream)
except Exception:
    pass

# Pipe stdin to stdout and forward to CloudWatch Logs
try:
    for line in sys.stdin:
        sys.stdout.write(line)
        sys.stdout.flush()
        
        stripped = line.strip()
        if stripped:
            try:
                client.put_log_events(
                    logGroupName=log_group,
                    logStreamName=log_stream,
                    logEvents=[
                        {
                            "timestamp": int(round(time.time() * 1000)),
                            "message": stripped
                        }
                    ]
                )
            except Exception as e:
                # Log send errors to stderr but don't crash
                sys.stderr.write(f"\n[log-forwarder-send-error] {str(e)}\n")
                sys.stderr.flush()
except KeyboardInterrupt:
    pass
except Exception as e:
    sys.stderr.write(f"\n[log-forwarder-error] {str(e)}\n")
    sys.stderr.flush()
