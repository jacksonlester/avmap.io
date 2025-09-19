import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";

const linkClasses =
  "text-primary font-semibold underline decoration-[3px] underline-offset-4 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

const About = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col pt-16">
      <Header />

      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <section className="mx-auto max-w-3xl rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg sm:p-10">
            <header className="space-y-3">
              <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                About
              </span>
              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-[2.75rem]">
                About AV Map
              </h1>
            </header>

            <div className="mt-8 space-y-6 text-lg leading-relaxed text-muted-foreground">
              <p>
                This site tracks autonomous vehicle deployments across the
                United States. It shows where you can actually catch a ride
                today, which cities have pilot programs running, and how the
                rollout has progressed since Waymo started offering rides to the
                public in 2017 in Arizona. I started building this after May
                Mobility and Zoox launched their first services on September
                10th, 2025, because finding accurate, up-to-date information
                about AV services was surprisingly hard.
              </p>
              <p>
                Right now it covers US deployments that are providing rides to
                the public, including limited waitlist-based programs. Hopefully
                the map and timeline help riders find services in their area,
                researchers track industry progress, and anyone curious about
                AVs see what&apos;s really happening out in the world.
              </p>
              <p>
                In the future I’m thinking of adding testing locations,
                international deployments, and performance data as I can find
                reliable sources. The long-term vision is a global resource that
                shows how the global autonomous vehicle deployment we’re in the
                beginning of rolls out, city by city and company by company.
              </p>
              <p>
                This is all based on public information and ongoing research,
                and keeping it current is challenging. If you notice something
                wrong or outdated, please let me know at{" "}
                <a className={linkClasses} href="mailto:suggestions@avmap.io">
                  suggestions@avmap.io
                </a>
                . I would also love to hear what features or data would make
                this more useful for you. Feel free to connect on{" "}
                <a
                  className={linkClasses}
                  href="https://www.linkedin.com/in/jackson-lester/"
                >
                  LinkedIn
                </a>{" "}
                and send ideas directly. Making this truly helpful needs input
                from people actually using it.
              </p>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default About;
