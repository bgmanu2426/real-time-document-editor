import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const user = await getUser();

  if (user) {
    redirect('/documents');
  }
  return (
    <main className="flex-1 flex items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-blue-500/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse animation-delay-4000"></div>
      </div>
      
      <section className="relative z-10 py-32 text-center">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="page-enter">
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl mb-8">
              <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent">
                Real-Time
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
                Collaborative
              </span>
              <br />
              <span className="bg-gradient-to-r from-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                Documents
              </span>
            </h1>
          </div>
          
          <div className="page-enter" style={{animationDelay: '0.2s'}}>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-12">
              Create, edit, and collaborate on documents with your team in real-time. 
              Experience seamless version control, branching, and professional workflow management.
            </p>
          </div>
          
          <div className="page-enter" style={{animationDelay: '0.4s'}}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                asChild
                size="lg"
                className="text-lg rounded-2xl px-10 py-4 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-2xl hover:shadow-primary/25 transition-all duration-300 transform hover:scale-105 group"
              >
                <a href="/sign-up" className="flex items-center space-x-3">
                  <span>Get Started</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
                </a>
              </Button>
            </div>
          </div>
          
          {/* Feature highlights */}
          <div className="page-enter mt-20" style={{animationDelay: '0.6s'}}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="backdrop-blur-xl bg-background/80 border border-border/20 rounded-2xl p-6 hover-lift">
                <div className="w-12 h-12 bg-gradient-to-r from-primary to-purple-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Real-time Sync</h3>
                <p className="text-muted-foreground text-sm">Collaborate instantly with your team members</p>
              </div>
              
              <div className="backdrop-blur-xl bg-background/80 border border-border/20 rounded-2xl p-6 hover-lift">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Version Control</h3>
                <p className="text-muted-foreground text-sm">Git-like branching and merging for documents</p>
              </div>
              
              <div className="backdrop-blur-xl bg-background/80 border border-border/20 rounded-2xl p-6 hover-lift">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Team Workflow</h3>
                <p className="text-muted-foreground text-sm">Professional collaboration tools and permissions</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}