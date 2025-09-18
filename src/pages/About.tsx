import { Header } from '@/components/Header';
import { SiteFooter } from '@/components/SiteFooter';

const About = () => {
  return (
    <div className="min-h-screen bg-background pt-16 flex flex-col">
      <Header />
      <div className="container mx-auto px-4 py-8 flex-1">
        <h1 className="text-3xl font-bold mb-6">About AV Map Explorer</h1>
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <p>
            AV Map Explorer is an interactive platform for visualizing autonomous vehicle service areas
            across the United States. Track the deployment and expansion of self-driving car services
            from companies like Waymo, Tesla, Zoox, and more.
          </p>
          <h2>Features</h2>
          <ul>
            <li>Interactive map with real service area boundaries</li>
            <li>Filter by company and deployment status</li>
            <li>Up-to-date information on AV deployments</li>
            <li>Mobile-friendly interface</li>
          </ul>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
};

export default About;