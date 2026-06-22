import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
  breadcrumbs?: { name: string; url: string }[];
}

const SITE_NAME = "Xplorwing";
const SITE_URL = "https://xplorwing.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/hero-xplorwing.jpg`;
const DEFAULT_DESCRIPTION =
  "India's first experience-focused integrated travel solution. Book homestays, hotels, resorts, bike rentals, car rentals, outstation cabs, airport cabs, and curated travel packages across India.";

/**
 * Dynamic SEO head component — injects per-page title, meta description,
 * Open Graph tags, canonical URL, and optional breadcrumb structured data.
 */
export default function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  noIndex = false,
  breadcrumbs,
}: SEOHeadProps) {
  const location = useLocation();
  const path = canonicalPath ?? location.pathname;
  const canonical = `${SITE_URL}${path}`;
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — India's First Experience Focused Integrated Travel Solution`;

  // Build BreadcrumbList JSON-LD when breadcrumbs are provided
  const breadcrumbSchema = breadcrumbs
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((bc, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: bc.name,
          item: `${SITE_URL}${bc.url}`,
        })),
      }
    : null;

  return (
    <Helmet>
      {/* Core meta */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_IN" />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Breadcrumb structured data */}
      {breadcrumbSchema && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      )}
    </Helmet>
  );
}
