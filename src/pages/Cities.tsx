import { Header } from '@/components/Header';

const Cities = () => {
  return (
    <div className="min-h-screen bg-background pt-16">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Cities</h1>
        <p className="text-muted-foreground">City-specific autonomous vehicle deployment information will be available here.</p>
      </div>
    </div>
  );
};

export default Cities;