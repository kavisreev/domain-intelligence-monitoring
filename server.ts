import express from 'express';
import path from 'path';
import dns from 'dns';
import tls from 'tls';
import http from 'http';
import https from 'https';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to sanitize and normalize URLs
function normalizeAndValidateUrl(inputUrl: string): { valid: boolean; normalizedUrl?: string; domain?: string; error?: string } {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { valid: false, error: 'Please provide a valid URL' };
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
      return { valid: false, error: 'Please enter a valid domain name (e.g. example.com)' };
    }

    // Guard against internal loopback or cloud metadata IPs
    const lowerDomain = domain.toLowerCase();
    if (
      lowerDomain === 'localhost' ||
      lowerDomain === '127.0.0.1' ||
      lowerDomain === '0.0.0.0' ||
      lowerDomain === '169.254.169.254' ||
      lowerDomain.endsWith('.local') ||
      lowerDomain.endsWith('.internal')
    ) {
      return { valid: false, error: 'Access to loopback, local, and metadata addresses is restricted for security.' };
    }

    return { valid: true, normalizedUrl: parsed.href, domain };
  } catch (err) {
    return { valid: false, error: 'Invalid URL format. Please check the address.' };
  }
}

// Perform DNS Lookup
async function checkDns(domain: string): Promise<{
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
        ipAddress: 'Unknown',
        dnsStatus: 'FAILED',
        resolutionTimeMs,
        records: [],
        error: 'No DNS records found for this domain',
      };
    }

    const primaryIp = results[0].address;
    return {
      ipAddress: primaryIp,
      dnsStatus: 'RESOLVED',
      resolutionTimeMs,
      records: results.map((r) => ({ address: r.address, family: r.family })),
    };
  } catch (err: any) {
    const resolutionTimeMs = Date.now() - startTime;
    return {
      ipAddress: 'Lookup failed',
      dnsStatus: 'FAILED',
      resolutionTimeMs,
      records: [],
      error: err.code === 'ENOTFOUND' ? 'Domain name does not exist (ENOTFOUND)' : (err.message || 'DNS resolution failed'),
    };
  }
}

// Perform SSL Inspection
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
    const socketTimeout = 7000;
    let resolved = false;

    const socket = tls.connect(
      {
        host: domain,
        port: 443,
        servername: domain,
        rejectUnauthorized: false, // We check authorization status manually to provide exact details
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

          function formatField(val: string | string[] | undefined): string {
            if (!val) return '';
            return Array.isArray(val) ? val.join(', ') : val;
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
          error: 'SSL Handshake timed out after 7s',
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

// Perform HTTP(S) request with timing
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
      timeout: 8000,
      rejectUnauthorized: false, // Avoid breaking check purely on self-signed certs
    };

    const req = client.request(requestOptions, (res) => {
      // Consume body briefly so socket closes cleanly
      res.on('data', () => {});
      res.on('end', () => {
        if (resolved) return;
        resolved = true;
        const responseTimeMs = Date.now() - startTime;
        const statusCode = res.statusCode || 200;
        const statusText = res.statusMessage || (statusCode >= 200 && statusCode < 400 ? 'OK' : 'Error');

        // 2xx, 3xx, 4xx mean the server is reachable and returned an HTTP response
        // 5xx means internal server error (DOWN)
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
        error: 'Connection timed out after 8 seconds',
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

// API Routes
app.post('/api/check-website', async (req, res) => {
  const { url } = req.body || {};

  const validation = normalizeAndValidateUrl(url);
  if (!validation.valid || !validation.normalizedUrl || !validation.domain) {
    return res.status(400).json({
      error: validation.error || 'Invalid URL provided',
    });
  }

  const normalizedUrl = validation.normalizedUrl;
  const domain = validation.domain;
  const isHttps = normalizedUrl.startsWith('https://');

  try {
    // Run DNS and HTTP and SSL checks in parallel for fast response
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

    // If DNS resolution completely failed, HTTP status must be DOWN
    let overallStatus: 'UP' | 'DOWN' = httpResult.status;
    let overallError = httpResult.error;

    if (dnsResult.dnsStatus === 'FAILED') {
      overallStatus = 'DOWN';
      if (!overallError) {
        overallError = dnsResult.error || 'DNS Lookup Failed';
      }
    }

    const payload = {
      url: url,
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

    res.json(payload);
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'An unexpected error occurred while checking the website.',
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Vite middleware for dev / static for prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
