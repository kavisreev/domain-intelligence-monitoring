export type WebsiteStatusType = 'UP' | 'DOWN';

export type DnsStatusType = 'RESOLVED' | 'FAILED' | 'PENDING';

export type SslStatusType = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'INVALID' | 'NOT_APPLICABLE';

export interface DnsRecord {
  address: string;
  family: number;
}

export interface DnsInfo {
  domain: string;
  ipAddress: string;
  dnsStatus: DnsStatusType;
  resolutionTimeMs: number;
  records: DnsRecord[];
  error?: string;
}

export interface SslInfo {
  sslStatus: SslStatusType;
  expiryDate: string | null;
  issuedDate: string | null;
  daysRemaining: number | null;
  isExpiringSoon: boolean;
  issuer: string | null;
  subject: string | null;
  protocol: string | null;
  cipher: string | null;
  error?: string;
}

export interface WebsiteCheckResult {
  url: string;
  normalizedUrl: string;
  domain: string;
  timestamp: string;
  status: WebsiteStatusType;
  httpStatusCode: number | null;
  httpStatusText: string;
  responseTimeMs: number;
  dns: DnsInfo;
  ssl: SslInfo;
  error?: string;
}

export interface MonitoringHistoryItem {
  id: string;
  timestamp: string;
  website: string;
  status: WebsiteStatusType;
  responseTime: number;
  httpStatusCode: number | null;
  httpStatusText: string;
  dnsStatus: DnsStatusType;
  sslStatus: SslStatusType;
  error?: string;
}

export interface ResponseTimeDataPoint {
  id: string;
  timestamp: string;
  timeLabel: string;
  responseTime: number;
  status: WebsiteStatusType;
  statusCode: number | null;
}
