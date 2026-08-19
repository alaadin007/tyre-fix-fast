import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Seo } from "@/components/Seo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-6 py-16">
      <Seo
        title="Page not found (404) | Tyrefly"
        description="This page doesn't exist. Head back to Tyrefly for 24/7 mobile tyre fitting and puncture repair."
        noindex
        statusCode={404}
      />
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Error 404</p>
        <h1 className="mb-3 mt-2 text-4xl font-bold">Page not found</h1>
        <p className="mb-8 text-muted-foreground">
          The page you're looking for doesn't exist or has moved. Need a tyre sorted right now? Start here.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            to="/"
            className="rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Get help now — Home
          </Link>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Link to="/services" className="rounded-md border border-border bg-background px-4 py-2 hover:bg-accent">
              Services
            </Link>
            <Link to="/areas" className="rounded-md border border-border bg-background px-4 py-2 hover:bg-accent">
              Areas we cover
            </Link>
            <Link to="/blog" className="rounded-md border border-border bg-background px-4 py-2 hover:bg-accent">
              Blog
            </Link>
            <Link
              to="/services/puncture-repair"
              className="rounded-md border border-border bg-background px-4 py-2 hover:bg-accent"
            >
              Puncture repair
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
