#!/bin/bash
set -e

# Ensure the Spark bin directories are in the PATH
export PATH="/home/glue_user/spark/bin:/home/glue_user/maven/bin:${PATH}"

# Run the command passed by MiniStack (typically spark-submit)
# and pipe both stdout and stderr through the python log forwarder.
exec "$@" 2>&1 | python3 /opt/glue/bin/forward_logs.py
