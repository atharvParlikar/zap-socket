import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'
import Link from "next/link";

export const metadata = {
  // Define your metadata here
  // For more information on metadata API, see: https://nextjs.org/docs/app/building-your-application/optimizing/metadata
}

const navbar = (
  <Navbar
    logo={<span style={{
      fontSize: "1.5rem",
      fontFamily: "monospace"
    }}>zap-socket
      <span style={{
        color: "yellow"
      }}>.</span>
    </span>}
  />
)
const footer = <Footer>MIT {new Date().getFullYear()} © Atharv Parlikar.</Footer>

export default async function RootLayout({ children }) {
  return (
    <html
      // Not required, but good for SEO
      lang="en"
      // Required to be set
      dir="ltr"
      // Suggested by `next-themes` package https://github.com/pacocoursey/next-themes#with-app
      suppressHydrationWarning
    >
      <Head
      // ... Your additional head options
      >
        <link rel="shortcut icon" href="/images/general/icon.svg" />
        {/* Your additional tags should be passed as `children` of `<Head>` element */}
      </Head>
      <body>
        <Layout
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/phucbm/nextra-docs-starter/tree/main"
          footer={footer}
        // ... Your additional layout options
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
