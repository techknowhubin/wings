import { useEffect, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

// CDN worker — avoids Vite/mobile URL resolution issues
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Line {
  text: string;
  y: number;
  fontSize: number;
}

interface PageContent {
  pageNum: number;
  lines: Line[];
}

interface PdfViewerProps {
  url: string;
}

export function PdfViewer({ url }: PdfViewerProps) {
  const [pages, setPages] = useState<PageContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoading(true);
    setFailed(false);
    setPages([]);

    let cancelled = false;

    async function extract() {
      try {
        const pdf = await pdfjs.getDocument({ url, withCredentials: false }).promise;
        const result: PageContent[] = [];

        for (let p = 1; p <= pdf.numPages; p++) {
          if (cancelled) return;
          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 1 });
          const tc = await page.getTextContent();

          const items = (tc.items as any[])
            .filter((it) => it.str && it.str.trim())
            .map((it) => ({
              text: it.str as string,
              x: it.transform[4] as number,
              y: viewport.height - (it.transform[5] as number),
              fontSize: Math.abs(it.transform[3]) as number,
            }));

          items.sort((a, b) => a.y - b.y || a.x - b.x);

          const lines: Line[] = [];
          for (const it of items) {
            const last = lines[lines.length - 1];
            if (last && Math.abs(it.y - last.y) <= 3) {
              last.text += ' ' + it.text;
            } else {
              lines.push({ text: it.text.trim(), y: it.y, fontSize: it.fontSize });
            }
          }

          result.push({ pageNum: p, lines });
        }

        if (!cancelled) {
          setPages(result);
          setLoading(false);
        }
      } catch (err) {
        console.error('PdfViewer extraction failed:', err);
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      }
    }

    extract();
    return () => { cancelled = true; };
  }, [url]);

  if (loading) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground animate-pulse">
        Loading itinerary…
      </div>
    );
  }

  if (failed || pages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <FileText className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Itinerary document is available to download.</p>
        <Button variant="outline" size="sm" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer" download>
            <Download className="h-4 w-4 mr-2" /> Download Itinerary
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pages.map((page) =>
        page.lines.map((line, i) => {
          const isHeading =
            line.fontSize >= 13 || /^day\s*\d+/i.test(line.text);
          if (isHeading) {
            return (
              <h3 key={`${page.pageNum}-${i}`} className="font-bold text-base text-foreground mt-6 first:mt-0">
                {line.text}
              </h3>
            );
          }
          return (
            <p key={`${page.pageNum}-${i}`} className="text-sm text-muted-foreground leading-relaxed">
              {line.text}
            </p>
          );
        })
      )}
    </div>
  );
}
