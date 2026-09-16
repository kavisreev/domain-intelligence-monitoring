import dns from 'dns';
import tls from 'tls';
import http from 'http';
import https from 'https';

// Helper to normalize cert fields
function formatField(val: string | string[] | undefined): string {
  if (!val) return '';
  return Array.isArray(val) ? val.join(', ') : val;
}

// URL sanitization and validation
function normalizeAndValidateUrl(inputUrl: string): { valid: boolean; normalizedUrl?: string; domain?: string; error?: string } {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { valid: false, error: 'Please provide a valid website URL' };
  }

  let trimmed = inputUrl.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = 'https://' + trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are supported' };
    }

    const domain = parsed.hostname;
    if (!domain || domain.length < 3 || !domain.includes('.')) {
      return { valid: false, error: 'Please enter a valid domain name (e.g. google.com)' };
    }

    // SSRF protection for local / internal networks
    const lowerDomain = domain.toLowerCase();
    if (
      lowerDomain === 'localhost' ||
      lowerDomain === '127.0.0.1' ||
      lowerDomain === '0.0.0.0' ||
      lowerDomain === '169.254.169.254' ||
      lowerDomain.endsWith('.local') ||
      lowerDomain.endsWith('.internal')
    ) {
      return { valid: false, error: 'Access to loopback and internal addresses is restricted for security.' };
    }

    return { valid: true, normalizedUrl: parsed.href, domain };
  } catch (err) {
    return { valid: false, error: 'Invalid URL format. Please check the address.' };
  }
}

// DNS lookup
async function checkDns(domain: string): Promise<{
  domain: string;
  ipAddress: string;
  dnsStatus: 'RESOLVED' | 'FAILED';
  resolutionTimeMs: number;
  records: Array<{ address: string; family: number }>;
  error?: string;
}> {
  const startTime = Date.now();
  try {
    const results = await dns.promises.lookup(domain, { all: true });
    const resolutionTimeMs = Date.now() - startTime;
    if (!results || results.length === 0) {
      return {
        domain,
        ipAddress: 'Unknown',
        dnsStatus: 'FAILED',
        resolutionTimeMs,
        records: [],
        error: 'No DNS records found for this domain',
      };
    }

    const primaryIp = results[0].address;
    return {
      domain,
      ipAddress: primaryIp,
      dnsStatus: 'RESOLVED',
      resolutionTimeMs,
      records: results.map((r) => ({ address: r.address, family: r.family })),
    };
  } catch (err: any) {
    const resolutionTimeMs = Date.now() - startTime;
    return {
      domain,
      ipAddress: 'Lookup failed',
      dnsStatus: 'FAILED',
      resolutionTimeMs,
      records: [],
      error: err.code === 'ENOTFOUND' ? 'Domain name does not exist (ENOTFOUND)' : (err.message || 'DNS resolution failed'),
    };
  }
}

// SSL inspection
function checkSsl(domain: string): Promise<{
  sslStatus: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'INVALID' | 'NOT_APPLICABLE';
  expiryDate: string | null;
  issuedDate: string | null;
  daysRemaining: number | null;
  isExpiringSoon: boolean;
  issuer: string | null;
  subject: string | null;
  protocol: string | null;
  cipher: string | null;
  error?: string;
}> {
  return new Promise((resolve) => {
    const socketTimeout = 6000;
    let resolved = false;

    const socket = tls.connect(
      {
        host: domain,
        port: 443,
        servername: domain,
        rejectUnauthorized: false,
        timeout: socketTimeout,
      },
      () => {
        if (resolved) return;
        resolved = true;

        try {
          const cert = socket.getPeerCertificate(true);
          const authorized = socket.authorized;
          const authError = socket.authorizationError;

          if (!cert || !cert.valid_to) {
            socket.end();
            return resolve({
              sslStatus: 'INVALID',
              expiryDate: null,
              issuedDate: null,
              daysRemaining: null,
              isExpiringSoon: false,
              issuer: null,
              subject: null,
              protocol: socket.getProtocol(),
              cipher: socket.getCipher() ? socket.getCipher().name : null,
              error: authError ? String(authError) : 'Could not retrieve peer certificate',
            });
          }

          const expiryDate = new Date(cert.valid_to);
          const issuedDate = new Date(cert.valid_from);
          const now = Date.now();
          const msRemaining = expiryDate.getTime() - now;
          const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

          let sslStatus: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'INVALID' = 'VALID';
          let isExpiringSoon = false;

          if (daysRemaining <= 0) {
            sslStatus = 'EXPIRED';
          } else if (daysRemaining <= 30) {
            sslStatus = 'EXPIRING_SOON';
            isExpiringSoon = true;
          } else if (!authorized && authError) {
            sslStatus = 'INVALID';
          }

          const issuerStr = cert.issuer ? (formatField(cert.issuer.O) || formatField(cert.issuer.CN) || 'Unknown Authority') : 'Unknown Authority';
          const subjectStr = cert.subject ? (formatField(cert.subject.CN) || formatField(cert.subject.O) || domain) : domain;

          socket.end();
          resolve({
            sslStatus,
            expiryDate: expiryDate.toISOString(),
            issuedDate: issuedDate.toISOString(),
            daysRemaining,
            isExpiringSoon,
            issuer: issuerStr,
            subject: subjectStr,
            protocol: socket.getProtocol(),
            cipher: socket.getCipher() ? socket.getCipher().name : null,
            error: (!authorized && authError) ? String(authError) : undefined,
          });
        } catch (e: any) {
          socket.destroy();
          resolve({
            sslStatus: 'INVALID',
            expiryDate: null,
            issuedDate: null,
            daysRemaining: null,
            isExpiringSoon: false,
            issuer: null,
            subject: null,
            protocol: null,
            cipher: null,
            error: e.message || 'SSL parsing failed',
          });
        }
      }
    );

    socket.on('timeout', () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve({
          sslStatus: 'INVALID',
          expiryDate: null,
          issuedDate: null,
          daysRemaining: null,
          isExpiringSoon: false,
          issuer: null,
          subject: null,
          protocol: null,
          cipher: null,
          error: 'SSL Handshake timed out after 6s',
        });
      }
    });

    socket.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve({
          sslStatus: 'INVALID',
          expiryDate: null,
          issuedDate: null,
          daysRemaining: null,
          isExpiringSoon: false,
          issuer: null,
          subject: null,
          protocol: null,
          cipher: null,
          error: err.message || 'TLS connection failed',
        });
      }
    });
  });
}

