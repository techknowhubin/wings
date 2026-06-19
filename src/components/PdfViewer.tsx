import { useEffect, useState } from 'react';
import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

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
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setPages([]);

    async function extract() {
      try {
        const pdf = await pdfjs.getDocument({ url, withCredentials: false }).promise;
        const result: PageContent[] = [];

        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 1 });
          const tc = await page.getTextContent();

          // Normalize items: flip y-axis (PDF is bottom-up), filter blanks
          const items = (tc.items as any[])
            .filter((it) => it.str && it.str.trim())
            .map((it) => ({
              text: it.str as string,
              x: it.transform[4] as number,
              y: viewport.height - (it.transform[5] as number),
              fontSize: Math.abs(it.transform[3]) as number,
            }));

          items.sort((a, b) => a.y - b.y || a.x - b.x);

          // Merge into lines: items within 3px vertically share a line
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

        setPages(result);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    extract();
  }, [url]);

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Loading itinerary...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-sm text-destructive">
        Could not load itinerary. Please contact support.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pages.map((page) => (
        <div key={page.pageNum} className="space-y-2">
          {page.lines.map((line, i) => {
            const isHeading = line.fontSize >= 13 || /^day\s*\d+/i.test(line.text);
            if (isHeading) {
              return (
                <h3 key={i} className="font-bold text-base text-foreground mt-4 first:mt-0">
                  {line.text}
                </h3>
              );
            }
            return (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                {line.text}
              </p>
            );
          })}
        </div>
      ))}
    </div>
  );
}
