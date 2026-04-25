# AgriReports Monitoring with Prometheus & Grafana

## Overview

Production-grade monitoring system using **Prometheus** for metrics collection and **Grafana** for visualization, providing real-time insights into application performance, business metrics, and infrastructure health.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AgriReports Application                  │
│                                                             │
│  API Routes → Metrics Middleware → Prometheus Metrics      │
│                                                             │
│  /api/metrics endpoint exposes all metrics                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Scrapes every 10-15s
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                         Prometheus                          │
│                                                             │
│  - Collects metrics from /api/metrics                      │
│  - Stores time-series data                                 │
│  - Evaluates alerting rules                                │
│  - Port: 9090                                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Query metrics
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                          Grafana                            │
│                                                             │
│  - Visualizes metrics from Prometheus                      │
│  - Pre-built dashboards                                    │
│  - Alerting and notifications                              │
│  - Port: 3001                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Metrics Collected

### 1. HTTP Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests by method, route, status |
| `http_request_duration_seconds` | Histogram | Request latency (P50, P95, P99) |
| `http_errors_total` | Counter | HTTP errors (4xx, 5xx) by type |

**Example Query:**
```promql
# Request rate (requests per second)
rate(http_requests_total[5m])

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### 2. Report Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `reports_created_total` | Counter | Reports created by period, category, role |
| `reports_submitted_total` | Counter | Reports submitted for review |
| `reports_reviewed_total` | Counter | Reviews by decision (approved/rejected) |
| `report_processing_time_seconds` | Histogram | Time from creation to submission |

**Example Query:**
```promql
# Reports created in last 24 hours
increase(reports_created_total[24h])

# Approval rate
sum(reports_reviewed_total{decision="approved"}) / sum(reports_reviewed_total) * 100
```

### 3. Notification Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `notifications_sent_total` | Counter | Notifications by channel, event, status |
| `notification_delivery_time_seconds` | Histogram | Time to send notifications |
| `notification_failures_total` | Counter | Failed notifications by channel, error |

**Example Query:**
```promql
# Notification success rate
sum(rate(notifications_sent_total{status="success"}[5m])) / sum(rate(notifications_sent_total[5m])) * 100

# Email vs WhatsApp volume
rate(notifications_sent_total[5m])
```

### 4. Queue Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `queue_jobs_total` | Counter | Jobs processed by queue, status |
| `queue_job_duration_seconds` | Histogram | Job processing time |
| `queue_depth` | Gauge | Current waiting jobs by queue |

**Example Query:**
```promql
# Queue depth (backlog)
queue_depth

# Job completion rate
rate(queue_jobs_total{status="completed"}[5m])
```

### 5. Database Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `database_query_duration_seconds` | Histogram | Query latency by operation, table |
| `database_connections_active` | Gauge | Active database connections |

**Example Query:**
```promql
# P95 query latency
histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m]))
```

### 6. Authentication Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `auth_login_attempts_total` | Counter | Login attempts by status |
| `auth_active_sessions` | Gauge | Current active sessions |

**Example Query:**
```promql
# Login success rate
sum(rate(auth_login_attempts_total{status="success"}[5m])) / sum(rate(auth_login_attempts_total[5m])) * 100
```

### 7. System Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `process_cpu_percent` | Gauge | CPU usage |
| `process_resident_memory_bytes` | Gauge | Memory usage |
| `nodejs_*` | Various | Node.js runtime metrics |

---

## Quick Start

### 1. Start Monitoring Stack

```bash
cd monitoring
docker-compose up -d
```

**Services Started:**
- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3001 (admin/admin123)
- **Redis:** localhost:6379

### 2. Verify Metrics Endpoint

```bash
curl http://localhost:3000/api/metrics
```

**Expected Output:**
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/v1/reports",status_code="200"} 150

# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/api/v1/reports",status_code="200",le="0.01"} 50
...
```

### 3. Access Prometheus

Open http://localhost:9090

**Try these queries:**
```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_errors_total[5m])

# Active database connections
database_connections_active
```

### 4. Access Grafana

Open http://localhost:3001

**Login:**
- Username: `admin`
- Password: `admin123`

**Import Dashboard:**
1. Go to **Dashboards** → **Browse**
2. Click **Import**
3. Upload `monitoring/grafana-dashboard.json`
4. Select Prometheus data source
5. Click **Import**

---

## Using Metrics Middleware

### Wrap API Routes

```typescript
import { withMetrics } from '@/lib/monitoring/metrics-middleware';

export async function GET(request: NextRequest) {
  return withMetrics(request, async () => {
    // Your route logic
    const reports = await getReports();
    return NextResponse.json({ success: true, data: reports });
  });
}
```

