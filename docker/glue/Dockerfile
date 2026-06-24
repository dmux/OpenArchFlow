FROM amazon/aws-glue-libs:glue_libs_4.0.0_image_01

USER root

# Copy forwarder script and entrypoint wrapper
COPY forward_logs.py /opt/glue/bin/forward_logs.py
COPY entrypoint.sh /opt/glue/bin/entrypoint.sh

RUN chmod +x /opt/glue/bin/forward_logs.py /opt/glue/bin/entrypoint.sh

# Revert to the default non-root user of aws-glue-libs
USER glue_user

ENTRYPOINT ["/opt/glue/bin/entrypoint.sh"]
