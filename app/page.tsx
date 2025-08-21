import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { siteConfig } from '@/lib/config';
import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const user = await getUser();

  if (user) {
    redirect('/documents');
  }
  return (
    <main className="flex-1 flex items-center justify-center">
      <section className="py-20 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-foreground tracking-tight sm:text-5xl md:text-6xl">
            Real-Time Collaborative
            <span className="block text-primary">Document Platform</span>
          </h1>
          <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
            Create, edit, and collaborate on documents with your team in real-time. 
            Features version control, branching, and professional workflow management.
          </p>
          <div className="mt-8">
            <Button
              asChild
              size="lg"
              className="text-lg rounded-full px-8 py-3"
            >
              <a href="/sign-up">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}