### Record Custom Metrics

```typescript
import { 
  recordReportCreated,
  recordNotificationSent,
  recordLoginAttempt 
} from '@/lib/monitoring/metrics';

// Report created
recordReportCreated('daily', 'Field Ops', 'field_ops_manager');

// Notification sent
recordNotificationSent('email', 'report_submitted', 'success');

// Login attempt
recordLoginAttempt('success');
```

---

## Grafana Dashboards

### Pre-Built Panels

The dashboard includes **16 panels**:

1. **HTTP Request Rate** - Requests per second by route
2. **HTTP Request Duration (P95)** - Latency percentiles
3. **Error Rate** - 4xx and 5xx errors
4. **Reports by Status** - Current report states
5. **Reports Created (24h)** - Creation volume
6. **Reports Reviewed (24h)** - Review decisions pie chart
7. **Notification Success Rate** - Gauge with thresholds
8. **Notifications by Channel** - Email vs WhatsApp
9. **Queue Depth** - Pending jobs
10. **Queue Job Duration** - Processing time
11. **Database Connections** - Active connections
12. **Active Sessions** - Current sessions
13. **Database Query Duration** - Query performance
14. **Login Attempts** - Authentication volume
15. **Memory Usage** - System memory
16. **CPU Usage** - System CPU

### Creating Custom Panels

**Step 1:** Click **Add Panel** → **Add new panel**

**Step 2:** Write PromQL query:
```promql
# Example: Report approval rate over time
sum(rate(reports_reviewed_total{decision="approved"}[5m])) / 
sum(rate(reports_reviewed_total[5m])) * 100
```

**Step 3:** Configure visualization:
- **Panel type:** Graph, Stat, Gauge, Pie Chart, etc.
- **Title:** Descriptive name
- **Thresholds:** Green/Yellow/Red values
- **Unit:** seconds, percent, bytes, etc.

**Step 4:** Save dashboard

---

## Alerting

### Prometheus Alert Rules

Create `monitoring/alert_rules.yml`:

```yaml
groups:
  - name: agrireports-alerts
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(http_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"

      # Queue depth too high
      - alert: HighQueueDepth
        expr: queue_depth > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Queue depth is high"
          description: "Queue has {{ $value }} pending jobs"

      # Notification failure rate
      - alert: HighNotificationFailureRate
        expr: |
          sum(rate(notification_failures_total[5m])) / 
          sum(rate(notifications_sent_total[5m])) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High notification failure rate"
          description: "{{ $value | humanizePercentage }} of notifications failing"

      # Database connections exhausted
      - alert: DatabaseConnectionsHigh
        expr: database_connections_active > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database connections running high"
          description: "{{ $value }} active connections"
```

### Grafana Alerts

**Step 1:** Open dashboard panel

**Step 2:** Click **Alert** tab → **Create Alert**

**Step 3:** Configure:
- **Condition:** Query A is above 100
- **Evaluate every:** 1m
- **For:** 5m
- **Notifications:** Email, Slack, PagerDuty, etc.

---

## Production Deployment

### Docker Compose (Production)

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=90d'  # Keep 90 days
      - '--web.enable-lifecycle'
      - '--web.enable-admin-api'
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_ADMIN_USER}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_SERVER_ROOT_URL=https://grafana.example.com
      - GF_SERVER_PROTOCOL=https
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
        - name: prometheus
          image: prom/prometheus:latest
          ports:
            - containerPort: 9090
          volumeMounts:
            - name: config
              mountPath: /etc/prometheus
            - name: data
              mountPath: /prometheus
          resources:
            requests:
              memory: "2Gi"
              cpu: "1000m"
            limits:
              memory: "4Gi"
              cpu: "2000m"
      volumes:
        - name: config
          configMap:
            name: prometheus-config
        - name: data
          persistentVolumeClaim:
            claimName: prometheus-pvc
```

---

## Monitoring Best Practices

### ✅ Do

1. **Monitor business metrics** (reports created, reviewed, approved)
2. **Set up alerts** for critical issues (high error rate, queue backlog)
3. **Use histograms** for latency (not just averages)
4. **Label metrics properly** (environment, service, region)
5. **Keep retention appropriate** (30-90 days for most metrics)
6. **Dashboard for each audience** (executives, developers, ops)
7. **Test alerts** regularly (don't wait for real incidents)

### ❌ Don't

1. **Don't monitor everything** (focus on what matters)
2. **Don't ignore false positives** (tune alert thresholds)
3. **Don't use counters for gauges** (know the difference)
4. **Don't hardcode thresholds** (use percentiles, not absolutes)
5. **Don't forget capacity planning** (disk space for metrics)
6. **Don't skip documentation** (explain what each metric means)

---

## Troubleshooting

### Prometheus Not Scraping

**Check targets:**
```
http://localhost:9090/targets
```

**Common issues:**
- Wrong metrics endpoint URL
- Application not running
- Network/firewall blocking

**Fix:**
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'agrireports-app'
    metrics_path: '/api/metrics'
    static_configs:
      - targets: ['host.docker.internal:3000']
```

