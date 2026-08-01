# WorkforceAP Cursor Cloud / home-lab environment
# Extends the default Cursor agent image with local Postgres for Prisma.

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      postgresql-16 \
      postgresql-client-16 \
    && rm -rf /var/lib/apt/lists/*
