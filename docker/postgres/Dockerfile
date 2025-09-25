# Use the official PostgreSQL image as a base
FROM postgres:16-alpine

# Set environment variables for PostgreSQL
ENV POSTGRES_DB=klankern_db
ENV POSTGRES_USER=klankern_user
ENV POSTGRES_PASSWORD=klankern_password

# Copy the initialization script
COPY init.sql /docker-entrypoint-initdb.d/

# Expose the PostgreSQL port
EXPOSE 5432