import { Helmet } from "react-helmet-async";

const SEO = ({
  title,
  description = "A premium collaborative document editor with real-time editing, rich typography, and elegant design. Write beautifully, together.",
  canonical,
  ogType = "website",
  ogImage = "/og-image.png",
  noindex = false,
  structuredData,
}: {
  title?: string;
  description?: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
  noindex?: boolean;
  structuredData?: object;
}) => {
  const siteName = "Collaborative Docx";
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const canonicalUrl = canonical
    ? `${window.location.origin}${canonical}`
    : window.location.href;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
