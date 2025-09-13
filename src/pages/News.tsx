import { Header } from '@/components/Header';

const News = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">AV News</h1>
        <p className="text-muted-foreground">Latest autonomous vehicle news and updates will be available here.</p>
      </div>
    </div>
  );
};

export default News;