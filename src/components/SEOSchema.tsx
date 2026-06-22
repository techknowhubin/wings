import { Helmet } from "react-helmet-async";

const SITE_URL = "https://xplorwing.com";

/**
 * Global JSON-LD structured data for the entire site.
 * Renders Organization, WebSite (with SearchAction / Sitelinks Search Box),
 * and SiteNavigationElement schemas.
 *
 * Injected once at the app root level.
 */
export default function SEOSchema() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Xplorwing",
    alternateName: "WINGSNNESTS ECO SOLUTIONS PVT LTD",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description:
      "India's first experience-focused integrated travel solution. Book homestays, hotels, resorts, bike rentals, car rentals, outstation cabs, and curated packages.",
    sameAs: [
      "https://www.instagram.com/xplorwing",
      "https://facebook.com/joinXplorwing",
      "https://www.linkedin.com/company/xplor-wing/",
      "https://www.youtube.com/@XplorWing",
      "https://twitter.com/xplorwing"
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+91-6362986420",
      contactType: "customer service",
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "IN",
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Xplorwing",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/destinations/{search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const navigationSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SiteNavigationElement",
        name: "Home Stays",
        url: `${SITE_URL}/home-stays`,
      },
      {
        "@type": "SiteNavigationElement",
        name: "Hotels",
        url: `${SITE_URL}/hotels`,
      },
      {
        "@type": "SiteNavigationElement",
        name: "Resorts",
        url: `${SITE_URL}/resorts`,
      },
      {
        "@type": "SiteNavigationElement",
        name: "Bike Rentals",
        url: `${SITE_URL}/bike-rentals`,
      },
      {
        "@type": "SiteNavigationElement",
        name: "Car Rentals",
        url: `${SITE_URL}/car-rentals`,
      },
      {
        "@type": "SiteNavigationElement",
        name: "Outstation Cabs",
        url: `${SITE_URL}/outstation-cabs`,
      },
      {
        "@type": "SiteNavigationElement",
        name: "Airport Cabs",
        url: `${SITE_URL}/airport-cabs`,
      },
      {
        "@type": "SiteNavigationElement",
        name: "Packages & Experiences",
        url: `${SITE_URL}/packages`,
      },
      {
        "@type": "SiteNavigationElement",
        name: "Become a Host",
        url: `${SITE_URL}/become-host`,
      },
      {
        "@type": "SiteNavigationElement",
        name: "Contact Us",
        url: `${SITE_URL}/contact`,
      },
      {
        "@type": "SiteNavigationElement",
        name: "About Us",
        url: `${SITE_URL}/about`,
      },
    ],
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(navigationSchema)}
      </script>
    </Helmet>
  );
}