### Grafana Can't Connect to Prometheus

**Check data source:**
1. Go to **Configuration** → **Data Sources**
2. Click **Prometheus**
3. URL should be: `http://prometheus:9090` (Docker) or `http://localhost:9090`
4. Click **Save & Test**

### Metrics Not Showing

**Check metrics endpoint:**
```bash
curl http://localhost:3000/api/metrics
```

**Should return Prometheus-formatted metrics:**
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/v1/reports",status_code="200"} 150
```

**If empty:**
- Check metrics middleware is applied
- Check prom-client is installed
- Check no errors in application logs

### High Memory Usage

**Prometheus consuming too much memory:**
```yaml
# prometheus.yml
global:
  scrape_interval: 30s  # Increase from 15s

command:
  - '--storage.tsdb.retention.time=15d'  # Reduce from 30d
  - '--storage.tsdb.retention.size=2GB'  # Limit size
```

---

## Advanced Topics

### Custom Metrics

**Add custom business metric:**
```typescript
import client from 'prom-client';

export const customMetric = new client.Counter({
  name: 'my_custom_metric_total',
  help: 'Description of what this metric measures',
  labelNames: ['label1', 'label2'],
  registers: [register],
});

// Use it
customMetric.labels('value1', 'value2').inc();
```

### Metric Types

**Counter:** Only increases (resets on restart)
```typescript
const counter = new client.Counter({
  name: 'my_counter_total',
  help: 'Always increasing',
});
counter.inc(); // +1
counter.inc(5); // +5
```

**Gauge:** Can go up or down
```typescript
const gauge = new client.Gauge({
  name: 'my_gauge',
  help: 'Can increase or decrease',
});
gauge.set(100);
gauge.inc();
gauge.dec();
```

**Histogram:** Distribution of values
```typescript
const histogram = new client.Histogram({
  name: 'my_histogram_seconds',
  help: 'Value distribution',
  buckets: [0.1, 0.5, 1, 2, 5], // Bucket boundaries
});
histogram.observe(0.42); // Record value
```

**Summary:** Similar to histogram, but calculates quantiles on client
```typescript
const summary = new client.Summary({
  name: 'my_summary_seconds',
  help: 'Client-side quantiles',
  percentiles: [0.5, 0.9, 0.99],
});
summary.observe(0.42);
```

### Recording Rules

Pre-compute expensive queries:

```yaml
# recording_rules.yml
groups:
  - name: agrireports-recording-rules
    interval: 1m
    rules:
      # Pre-compute request rate
      - record: job:http_requests_total:rate5m
        expr: rate(http_requests_total[5m])

      # Pre-compute error rate
      - record: job:http_errors_total:rate5m
        expr: rate(http_errors_total[5m])
```

---

## Performance Impact

| Metric | Overhead |
|--------|----------|
| Memory | ~50-100MB (metrics registry) |
| CPU | < 1% (counter increments) |
| Disk | ~1-5GB/month (Prometheus storage) |
| Network | ~1MB/scrape (metrics endpoint) |

**Optimization Tips:**
- Increase scrape interval (15s → 30s)
- Reduce metric cardinality (fewer label combinations)
- Use recording rules for expensive queries
- Set appropriate retention periods

---

## Integration with Other Tools

### Slack Notifications

```yaml
# alertmanager.yml
route:
  receiver: slack-notifications
  group_by: ['alertname']

receivers:
  - name: slack-notifications
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ .CommonAnnotations.summary }}'
```

### PagerDuty

```yaml
receivers:
  - name: pagerduty-critical
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
        severity: 'critical'
```

### Email Alerts

Configure in Grafana:
1. **Configuration** → **Notification Channels**
2. Add **Email** channel
3. Configure SMTP settings
4. Use in alert notifications

---

## Next Steps

1. **Start monitoring stack:** `docker-compose up -d`
2. **Access Grafana:** http://localhost:3001
3. **Import dashboard:** `grafana-dashboard.json`
4. **Set up alerts** for critical metrics
5. **Configure notifications** (Slack, email, PagerDuty)
6. **Monitor in production** with proper retention

---

**Implementation Date:** April 21, 2026  
**Technology:** Prometheus + Grafana  
**Total Files Created:** 6  
**Total Lines of Code:** 900+
