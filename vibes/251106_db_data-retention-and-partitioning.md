# Database Data Retention and Partitioning Guide

This document outlines recommended data retention policies and table partitioning strategies for the Klankern application database.

## Data Retention Policies

Data retention policies help prevent database bloat, ensure compliance with data protection laws, and maintain optimal database performance.

### Session Cleanup

**Recommended Schedule:** Daily

```sql
-- Delete expired sessions (run daily)
DELETE FROM sessions WHERE expires_at < now() - INTERVAL '7 days';
```

**Implementation:**
- Create a cron job or scheduled task to run this cleanup daily
- Consider keeping expired sessions for 7 days for security analysis
- Monitor deletion counts to track user activity patterns

### Audit Log Retention

**Recommended Schedule:** Monthly

```sql
-- Archive audit logs older than 1 year to separate table or cold storage
-- Option 1: Move to archive table
INSERT INTO audit_log_archive
SELECT * FROM audit_log
WHERE created_at < now() - INTERVAL '1 year';

DELETE FROM audit_log
WHERE created_at < now() - INTERVAL '1 year';

-- Option 2: Export to S3/object storage and then delete
-- (Implementation depends on infrastructure)
```

**Retention Period:**
- Keep active audit logs for 1 year (adjustable based on compliance requirements)
- Archive older logs to cold storage (S3, archive table, etc.)
- Minimum 3-year retention for compliance purposes

### Soft Delete Cleanup

**Recommended Schedule:** Weekly

```sql
-- Hard delete soft-deleted records after 30 days
DELETE FROM families WHERE deleted_at < now() - INTERVAL '30 days' AND deleted_at IS NOT NULL;
```

**Implementation:**
- Run weekly to keep soft-deleted data available for recovery
- 30-day window allows users to recover accidentally deleted data
- Extend to other tables with soft delete patterns

### Old Posts Archival

**Recommended Schedule:** Quarterly

```sql
-- Archive corkboard posts older than 2 years
-- Move to archive table or cold storage
INSERT INTO corkboard_posts_archive
SELECT * FROM corkboard_posts
WHERE created_at < now() - INTERVAL '2 years';

DELETE FROM corkboard_posts
WHERE created_at < now() - INTERVAL '2 years';
```

**Retention Period:**
- Keep active posts for 2 years (configurable per family preferences)
- Archive older posts to separate storage
- Provide user interface for accessing archived content

## Table Partitioning

Table partitioning improves query performance on large tables by dividing them into smaller, more manageable pieces. Implement partitioning when tables grow beyond 1 million rows.

### Sessions Table Partitioning

**Partition Strategy:** Range partitioning by `expires_at`

**When to Implement:** When sessions table exceeds 1M rows

```sql
-- Create partitioned sessions table
CREATE TABLE sessions_partitioned (
    id uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL UNIQUE,
    expires_at timestamp NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text,
    last_activity_at timestamp,
    device_fingerprint text,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) PARTITION BY RANGE (expires_at);

-- Create monthly partitions
CREATE TABLE sessions_2024_01 PARTITION OF sessions_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE sessions_2024_02 PARTITION OF sessions_partitioned
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Continue for each month...

-- Automate partition creation with cron job
```

**Benefits:**
- Faster queries filtering by expiration date
- Easier deletion of old sessions (drop entire partition)
- Better index performance on active sessions

**Maintenance:**
- Create new partitions monthly (automate with cron)
- Drop old partitions after retention period
- Monitor partition sizes

### Corkboard Posts Partitioning

**Partition Strategy:** Range partitioning by `created_at`

**When to Implement:** When corkboard_posts table exceeds 1M rows

```sql
-- Create partitioned corkboard_posts table
CREATE TABLE corkboard_posts_partitioned (
    id uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
    user_id uuid NOT NULL,
    family_id uuid,
    type text NOT NULL,
    data jsonb,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL
) PARTITION BY RANGE (created_at);

-- Create yearly partitions
CREATE TABLE corkboard_posts_2024 PARTITION OF corkboard_posts_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE corkboard_posts_2025 PARTITION OF corkboard_posts_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Continue for each year...
```

**Benefits:**
- Faster queries filtering by date ranges
- Easier archival of old posts (detach and archive partition)
- Better performance for recent posts queries

### Audit Log Partitioning

**Partition Strategy:** Range partitioning by `created_at`

**When to Implement:** When audit_log table exceeds 5M rows

```sql
-- Create partitioned audit_log table
CREATE TABLE audit_log_partitioned (
    id uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    old_values jsonb,
    new_values jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp DEFAULT now() NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE audit_log_2024_01 PARTITION OF audit_log_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Continue for each month...
```

**Benefits:**
- Much faster queries on recent audit events
- Easy archival by detaching old partitions
- Critical for maintaining audit performance at scale

## Implementation Timeline

### Phase 1: Data Retention (Immediate)
1. Implement session cleanup job (daily)
2. Implement soft delete cleanup (weekly)
3. Document retention policies

### Phase 2: Advanced Retention (3-6 months)
1. Implement audit log archival (monthly)
2. Implement posts archival (quarterly)
3. Set up monitoring for cleanup jobs

### Phase 3: Partitioning (As Needed)
1. Monitor table sizes
2. Implement partitioning when thresholds reached
3. Test partition strategy in staging
4. Migrate production tables with zero downtime

## Monitoring

Track these metrics to determine when to implement policies:

- **Table Sizes:** Monitor row counts and disk usage
- **Query Performance:** Track slow queries on large tables
- **Cleanup Metrics:** Log deleted row counts
- **Archive Size:** Monitor archived data growth

## References

- PostgreSQL Partitioning: https://www.postgresql.org/docs/current/ddl-partitioning.html
- GDPR Retention Requirements: https://gdpr.eu/data-retention/
- Database Archival Best Practices: https://www.postgresql.org/docs/current/backup.html
