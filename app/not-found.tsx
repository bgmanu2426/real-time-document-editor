import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center flex-1">
      <div className="max-w-md space-y-8 p-4 text-center">
        <div className="flex justify-center">
          <img src="/favicon.ico" alt="ReDocz" className="size-12" />
        </div>
        <h1 className="text-4xl font-bold text-foreground tracking-tight">
          Page Unavilable
        </h1>
        <p className="text-base text-muted-foreground">
          The page you are trying to access is either private, no longer avilable or, has been removed. Please contact the owner of the document.
        </p>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/">
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