// HTTP request check
function checkHttp(targetUrl: string): Promise<{
  status: 'UP' | 'DOWN';
  httpStatusCode: number | null;
  httpStatusText: string;
  responseTimeMs: number;
  error?: string;
}> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let resolved = false;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch (e: any) {
      return resolve({
        status: 'DOWN',
        httpStatusCode: null,
        httpStatusText: 'Invalid URL',
        responseTimeMs: 0,
        error: e.message,
      });
    }

    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      method: 'GET',
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DomainIntelligenceMonitor/1.0; +https://domain-intelligence.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 7000,
      rejectUnauthorized: false,
    };

    const req = client.request(requestOptions, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        if (resolved) return;
        resolved = true;
        const responseTimeMs = Date.now() - startTime;
        const statusCode = res.statusCode || 200;
        const statusText = res.statusMessage || (statusCode >= 200 && statusCode < 400 ? 'OK' : 'Response Received');
        const isUp = statusCode >= 200 && statusCode < 500;

        resolve({
          status: isUp ? 'UP' : 'DOWN',
          httpStatusCode: statusCode,
          httpStatusText: statusText,
          responseTimeMs,
          error: statusCode >= 500 ? `Server returned status code ${statusCode}` : undefined,
        });
      });
    });

    req.on('timeout', () => {
      if (resolved) return;
      resolved = true;
      req.destroy();
      const responseTimeMs = Date.now() - startTime;
      resolve({
        status: 'DOWN',
        httpStatusCode: 408,
        httpStatusText: 'Request Timeout',
        responseTimeMs,
        error: 'Connection timed out after 7 seconds',
      });
    });

    req.on('error', (err: any) => {
      if (resolved) return;
      resolved = true;
      req.destroy();
      const responseTimeMs = Date.now() - startTime;
      resolve({
        status: 'DOWN',
        httpStatusCode: null,
        httpStatusText: err.code || 'Connection Failed',
        responseTimeMs,
        error: err.code === 'ECONNREFUSED' ? 'Connection refused by server' : (err.message || 'Network error'),
      });
    });

    req.end();
  });
}

// Universal response sender compatible with Vercel and Express
function sendJson(res: any, statusCode: number, payload: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (typeof res.status === 'function') {
    res.status(statusCode);
    if (typeof res.json === 'function') {
      return res.json(payload);
    }
  }
  res.statusCode = statusCode;
  res.end(JSON.stringify(payload));
}

// Vercel Serverless Function Handler
export default async function handler(req: any, res: any) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (typeof res.status === 'function') {
      return res.status(200).end();
    }
    res.statusCode = 200;
    return res.end();
  }

  // Parse body / query param safely
  let rawUrl = '';
  if (req.body) {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // raw string might be the url itself
        rawUrl = body;
      }
    }
    if (body && typeof body === 'object' && body.url) {
      rawUrl = body.url;
    }
  }

  if (!rawUrl && req.query && req.query.url) {
    rawUrl = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  }

  const validation = normalizeAndValidateUrl(rawUrl);
  if (!validation.valid || !validation.normalizedUrl || !validation.domain) {
    return sendJson(res, 400, {
      error: validation.error || 'Invalid or missing URL parameter',
    });
  }

  const normalizedUrl = validation.normalizedUrl;
  const domain = validation.domain;
  const isHttps = normalizedUrl.startsWith('https://');

  try {
    const [dnsResult, httpResult, sslResult] = await Promise.all([
      checkDns(domain),
      checkHttp(normalizedUrl),
      isHttps ? checkSsl(domain) : Promise.resolve({
        sslStatus: 'NOT_APPLICABLE' as const,
        expiryDate: null,
        issuedDate: null,
        daysRemaining: null,
        isExpiringSoon: false,
        issuer: null,
        subject: null,
        protocol: null,
        cipher: null,
        error: 'Not applicable (HTTP protocol)',
      }),
    ]);

    let overallStatus: 'UP' | 'DOWN' = httpResult.status;
    let overallError = httpResult.error;

    if (dnsResult.dnsStatus === 'FAILED') {
      overallStatus = 'DOWN';
      if (!overallError) {
        overallError = dnsResult.error || 'DNS Lookup Failed';
      }
    }

    const payload = {
      url: rawUrl,
      normalizedUrl,
      domain,
      timestamp: new Date().toISOString(),
      status: overallStatus,
      httpStatusCode: httpResult.httpStatusCode,
      httpStatusText: httpResult.httpStatusText,
      responseTimeMs: httpResult.responseTimeMs,
      dns: dnsResult,
      ssl: sslResult,
      error: overallError,
    };

    return sendJson(res, 200, payload);
  } catch (error: any) {
    return sendJson(res, 500, {
      error: error.message || 'An unexpected error occurred while checking the website.',
    });
  }
}
