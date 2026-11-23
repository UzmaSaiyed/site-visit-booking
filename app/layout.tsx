import "./globals.css";
import Link from "next/link";

export const metadata = { title: "Site Visit Booking", description: "Book a property site visit in Jaipur" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <Link href="/" className="brand">SiteVisit</Link>
          <span className="tag">Demo project · fictional listings</span>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
