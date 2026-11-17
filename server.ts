import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const SPREADSHEET_ID_REGEX = /^[a-zA-Z0-9-_]{10,120}$/;

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Proxy endpoint for real-time public Google Sheets CSV sync (bypasses browser CORS redirects)
  app.get('/api/sheets/public', async (req, res) => {
    const spreadsheetId = String(req.query.spreadsheetId || '').trim();
    const gid = String(req.query.gid || '').trim();
    const sheet = String(req.query.sheet || '').trim();

    if (!SPREADSHEET_ID_REGEX.test(spreadsheetId)) {
      res.status(400).json({ error: 'Spreadsheet ID ไม่ถูกต้อง' });
      return;
    }

    // Prefer raw CSV export by numeric gid (preserves exact text & avoids gviz type inference quirks)
    const hasNumericGid = Boolean(gid && /^\d+$/.test(gid));
    let targetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&_ts=${Date.now()}`;
    if (hasNumericGid) {
      targetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${encodeURIComponent(
        gid
      )}&_ts=${Date.now()}`;
    } else if (sheet) {
      targetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
        sheet
      )}&_ts=${Date.now()}`;
    }

    const extractCsvFromGvizHtml = (htmlText: string): string | null => {
      const tableMatch = htmlText.match(/<table[\s\S]*?<\/table>/i);
      if (!tableMatch) return null;

      const rows: string[][] = [];
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let trMatch: RegExpExecArray | null = rowRegex.exec(tableMatch[0]);
      while (trMatch !== null) {
        const cells: string[] = [];
        const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
        let tdMatch: RegExpExecArray | null = cellRegex.exec(trMatch[1]);
        while (tdMatch !== null) {
          const rawCell = tdMatch[1]
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_full, href, inner) => {
              let cleanHref = decodeHtmlEntities(href);
              const qMatch = cleanHref.match(/[?&]q=(https?%3A[^&]+|https?:\/\/[^&]+)/i);
              if (cleanHref.includes('google.com/url') && qMatch?.[1]) {
                try {
                  cleanHref = decodeURIComponent(qMatch[1]);
                } catch {
                  cleanHref = qMatch[1];
                }
              }
              const labelText = decodeHtmlEntities(inner.replace(/<[^>]+>/g, '').trim());
              return labelText && !labelText.includes('http')
                ? `${labelText} ${cleanHref}`
                : cleanHref;
            })
            .replace(/<[^>]+>/g, '');
          cells.push(decodeHtmlEntities(rawCell).trim());
          tdMatch = cellRegex.exec(trMatch[1]);
        }
        if (cells.length > 0) rows.push(cells);
        trMatch = rowRegex.exec(tableMatch[0]);
      }

      if (rows.length === 0) return null;
      return rows
        .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
        .join('\n');
    };

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Pannawat-Learning-Space/1.0',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow',
      });

      const contentType = response.headers.get('content-type') || '';
      let bodyText = await response.text();

      if (!response.ok || contentType.includes('text/html') || bodyText.trimStart().startsWith('<!DOCTYPE')) {
        res.status(403).json({
          error:
            'ไม่สามารถดึงข้อมูลชีตแบบสาธารณะได้ กรุณาตรวจสอบว่า Google Sheet เปิดแชร์เป็น "ทุกคนที่มีลิงก์ดูได้" (Anyone with the link) หรือใช้โหมดลงชื่อเข้าใช้ Google',
        });
        return;
      }

      // If CSV contains no URLs at all, check gviz HTML output in case links were formatted as rich hyperlinks
      if (!/https?:\/\//i.test(bodyText)) {
        try {
          const htmlUrl = sheet
            ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:html&sheet=${encodeURIComponent(
                sheet
              )}&_ts=${Date.now()}`
            : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:html&gid=${encodeURIComponent(
                gid || '0'
              )}&_ts=${Date.now()}`;
          const htmlRes = await fetch(htmlUrl, {
            headers: { 'User-Agent': 'Pannawat-Learning-Space/1.0' },
            redirect: 'follow',
          });
          if (htmlRes.ok) {
            const htmlText = await htmlRes.text();
            if (/https?:\/\//i.test(htmlText)) {
              const convertedCsv = extractCsvFromGvizHtml(htmlText);
              if (convertedCsv && /https?:\/\//i.test(convertedCsv)) {
                bodyText = convertedCsv;
              }
            }
          }
        } catch {
          // Keep original CSV if HTML link extraction fails
        }
      }

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.json({
        spreadsheetId,
        csv: bodyText,
        fetchedAt: new Date().toISOString(),
      });
    } catch (error) {
      res.status(502).json({
        error: error instanceof Error ? error.message : 'ไม่สามารถเชื่อมต่อ Google Sheets ได้',
      });
    }
  });

  // Best-effort metadata & tab discovery for public Google Sheets
  app.get('/api/sheets/public/meta', async (req, res) => {
    const spreadsheetId = String(req.query.spreadsheetId || '').trim();
    if (!SPREADSHEET_ID_REGEX.test(spreadsheetId)) {
      res.status(400).json({ error: 'Spreadsheet ID ไม่ถูกต้อง' });
      return;
    }

    try {
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlview?_ts=${Date.now()}`,
        {
          headers: { 'User-Agent': 'Pannawat-Learning-Space/1.0' },
          redirect: 'follow',
        }
      );

      if (!response.ok) {
        res.status(403).json({ error: 'ชีตนี้ไม่ได้เปิดแชร์แบบสาธารณะ' });
        return;
      }

      const html = await response.text();
      if (html.includes('accounts.google.com/ServiceLogin')) {
        res.status(403).json({ error: 'ชีตนี้ต้องลงชื่อเข้าใช้ก่อนเข้าถึง' });
        return;
      }

      const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
      const rawTitle = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : 'Google Sheet';
      const title = rawTitle.replace(/\s*-\s*Google (ชีต|Sheets)$/i, '').trim() || 'Google Sheet';

      // Extract sheet tabs from htmlview script items: items.push({name: "...", pageUrl: "...", gid: "..."})
      const unescapeJsString = (raw: string): string => {
        try {
          return JSON.parse(`"${raw.replace(/"/g, '\\"')}"`);
        } catch {
          return raw.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
            String.fromCharCode(parseInt(hex, 16))
          );
        }
      };

      const tabs: Array<{ title: string; gid: string }> = [];
      const seenGids = new Set<string>();
      const tabRegex = /items\.push\(\{name:\s*"((?:[^"\\]|\\.)*)"[^}]*gid:\s*"(\d+)"/g;
      let match: RegExpExecArray | null = tabRegex.exec(html);
      while (match !== null) {
        const gid = match[2];
        if (!seenGids.has(gid)) {
          seenGids.add(gid);
          tabs.push({ title: unescapeJsString(match[1]), gid });
        }
        match = tabRegex.exec(html);
      }

      if (tabs.length === 0) {
        const buttonRegex =
          /<li[^>]*id="sheet-button-(\d+)"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/gi;
        let btnMatch: RegExpExecArray | null = buttonRegex.exec(html);
        while (btnMatch !== null) {
          const gid = btnMatch[1];
          const cleanTitle = decodeHtmlEntities(btnMatch[2].replace(/<[^>]+>/g, '').trim());
          if (cleanTitle && !seenGids.has(gid)) {
            seenGids.add(gid);
            tabs.push({ title: cleanTitle, gid });
          }
          btnMatch = buttonRegex.exec(html);
        }
      }

      res.setHeader('Cache-Control', 'no-store');
      res.json({ spreadsheetId, title, tabs });
    } catch {
      res.json({ spreadsheetId, title: 'Google Sheet', tabs: [] });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
