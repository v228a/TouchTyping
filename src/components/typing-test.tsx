
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
// import { generateWords } from '@/ai/flows/generate-words-flow'; // Удаляем импорт
import { Skeleton } from './ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import wordsEn from '@/ai/words.en.json';
import wordsRu from '@/ai/words.ru.json';


const fallbackWords = {
  English: wordsEn as string[],
  Russian: wordsRu as string[],
};

const generateFallbackText = (count: number, lang: keyof typeof fallbackWords) => {
  const wordList = fallbackWords[lang] || fallbackWords.English;
  let words = [];
  for (let i = 0; i < count; i++) {
    words.push(wordList[Math.floor(Math.random() * wordList.length)]);
  }
  return words.join(' ');
};

type CaretPosition = {
  top: number;
  left: number;
  height: number;
};

export function TypingTest() {
  const [textToType, setTextToType] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'running' | 'finished' | 'paused'>('idle');
  const [userInput, setUserInput] = useState('');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [cpm, setCpm] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [errors, setErrors] = useState(0);
  const [caretPos, setCaretPos] = useState<CaretPosition>({ top: 0, left: 0, height: 0 });
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  
  const [wordCount, setWordCount] = useState(30);
  const [language, setLanguage] = useState<'English' | 'Russian'>('English');
  const [isBackspaceOff, setIsBackspaceOff] = useState(false);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTimeRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);

  // Load settings from localStorage on initial client-side render
  useEffect(() => {
    const savedWordCount = localStorage.getItem('typingTest-wordCount');
    if (savedWordCount) {
      setWordCount(Number(savedWordCount));
    }

    const savedLanguage = localStorage.getItem('typingTest-language');
    if (savedLanguage === 'English' || savedLanguage === 'Russian') {
      setLanguage(savedLanguage);
    }

    const savedBackspaceOff = localStorage.getItem('typingTest-isBackspaceOff');
    if (savedBackspaceOff) {
      setIsBackspaceOff(savedBackspaceOff === 'true');
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('typingTest-wordCount', String(wordCount));
    localStorage.setItem('typingTest-language', language);
    localStorage.setItem('typingTest-isBackspaceOff', String(isBackspaceOff));
  }, [wordCount, language, isBackspaceOff]);

  const resetTest = useCallback(() => {
    setStatus('idle');
    setUserInput('');
    setTimeElapsed(0);
    setWpm(0);
    setCpm(0);
    setAccuracy(0);
    setErrors(0);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    inputRef.current?.focus();
    setIsFocused(true);
  }, []);

  const fetchNewText = useCallback(async (count: number, lang: 'English' | 'Russian') => {
    setIsLoading(true);
    resetTest();
    // Просто используем локальный рандомайзер
    setTextToType(generateFallbackText(count, lang));
    setIsLoading(false);
    // Гарантируем фокусировку после старта нового теста
    setIsFocused(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [resetTest]);

  useEffect(() => {
    fetchNewText(wordCount, language);
  }, [wordCount, language, fetchNewText]);


  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setStatus('running');
    lastTimeRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      setTimeElapsed(prevTime => prevTime + (Date.now() - lastTimeRef.current) / 1000);
      lastTimeRef.current = Date.now();
    }, 1000);
  }, []);

  const pauseTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
      if (status !== 'finished') {
        setStatus('paused');
      }
    }
  }, [status]);
  
  useEffect(() => {
    const checkCapsLock = (event: KeyboardEvent | MouseEvent) => {
      if (typeof (event as KeyboardEvent).getModifierState === 'function') {
        const capsOn = (event as KeyboardEvent).getModifierState("CapsLock");
        setIsCapsLockOn(capsOn);
        if (capsOn) {
          if (status === 'running') {
            pauseTimer();
          }
        } else {
          if (status === 'paused' && isFocused) {
            startTimer();
          }
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      checkCapsLock(event);
      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyR') {
        event.preventDefault();
        fetchNewText(wordCount, language);
      }
      if (isBackspaceOff && event.key === 'Backspace') {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('mousedown', checkCapsLock, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('mousedown', checkCapsLock, true);
    };
  }, [fetchNewText, wordCount, language, isBackspaceOff, status, pauseTimer, startTimer, isFocused]);


  const finishTest = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setStatus('finished');

    const typedChars = userInput.length;
    let correctChars = 0;
    let errorCount = 0;

    userInput.split('').forEach((char, index) => {
      if (textToType[index] && char === textToType[index]) {
        correctChars++;
      } else {
        errorCount++;
      }
    });
    
    setErrors(errorCount);
    
    const acc = typedChars > 0 ? (correctChars / typedChars) * 100 : 0;
    setAccuracy(acc);

    const timeInMinutes = timeElapsed / 60;
    const wordsTyped = correctChars / 5;
    const wpmCalc = timeInMinutes > 0 ? (wordsTyped / timeInMinutes) : 0;
    setWpm(wpmCalc > 0 ? wpmCalc : 0);
    
    const cpmCalc = timeInMinutes > 0 ? (correctChars / timeInMinutes) : 0;
    setCpm(cpmCalc > 0 ? cpmCalc : 0);
  }, [userInput, textToType, timeElapsed]);

  useEffect(() => {
    if (status === 'running' && userInput.length >= textToType.length) {
      finishTest();
    }
  }, [status, userInput, textToType, finishTest]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (status === 'finished' || isLoading || isCapsLockOn) return;
    const value = e.target.value;

    if (status === 'idle' && value.length > 0) {
      startTimer();
    }
    
    setUserInput(value);
  };
  
  const handleTryAgain = () => {
    fetchNewText(wordCount, language);
  };

  const handleWordCountChange = (value: string) => {
    setWordCount(Number(value));
  };

  const handleLanguageChange = (value: 'English' | 'Russian') => {
    setLanguage(value);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (status === 'paused' && !isCapsLockOn) {
      startTimer();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (status === 'running') {
      pauseTimer();
    }
  };
  
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  useEffect(() => {
    if (textContainerRef.current) {
      const textContainerRect = textContainerRef.current.getBoundingClientRect();
      const charElements = textContainerRef.current.querySelectorAll('span[data-char-index]');
      let nextCharRect: DOMRect;
      
      const currentIndex = userInput.length;

      if (currentIndex < textToType.length && charElements[currentIndex]) {
        nextCharRect = (charElements[currentIndex] as HTMLElement).getBoundingClientRect();
      } else if (currentIndex > 0 && charElements[currentIndex - 1]) {
        const lastCharRect = (charElements[currentIndex - 1] as HTMLElement).getBoundingClientRect();
        nextCharRect = new DOMRect(lastCharRect.right, lastCharRect.top, 2, lastCharRect.height);
      } else if (charElements.length > 0) {
        const firstCharRect = (charElements[0] as HTMLElement).getBoundingClientRect();
        nextCharRect = new DOMRect(firstCharRect.left, firstCharRect.top, 2, firstCharRect.height);
      } else {
         // Fallback if no characters are rendered yet
        nextCharRect = new DOMRect(textContainerRect.left, textContainerRect.top, 2, 24); // Assuming default height
      }

      setCaretPos({
        top: nextCharRect.top - textContainerRect.top,
        left: nextCharRect.left - textContainerRect.left,
        height: nextCharRect.height,
      });
    }
  }, [userInput, textToType, isLoading]);

  const MemoizedRenderText = useCallback(() => {
    return textToType.split('').map((char, index) => {
      let state = 'untyped';
      if (index < userInput.length) {
        state = userInput[index] === char ? 'correct' : 'incorrect';
      }

      return (
        <span
          key={`${char}-${index}`}
          data-char-index={index}
          className={cn({
            'text-primary': state === 'correct',
            'text-destructive bg-destructive/20 rounded-[2px]': state === 'incorrect',
            'text-muted-foreground': state === 'untyped',
          })}
        >
          {char === ' ' && state === 'incorrect' ? '\u00A0' : char}
        </span>
      );
    });
  }, [textToType, userInput]);

  return (
    <div className="w-full space-y-8">
      <AlertDialog open={isCapsLockOn}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive" />
              Caps Lock is On
            </AlertDialogTitle>
            <AlertDialogDescription>
              Please turn off Caps Lock to continue the typing test.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="shadow-2xl shadow-primary/10">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Button onClick={() => fetchNewText(wordCount, language)} disabled={isLoading}>
                <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                New Text ⌘+R
              </Button>
              <Select onValueChange={handleWordCountChange} value={String(wordCount)} disabled={isLoading}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Word count" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 words</SelectItem>
                  <SelectItem value="30">30 words</SelectItem>
                  <SelectItem value="50">50 words</SelectItem>
                </SelectContent>
              </Select>
              <Select onValueChange={handleLanguageChange} value={language} disabled={isLoading}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Russian">Russian</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center space-x-2">
                <Checkbox id="backspace-off" checked={isBackspaceOff} onCheckedChange={(checked) => setIsBackspaceOff(Boolean(checked))} disabled={isLoading} />
                <Label htmlFor="backspace-off" className="cursor-pointer">backspace off</Label>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Time Elapsed: <span className="font-bold text-accent">{Math.floor(timeElapsed)}s</span></p>
          </div>
          
          <div className="relative text-2xl tracking-wide font-mono p-4 rounded-lg bg-background border border-border" onClick={() => inputRef.current?.focus()}>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-11/12" />
                <Skeleton className="h-8 w-10/12" />
              </div>
            ) : (
              <div ref={textContainerRef} className="select-none leading-relaxed relative whitespace-pre-wrap break-words">
                {status !== 'finished' && !isFocused && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 text-muted-foreground text-lg backdrop-blur-sm rounded-lg">
                    Click to focus
                  </div>
                )}
                {status !== 'finished' && isFocused && (
                   <span
                    className="absolute w-[2px] bg-primary caret"
                    style={{
                      top: `${caretPos.top}px`,
                      left: `${caretPos.left}px`,
                      height: `${caretPos.height}px`,
                    }}
                  />
                )}
                <MemoizedRenderText />
              </div>
            )}
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onPaste={(e) => e.preventDefault()}
              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-default"
              disabled={status === 'finished' || isLoading || isCapsLockOn}
              aria-label="Type here"
            />
          </div>
        </CardContent>
      </Card>

      {status === 'finished' && (
        <Card className="animate-in fade-in duration-500 shadow-2xl shadow-accent/10">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-card rounded-lg">
                <p className="text-sm text-muted-foreground uppercase tracking-widest">WPM</p>
                <p className="text-4xl font-bold text-accent">{Math.round(wpm)}</p>
              </div>
              <div className="p-4 bg-card rounded-lg">
                <p className="text-sm text-muted-foreground uppercase tracking-widest">CPM</p>
                <p className="text-4xl font-bold text-accent">{Math.round(cpm)}</p>
              </div>
              <div className="p-4 bg-card rounded-lg">
                <p className="text-sm text-muted-foreground uppercase tracking-widest">Accuracy</p>
                <p className="text-4xl font-bold text-accent">{accuracy.toFixed(0)}%</p>
              </div>
              <div className="p-4 bg-card rounded-lg">
                <p className="text-sm text-muted-foreground uppercase tracking-widest">Errors</p>
                <p className="text-4xl font-bold text-destructive">{errors}</p>
              </div>
            </div>
            <div className="mt-8 text-center">
              <Button size="lg" onClick={handleTryAgain} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <RefreshCw className="mr-2 h-4 w-4" /> Try Again ⌘+R
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
