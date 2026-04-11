FROM oven/bun:1

COPY --from=clockworklabs/spacetime:latest /opt/spacetime/spacetimedb-cli /usr/local/bin/spacetime

RUN chmod +x /usr/local/bin/spacetime
