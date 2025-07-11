import { TypingTest } from '@/components/typing-test';
import { Type } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8 md:p-12">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-8">
          <div className="flex items-center gap-4 text-4xl sm:text-5xl font-bold text-primary">
            <Type className="h-10 w-10 sm:h-12 sm:w-12" />
            <h1 className="font-headline">TypeAce</h1>
          </div>
          <TypingTest />
        </div>
      </main>
      <footer className="w-full p-4 text-center text-sm text-muted-foreground">
        <p>© 2024 TypeAce. All rights reserved.</p>
      </footer>
    </div>
  );
}
