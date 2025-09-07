"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { BookOpen, Sparkles, Share2, Trash2, Wand2, Library, Maximize, X, Menu } from "lucide-react";
import Link from "next/link";
import { supabase, Book } from "@/lib/supabase";

// Content type interfaces
interface EducationalContent {
  comprehensionQuiz?: {
    questions?: Array<{
      question: string;
      options: string[];
      correct: string;
      explanation: string;
    }>;
  };
  vocabularyBuilder?: {
    vocabulary?: Array<{
      word: string;
      definition: string;
      example: string;
      visual: string;
    }>;
  };
  culturalFacts?: {
    culturalFacts?: Array<{
      fact: string;
      category: string;
      funElement: string;
    }>;
  };
  activities?: {
    activities?: Array<{
      title: string;
      description: string;
      materials: string;
      learningObjective: string;
    }>;
  };
}

interface AccessibilityContent {
  altText?: {
    altText: string;
    simpleAltText: string;
    emotionalContext: string;
    keyElements: string[];
  };
  simplifiedText?: {
    earlyReader: string;
    middleReader: string;
    advancedReader: string;
    originalText: string;
    readingLevels: {
      early: string;
      middle: string;
      advanced: string;
    };
  };
  dyslexiaFriendly?: {
    formatting: {
      font: string;
      size: string;
      lineHeight: string;
      letterSpacing: string;
    };
    colorCoding: Record<string, string>;
    chunking: string[];
    visualAids: string[];
    memoryTechniques: string[];
  };
}

interface PresentationContent {
  animations?: {
    animations?: Array<{
      element: string;
      type: string;
      description: string;
      duration: string;
      trigger: string;
    }>;
  };
  interactiveElements?: {
    clickableElements?: Array<{
      element: string;
      action: string;
      feedback: string;
      sound: string;
    }>;
  };
  soundEffects?: {
    ambientSounds?: Array<{
      sound: string;
      description: string;
      volume: string;
      loop: boolean;
    }>;
  };
}

interface ReadabilityContent {
  textSimplification?: {
    simplifiedVersions?: {
      verySimple: string;
      simple: string;
      enhanced: string;
      original: string;
    };
    readabilityScores?: {
      gradeLevel: string;
      difficulty: string;
      fleschKincaid: string;
    };
  };
  sentenceAnalysis?: {
    sentenceAnalysis?: {
      totalSentences: number;
      averageLength: number;
      longestSentence: number;
      shortestSentence: number;
    };
    wordAnalysis?: {
      totalWords: number;
      complexWords: string[];
    };
    flowAnalysis?: {
      smoothTransitions: string;
      awkwardPhrases: string;
    };
  };
  vocabularyHighlighting?: {
    challengingWords?: Array<{
      word: string;
      definition: string;
      contextClue: string;
      visualCue: string;
      difficulty: string;
      syllables: number;
    }>;
  };
  readingPaceGuide?: {
    paceGuide?: {
      recommendedSpeed: string;
      wordsPerMinute: number;
      totalReadingTime: string;
      pausePoints?: Array<{
        location: string;
        reason: string;
        duration: string;
      }>;
    };
  };
  comprehensionAids?: {
    questionPrompts?: Array<{
      type: string;
      questions: string[];
    }>;
    summaryGuide?: {
      mainCharacter: string;
      setting: string;
      problem: string;
      solution: string;
      lesson: string;
    };
  };
  visualReadingSupport?: {
    textFormatting?: {
      fontFamily: string;
      fontSize: string;
      lineHeight: string;
      letterSpacing: string;
    };
    colorCoding?: Record<string, string>;
  };
}

const STORAGE_KEY = "nano_travel_books_v1";

function encodeShare(book: Book) {
  return `/read?id=${book.id}`;
}

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [active, setActive] = useState<Book | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pageIdx, setPageIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [illustrationStyle, setIllustrationStyle] = useState("realistic");
  const [consistencyMode, setConsistencyMode] = useState(true); // Always enable character consistency
  const [showEducationalFeatures, setShowEducationalFeatures] = useState(false);
  const [educationalContent, setEducationalContent] = useState<EducationalContent | null>(null);
  const [showAccessibilityFeatures, setShowAccessibilityFeatures] = useState(false);
  const [accessibilityContent, setAccessibilityContent] = useState<AccessibilityContent | null>(null);
  const [showPresentationFeatures, setShowPresentationFeatures] = useState(false);
  const [presentationContent, setPresentationContent] = useState<PresentationContent | null>(null);
  const [isBatchIllustrating, setIsBatchIllustrating] = useState(false);
  const [showReadabilityFeatures, setShowReadabilityFeatures] = useState(false);
  const [readabilityContent, setReadabilityContent] = useState<ReadabilityContent | null>(null);
  const [isIllustrating, setIsIllustrating] = useState(false);
  const [isLoadingEducational, setIsLoadingEducational] = useState(false);
  const [isLoadingAccessibility, setIsLoadingAccessibility] = useState(false);
  const [isLoadingPresentation, setIsLoadingPresentation] = useState(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [isLoadingReadability, setIsLoadingReadability] = useState(false);

  // Load books from Supabase
  useEffect(() => {
    async function loadBooks() {
      try {
        const { data, error } = await supabase
          .from('books')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (error) {
          console.warn('Supabase error, loading from localStorage:', error);
          // Fallback to localStorage
          try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
              const parsed = JSON.parse(raw);
              setBooks(parsed.books || []);
            }
          } catch (localError) {
            console.error('localStorage error:', localError);
          }
          setLoading(false);
          return;
        }

        // Convert database structure to expected format
        const formattedBooks = data.map(book => ({
          id: book.id,
          title: book.title,
          subtitle: book.subtitle,
          city: book.city,
          dedication: book.dedication,
          readingLevel: book.reading_level,
          narratorPersona: book.narrator_persona,
          child: {
            name: book.child_name,
            age: book.child_age,
            interests: book.child_interests || []
          },
          pages: book.pages || [],
          glossary: book.glossary || {},
          funFacts: book.fun_facts || []
        }));

        setBooks(formattedBooks);
      } catch (error) {
        console.error('Error loading books:', error);
        // Fallback to localStorage
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            setBooks(parsed.books || []);
          }
        } catch (localError) {
          console.error('localStorage error:', localError);
        }
        toast.error('Failed to load books from database, using local storage');
      } finally {
        setLoading(false);
      }
    }
    
    loadBooks();
  }, []);

  // Save books to localStorage when they change
  useEffect(() => {
    try {
      const payload = { books };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }, [books]);

  async function _deleteBook(bookId: string) {
    try {
      // Try to delete from Supabase first
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId);
      
      if (error) console.warn('Supabase delete failed:', error);
      
      // Update local state
      setBooks(prev => prev.filter(b => b.id !== bookId));
      if (active?.id === bookId) {
        setActive(null);
        setActiveId(null);
      }
      toast.success("Book deleted");
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error('Failed to delete book');
    }
  }

  async function clearAllBooks() {
    try {
      // Try to delete all from Supabase
      const { error } = await supabase
        .from('books')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (error) console.warn('Supabase clear failed:', error);
      
      setBooks([]);
      setActive(null);
      setActiveId(null);
      toast.success("All books cleared");
    } catch (error) {
      console.error('Error clearing books:', error);
      toast.error('Failed to clear books');
    }
  }

  async function illustrateCurrentPage(style: string = "realistic", consistencyMode: boolean = true) {
    if (!active || !active.pages[pageIdx]?.prompt) return;
    
    setIsIllustrating(true);
    try {
      const res = await fetch('/api/advanced-illustrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: active.pages[pageIdx].prompt,
          style,
          consistencyMode: true, // Always enable character consistency
          characterDescription: active.child?.name ? `A ${active.child.age}-year-old child named ${active.child.name}` : undefined,
          previousImageUrl: pageIdx > 0 ? active.pages[pageIdx - 1]?.imageUrl : undefined,
          editMode: pageIdx > 0
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to illustrate");
      const url: string = data.imageUrl;
      
      // Update in Supabase
      const updatedPages = active.pages.map((p, i) => i === pageIdx ? { ...p, imageUrl: url } : p);
      const { error } = await supabase
        .from('books')
        .update({ pages: updatedPages })
        .eq('id', active.id);
      
      if (error) throw error;
      
      setBooks(prev => prev.map(b => {
        if (b.id !== active.id) return b;
        return { ...b, pages: updatedPages };
      }));
      setActive({ ...active, pages: updatedPages });
      toast.success("Advanced illustration added");
    } catch (e: unknown) {
      toast.error("Illustration failed", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setIsIllustrating(false);
    }
  }

  async function loadEducationalFeatures() {
    if (!active || !active.pages[pageIdx]) return;
    
    setIsLoadingEducational(true);
    try {
      const res = await fetch('/api/educational-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: active.id,
          pageText: active.pages[pageIdx].text,
          readingLevel: active.readingLevel,
          childAge: active.child.age,
          city: active.city,
          features: ["comprehension_quiz", "vocabulary_builder", "cultural_facts", "activity_suggestions"]
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load educational features");
      
      setEducationalContent(data.educationalContent);
      setShowEducationalFeatures(true);
      toast.success("Educational features loaded");
    } catch (e: unknown) {
      toast.error("Failed to load educational features", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setIsLoadingEducational(false);
    }
  }

  async function generateSocialShare() {
    if (!active) return;
    
    setIsGeneratingShare(true);
    try {
      const res = await fetch('/api/social-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: active.id,
          action: "generate_share_image",
          bookData: {
            title: active.title,
            subtitle: active.subtitle,
            city: active.city,
            childName: active.child.name,
            pages: active.pages
          }
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate share content");
      
      // Generate shareable link
      const shareableLink = `${window.location.origin}/read?id=${active.id}`;
      
      // Combine share text and link
      const shareContent = `${data.socialText}\n\nRead the full story: ${shareableLink}`;
      
      // Copy share content to clipboard
      await navigator.clipboard.writeText(shareContent);
      toast.success("Share content and link copied to clipboard!");
    } catch (e: unknown) {
      toast.error("Failed to generate share content", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setIsGeneratingShare(false);
    }
  }

  async function loadAccessibilityFeatures() {
    if (!active || !active.pages[pageIdx]) return;
    
    setIsLoadingAccessibility(true);
    try {
      const res = await fetch('/api/accessibility-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: active.id,
          pageText: active.pages[pageIdx].text,
          imageUrl: active.pages[pageIdx].imageUrl,
          readingLevel: active.readingLevel,
          childAge: active.child.age,
          features: ["alt_text_generation", "simplified_text", "dyslexia_friendly", "audio_description"]
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load accessibility features");
      
      setAccessibilityContent(data.accessibilityContent);
      setShowAccessibilityFeatures(true);
      toast.success("Accessibility features loaded");
    } catch (e: unknown) {
      toast.error("Failed to load accessibility features", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setIsLoadingAccessibility(false);
    }
  }

  async function loadPresentationFeatures() {
    if (!active || !active.pages[pageIdx]) return;
    
    setIsLoadingPresentation(true);
    try {
      const res = await fetch('/api/presentation-enhancements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: active.id,
          pageText: active.pages[pageIdx].text,
          imageUrl: active.pages[pageIdx].imageUrl,
          readingLevel: active.readingLevel,
          childAge: active.child.age,
          enhancements: ["animation_effects", "interactive_elements", "sound_effects", "storytelling_improvements"]
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load presentation features");
      
      setPresentationContent(data.presentationContent);
      setShowPresentationFeatures(true);
      toast.success("Presentation features loaded");
    } catch (e: unknown) {
      toast.error("Failed to load presentation features", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setIsLoadingPresentation(false);
    }
  }

  async function batchIllustrateAllPages() {
    if (!active) return;
    
    setIsBatchIllustrating(true);
    try {
      const pagesWithPrompts = active.pages
        .map((page, index) => ({ ...page, pageIndex: index }))
        .filter(page => page.prompt);
      
      const res = await fetch('/api/batch-illustrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: active.id,
          pages: pagesWithPrompts,
          characterDescription: active.child?.name ? `A ${active.child.age}-year-old child named ${active.child.name}` : undefined,
          style: illustrationStyle,
          consistencyMode: true, // Always enable character consistency
          fusionMode: true,
          batchSize: 3
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to batch illustrate");
      
      // Update book with new illustrations
      const updatedPages = active.pages.map((page, index) => {
        const result = data.results.find((r: { pageIndex: number; imageUrl: string }) => r.pageIndex === index);
        return result ? { ...page, imageUrl: result.imageUrl } : page;
      });
      
      // Update in Supabase
      const { error } = await supabase
        .from('books')
        .update({ pages: updatedPages })
        .eq('id', active.id);
      
      if (error) throw error;
      
      setBooks(prev => prev.map(b => {
        if (b.id !== active.id) return b;
        return { ...b, pages: updatedPages };
      }));
      setActive({ ...active, pages: updatedPages });
      
      toast.success(`Batch illustration completed! ${data.summary.successful}/${data.summary.totalPages} pages illustrated`);
    } catch (e: unknown) {
      toast.error("Batch illustration failed", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setIsBatchIllustrating(false);
    }
  }

  async function loadReadabilityFeatures() {
    if (!active || !active.pages[pageIdx]) return;
    
    setIsLoadingReadability(true);
    try {
      const res = await fetch('/api/readability-enhancements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: active.id,
          pageText: active.pages[pageIdx].text,
          readingLevel: active.readingLevel,
          childAge: active.child.age,
          features: ["text_simplification", "sentence_analysis", "vocabulary_highlighting", "reading_pace_guide", "comprehension_aids", "visual_reading_support"]
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load readability features");
      
      setReadabilityContent(data.readabilityContent);
      setShowReadabilityFeatures(true);
      toast.success("Readability features loaded");
    } catch (e: unknown) {
      toast.error("Failed to load readability features", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setIsLoadingReadability(false);
    }
  }

  // Touch/swipe handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || !active) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && pageIdx < active.pages.length - 1) {
      setPageIdx(pageIdx + 1);
    }
    if (isRightSwipe && pageIdx > 0) {
      setPageIdx(pageIdx - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!active) return;
      
      if (e.key === 'ArrowLeft' && pageIdx > 0) {
        setPageIdx(pageIdx - 1);
      } else if (e.key === 'ArrowRight' && pageIdx < active.pages.length - 1) {
        setPageIdx(pageIdx + 1);
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [active, pageIdx, isFullscreen]);

  function toggleFullscreen() {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/90">Loading your stories...</p>
        </div>
      </div>
    );
  }

  // Fullscreen Story Reader
  if (isFullscreen && active) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* Fullscreen Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5 mr-2" />
                Exit
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">{active.title}</h1>
                <p className="text-white/70">{active.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-white/70 text-sm">
                Page {pageIdx + 1} of {active.pages.length}
              </div>
              <Button
                variant="ghost"
                size="sm"
                    onClick={() => illustrateCurrentPage(illustrationStyle, true)}
                className="text-white hover:bg-white/20"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Illustrate
              </Button>
            </div>
          </div>
        </div>

        {/* Fullscreen Cover Flow */}
        <div 
          className="h-full flex items-center justify-center pt-20 pb-20"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="relative w-full max-w-4xl h-full perspective-1000">
            <div className="relative w-full h-full flex items-center justify-center">
              {active.pages.map((page, index) => {
                const distance = index - pageIdx;
                const isActive = distance === 0;
                const isPrev = distance === -1;
                const isNext = distance === 1;
                const isFarLeft = distance < -1;
                const isFarRight = distance > 1;

                if (isFarLeft || isFarRight) return null;
                
                const translateX = distance * 100;
                const translateZ = -Math.abs(distance) * 50;
                const rotateY = distance * 15;
                const scale = isActive ? 1 : 0.8;
                const opacity = isActive ? 1 : isPrev || isNext ? 0.6 : 0.3;
                
  return (
                  <div
                    key={index}
                    className="absolute w-full max-w-lg h-4/5 transition-all duration-500 ease-out cursor-pointer"
                    style={{
                      transform: `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                      opacity,
                      zIndex: isActive ? 10 : 5 - Math.abs(distance),
                    }}
                    onClick={() => {
                      if (isPrev) setPageIdx(Math.max(0, pageIdx - 1));
                      if (isNext) setPageIdx(Math.min(active.pages.length - 1, pageIdx + 1));
                    }}
                  >
                    <div className="w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden">
                        {page.imageUrl && (
                        <div className="h-1/2">
                            <img 
                              src={page.imageUrl} 
                            alt={`Page ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Image failed to load:', page.imageUrl);
                              e.currentTarget.style.display = 'none';
                            }}
                            onLoad={() => {
                              console.log('Image loaded successfully:', page.imageUrl);
                            }}
                          />
                          </div>
                        )}
                      <div className="h-1/2 p-6 flex flex-col justify-center">
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            Page {index + 1}
                          </h3>
                          <p className="text-gray-600 leading-relaxed">
                            {page.text}
                          </p>
                          {page.activity && (
                            <div className="mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-amber-600 text-lg">☀️</span>
                                <h4 className="text-sm font-semibold text-amber-900">
                                  Try This Activity!
                                </h4>
                                </div>
                              <p className="text-xs text-amber-800">
                                {page.activity}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Fullscreen Navigation */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-6">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setPageIdx(Math.max(0, pageIdx - 1))}
            disabled={pageIdx === 0}
            className="text-white hover:bg-white/20 disabled:opacity-30"
          >
            ◀ Previous
          </Button>
          
          <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-6 py-3">
            <span className="text-white text-sm">Use arrow keys or swipe to navigate</span>
          </div>
          
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setPageIdx(Math.min(active.pages.length - 1, pageIdx + 1))}
            disabled={pageIdx === active.pages.length - 1}
            className="text-white hover:bg-white/20 disabled:opacity-30"
          >
            Next ▶
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden">
      <SidebarProvider>
        <div className="h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden">
          {/* Header - Only show when no story is active */}
          {!active && (
            <div className="border-b border-border/50 p-6 w-full">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Library className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">🚀 StoryVoyage</h1>
                    <p className="text-white/90">Your colorful adventure library</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="text-white hover:bg-white/20"
                  >
                    <Menu className="w-5 h-5 mr-2" />
                    {sidebarOpen ? 'Hide Library' : 'Show Library'}
                  </Button>
                  <Button asChild size="lg" className="kid-button">
                    <Link href="/create">
                      <Wand2 className="w-5 h-5 mr-2" />
                      ✨ Create New Story
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Header - Only show when story is open */}
          {active && (
            <div className="border-b border-border/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setActive(null);
                      setActiveId(null);
                    }}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="w-5 h-5 mr-2" />
                    Back to Library
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold text-white">{active.title}</h1>
                    <p className="text-white/70">{active.city}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-white/70 text-sm">
                    Page {pageIdx + 1} of {active.pages.length}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/20 bg-white/10 hover:bg-white/20"
                    title="Enter Fullscreen Reading Mode"
                  >
                    <Maximize className="w-4 h-4 mr-2" />
                    Fullscreen
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(encodeShare(active), '_blank')}
                    className="text-white hover:bg-white/20"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Content Area with Sidebar */}
          <div className="flex-1 flex min-h-0">
            {/* Sidebar - Hidden when story is open */}
            {!active && sidebarOpen && (
              <div className="w-80 lg:w-96 xl:w-80 border-r border-border/50 transition-all duration-300 ease-in-out bg-slate-900/50 flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
                <div className="p-4 flex-1 sidebar-scroll h-fit" >
                  <div className="space-y-4 pb-6">
                    {books.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h2 className="text-lg font-semibold text-white">Library</h2>
                          <Button variant="ghost" size="sm" onClick={clearAllBooks} className="text-white/70 hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {books.map((book: Book) => (
                            <Card 
                              key={book.id} 
                              className={`cursor-pointer transition-all duration-200 hover:shadow-md bounce-in crayon-border ${
                                activeId === book.id ? 'ring-1 ring-primary/50 bg-primary/5 coloring-book-page' : 'hover:bg-muted/50 hover:coloring-book-page'
                              }`}
                              onClick={() => {
                                setActive(book);
                                setActiveId(book.id);
                                setPageIdx(0); // Reset to first page
                              }}
                            >
                              <CardContent className="p-4">
                                <div className="space-y-2">
                                  <h3 className="font-semibold text-base text-white">{book.title}</h3>
                                  <p className="text-white/80 text-sm line-clamp-2">{book.subtitle}</p>
                                  <div className="flex items-center gap-3 text-xs text-white/70">
                                    <span>{book.city}</span>
                                    <span>•</span>
                                    <span>{book.pages.length} pages</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col w-full transition-all duration-300 ease-in-out">
              {/* Content */}
              <div className="flex-1 p-6 w-full max-w-full overflow-hidden">
            {books.length === 0 ? (
              <div className="text-center py-20 min-h-[80vh] flex flex-col items-center justify-center w-full">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center mx-auto mb-8 animate-pulse">
                  <BookOpen className="w-16 h-16 text-primary" />
                </div>
                <h2 className="text-4xl font-bold mb-6 text-white">No Stories Yet</h2>
                <p className="text-white/80 text-xl mb-8 max-w-2xl mx-auto">
                  Create your first magical story and watch it come to life with beautiful illustrations.
                </p>
                <Button asChild size="lg" className="kid-button text-lg px-8 py-4">
                  <Link href="/create">
                    <Wand2 className="w-6 h-6 mr-3" />
                    ✨ Create Your First Story
                  </Link>
                </Button>
              </div>
            ) : !active ? (
              <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-8 w-full max-w-none">
                <div className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center mb-8 animate-pulse">
                  <BookOpen className="w-20 h-20 text-primary" />
                </div>
                <h3 className="text-5xl font-bold mb-6 text-white">Select a Story</h3>
                <p className="text-white/80 text-2xl max-w-4xl mb-8">
                  {!sidebarOpen ? 'Click "Show Library" to see your stories, or ' : 'Choose a story from your library to start reading.'}
                </p>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-8 py-6 border border-white/20 max-w-4xl">
                  <p className="text-white/90 text-xl">
                    {!sidebarOpen 
                      ? '💡 Click "Show Library" in the header to see your stories, then click on any story card to start reading!'
                      : '💡 Click on any story card in the library to start reading, then use the "Fullscreen" button for an immersive experience!'
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <Card className="glass card-hover min-h-[600px] flex-1">
                  <CardContent className="flex-1 p-8">
                    {/* Cover Flow Story Reader */}
                    <div 
                      className="h-full flex items-center justify-center"
                      onTouchStart={onTouchStart}
                      onTouchMove={onTouchMove}
                      onTouchEnd={onTouchEnd}
                    >
                      <div className="relative w-full max-w-4xl h-full perspective-1000">
                        <div className="relative w-full h-full flex items-center justify-center">
                          {active.pages.map((page, index) => {
                            const distance = index - pageIdx;
                            const isActive = distance === 0;
                            const isVisible = Math.abs(distance) <= 2;
                            
                            if (!isVisible) return null;
                            
                            return (
                              <div
                                key={index}
                                className={`absolute transition-all duration-700 ease-out transform-gpu ${
                                  isActive 
                                    ? 'z-30 scale-100 opacity-100' 
                                    : distance < 0 
                                  ? `z-20 scale-75 opacity-60 -translate-x-40 rotate-y-15`
                                  : `z-20 scale-75 opacity-60 translate-x-40 -rotate-y-15`
                                }`}
                                style={{
                                  transform: `translateX(${distance * 350}px) rotateY(${distance * 15}deg) scale(${isActive ? 1 : 0.75})`,
                                  transformStyle: 'preserve-3d',
                                  backfaceVisibility: 'hidden'
                                }}
                              >
                    {/* Page Card */}
                    <div className="relative w-[500px] h-[700px] coloring-book-page overflow-hidden">
                                  
                                  {/* Page Content */}
                                  <div className="h-full flex flex-col">
                                    {/* Image Section */}
                                    {page.imageUrl && (
                                      <div className="relative h-96 overflow-hidden">
                                        <img 
                                          src={page.imageUrl} 
                                          alt="Illustration" 
                                          className="w-full h-full object-contain bg-slate-100 dark:bg-slate-700"
                                          onError={(e) => {
                                            console.error('Image failed to load:', page.imageUrl);
                                            e.currentTarget.style.display = 'none';
                                          }}
                                          onLoad={() => {
                                            console.log('Image loaded successfully:', page.imageUrl);
                                          }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                                      </div>
                                    )}
                                    
                                    {/* Text Section */}
                                    <div className="flex-1 p-6 flex flex-col justify-center">
                                      <div className="prose prose-sm max-w-none text-center">
                                        <p className="text-sm leading-relaxed text-gray-900 font-medium whitespace-pre-wrap line-clamp-8 bg-white/90 p-4 rounded-lg shadow-md">
                                          {page.text}
                                        </p>
                                      </div>
                                      
                                      {/* Activity */}
                                      {page.activity && (
                                        <div className="mt-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                                          <div className="flex items-start gap-3">
                                            <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-1">
                                              <Sparkles className="w-3 h-3 text-white" />
                                            </div>
                                            <div>
                                              <h4 className="font-semibold text-amber-900 dark:text-amber-100 text-xs mb-1">Try This!</h4>
                                              <p className="text-amber-800 dark:text-amber-200 text-xs">{page.activity}</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Page Reflection Effect */}
                                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/30 to-transparent dark:from-slate-800/30 pointer-events-none" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPageIdx(Math.max(0, pageIdx - 1))}
                    disabled={pageIdx === 0}
                    className="text-white/70 hover:text-white disabled:opacity-30"
                  >
                    ◀ Previous
                  </Button>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-white/70 text-sm font-medium">
                      {pageIdx + 1} / {active.pages.length}
                    </div>
                    
                    {/* Advanced Illustration Controls */}
                    <div className="flex items-center gap-2">
                      <select
                        value={illustrationStyle}
                        onChange={(e) => setIllustrationStyle(e.target.value)}
                        className="bg-white text-gray-900 text-xs px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="realistic" className="text-gray-900">Realistic</option>
                        <option value="cartoon" className="text-gray-900">Cartoon</option>
                        <option value="watercolor" className="text-gray-900">Watercolor</option>
                        <option value="sketch" className="text-gray-900">Sketch</option>
                      </select>
                      
                      <label className="flex items-center gap-1 text-xs text-white">
                        <input
                          type="checkbox"
                          checked={consistencyMode}
                          disabled={true}
                          className="w-3 h-3 opacity-50"
                        />
                        Consistency (Always On)
                      </label>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => illustrateCurrentPage(illustrationStyle, true)}
                      disabled={isIllustrating}
                      className="text-white/70 hover:text-white disabled:opacity-50"
                      title="Generate Advanced Illustration"
                    >
                      {isIllustrating ? (
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadEducationalFeatures}
                      disabled={isLoadingEducational}
                      className="text-white/70 hover:text-white disabled:opacity-50"
                      title="Load Educational Features"
                    >
                      {isLoadingEducational ? (
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        "📚"
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadAccessibilityFeatures}
                      disabled={isLoadingAccessibility}
                      className="text-white/70 hover:text-white disabled:opacity-50"
                      title="Accessibility Features"
                    >
                      {isLoadingAccessibility ? (
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        "♿"
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadPresentationFeatures}
                      disabled={isLoadingPresentation}
                      className="text-white/70 hover:text-white disabled:opacity-50"
                      title="Presentation Enhancements"
                    >
                      {isLoadingPresentation ? (
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        "✨"
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadReadabilityFeatures}
                      disabled={isLoadingReadability}
                      className="text-white/70 hover:text-white disabled:opacity-50"
                      title="Readability Enhancements"
                    >
                      {isLoadingReadability ? (
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        "📖"
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={batchIllustrateAllPages}
                      disabled={isBatchIllustrating}
                      className="text-white/70 hover:text-white disabled:opacity-50"
                      title="Batch Illustrate All Pages"
                    >
                      {isBatchIllustrating ? (
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        "🎨"
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={generateSocialShare}
                      disabled={isGeneratingShare}
                      className="text-white/70 hover:text-white disabled:opacity-50"
                      title="Share Story"
                    >
                      {isGeneratingShare ? (
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleFullscreen}
                      className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20"
                      title="Enter Fullscreen Reading Mode"
                    >
                      <Maximize className="w-4 h-4 mr-2" />
                      Fullscreen
                    </Button>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPageIdx(Math.min(active.pages.length - 1, pageIdx + 1))}
                    disabled={pageIdx === active.pages.length - 1}
                    className="text-white/70 hover:text-white disabled:opacity-30"
                  >
                    Next ▶
                  </Button>
                </div>
              </div>
        )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Educational Features Panel */}
        {showEducationalFeatures && educationalContent && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-4xl max-h-[80vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Educational Features</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowEducationalFeatures(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Comprehension Quiz */}
                {educationalContent.comprehensionQuiz && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">📝 Comprehension Quiz</h3>
                    <div className="space-y-3">
                      {educationalContent.comprehensionQuiz.questions?.map((q, idx: number) => (
                        <div key={idx} className="bg-white rounded p-3 border border-gray-200">
                          <p className="font-medium text-gray-900 mb-2">{q.question}</p>
                          <div className="space-y-1">
                            {q.options?.map((option: string, optIdx: number) => (
                              <label key={optIdx} className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                                <input type="radio" name={`q${idx}`} className="w-4 h-4" />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                          <p className="text-xs text-gray-800 mt-2 font-medium">Answer: {q.correct} - {q.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Vocabulary Builder */}
                {educationalContent.vocabularyBuilder && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-green-900 mb-3">📚 Vocabulary Builder</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {educationalContent.vocabularyBuilder.vocabulary?.map((word, idx: number) => (
                        <div key={idx} className="bg-white rounded p-3 border border-gray-200">
                          <h4 className="font-semibold text-green-800">{word.word}</h4>
                          <p className="text-sm text-gray-900 font-medium mb-1">{word.definition}</p>
                          <p className="text-xs text-gray-800 italic">&quot;{word.example}&quot;</p>
                          <p className="text-xs text-gray-700 mt-1">{word.visual}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Cultural Facts */}
                {educationalContent.culturalFacts && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-purple-900 mb-3">🌍 Cultural Facts</h3>
                    <div className="space-y-2">
                      {educationalContent.culturalFacts.culturalFacts?.map((fact, idx: number) => (
                        <div key={idx} className="bg-white rounded p-3 border border-gray-200">
                          <p className="text-gray-900 mb-1 font-medium">{fact.fact}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-800">
                            <span className="bg-purple-100 px-2 py-1 rounded">{fact.category}</span>
                            <span>{fact.funElement}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Activities */}
                {educationalContent.activities && (
                  <div className="bg-orange-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-orange-900 mb-3">🎨 Activity Suggestions</h3>
                    <div className="space-y-3">
                      {educationalContent.activities.activities?.map((activity, idx: number) => (
                        <div key={idx} className="bg-white rounded p-3">
                          <h4 className="font-semibold text-orange-800 mb-1">{activity.title}</h4>
                          <p className="text-sm text-gray-700 mb-2">{activity.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <span><strong>Materials:</strong> {activity.materials}</span>
                            <span><strong>Learning:</strong> {activity.learningObjective}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Accessibility Features Panel */}
        {showAccessibilityFeatures && accessibilityContent && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-4xl max-h-[80vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Accessibility Features</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowAccessibilityFeatures(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Alt Text */}
                {accessibilityContent.altText && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">🖼️ Image Description</h3>
                    <div className="space-y-3">
                      <div className="bg-white rounded p-3">
                        <h4 className="font-medium text-gray-900 mb-2">Detailed Description</h4>
                        <p className="text-sm text-gray-700">{accessibilityContent.altText.altText}</p>
                      </div>
                      <div className="bg-white rounded p-3">
                        <h4 className="font-medium text-gray-900 mb-2">Simple Version</h4>
                        <p className="text-sm text-gray-700">{accessibilityContent.altText.simpleAltText}</p>
                      </div>
                      <div className="bg-white rounded p-3">
                        <h4 className="font-medium text-gray-900 mb-2">Key Elements</h4>
                        <div className="flex flex-wrap gap-2">
                          {accessibilityContent.altText.keyElements?.map((element: string, idx: number) => (
                            <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                              {element}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Simplified Text */}
                {accessibilityContent.simplifiedText && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-green-900 mb-3">📖 Reading Levels</h3>
                    <div className="space-y-3">
                      <div className="bg-white rounded p-3">
                        <h4 className="font-medium text-green-800 mb-2">Early Reader (3-5 years)</h4>
                        <p className="text-sm text-gray-700">{accessibilityContent.simplifiedText.earlyReader}</p>
                      </div>
                      <div className="bg-white rounded p-3">
                        <h4 className="font-medium text-green-800 mb-2">Middle Reader (6-8 years)</h4>
                        <p className="text-sm text-gray-700">{accessibilityContent.simplifiedText.middleReader}</p>
                      </div>
                      <div className="bg-white rounded p-3">
                        <h4 className="font-medium text-green-800 mb-2">Advanced Reader (9-12 years)</h4>
                        <p className="text-sm text-gray-700">{accessibilityContent.simplifiedText.advancedReader}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Dyslexia Support */}
                {accessibilityContent.dyslexiaFriendly && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-purple-900 mb-3">🔤 Dyslexia-Friendly Formatting</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded p-3">
                        <h4 className="font-medium text-purple-800 mb-2">Font & Formatting</h4>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• Font: {accessibilityContent.dyslexiaFriendly.formatting?.font}</li>
                          <li>• Size: {accessibilityContent.dyslexiaFriendly.formatting?.size}</li>
                          <li>• Line Height: {accessibilityContent.dyslexiaFriendly.formatting?.lineHeight}</li>
                          <li>• Letter Spacing: {accessibilityContent.dyslexiaFriendly.formatting?.letterSpacing}</li>
                        </ul>
                      </div>
                      <div className="bg-white rounded p-3">
                        <h4 className="font-medium text-purple-800 mb-2">Color Coding</h4>
                        <div className="space-y-1">
                          {accessibilityContent.dyslexiaFriendly.colorCoding && Object.entries(accessibilityContent.dyslexiaFriendly.colorCoding).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2 text-sm">
                              <div className="w-4 h-4 rounded" style={{ backgroundColor: value as string }}></div>
                              <span className="capitalize">{key}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Presentation Features Panel */}
        {showPresentationFeatures && presentationContent && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-4xl max-h-[80vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Presentation Enhancements</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowPresentationFeatures(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Animations */}
                {presentationContent.animations && (
                  <div className="bg-orange-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-orange-900 mb-3">🎬 Animation Effects</h3>
                    <div className="space-y-3">
                      {presentationContent.animations.animations?.map((animation, idx: number) => (
                        <div key={idx} className="bg-white rounded p-3">
                          <h4 className="font-medium text-orange-800 mb-1">{animation.element} - {animation.type}</h4>
                          <p className="text-sm text-gray-700 mb-2">{animation.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <span>Duration: {animation.duration}</span>
                            <span>Trigger: {animation.trigger}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Interactive Elements */}
                {presentationContent.interactiveElements && (
                  <div className="bg-pink-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-pink-900 mb-3">🎮 Interactive Elements</h3>
                    <div className="space-y-3">
                      {presentationContent.interactiveElements.clickableElements?.map((element, idx: number) => (
                        <div key={idx} className="bg-white rounded p-3">
                          <h4 className="font-medium text-pink-800 mb-1">Clickable: {element.element}</h4>
                          <p className="text-sm text-gray-700 mb-2">Action: {element.action} - {element.feedback}</p>
                          <p className="text-xs text-gray-600">Sound: {element.sound}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Sound Effects */}
                {presentationContent.soundEffects && (
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-indigo-900 mb-3">🔊 Sound Effects</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {presentationContent.soundEffects.ambientSounds?.map((sound, idx: number) => (
                        <div key={idx} className="bg-white rounded p-3">
                          <h4 className="font-medium text-indigo-800 mb-1">{sound.sound}</h4>
                          <p className="text-sm text-gray-700 mb-2">{sound.description}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span>Volume: {sound.volume}</span>
                            <span>Loop: {sound.loop ? 'Yes' : 'No'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Readability Features Panel */}
        {showReadabilityFeatures && readabilityContent && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-5xl max-h-[80vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Readability Enhancements</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowReadabilityFeatures(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Text Simplification */}
                {readabilityContent.textSimplification && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">📝 Text Simplification</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded p-3 border border-gray-200">
                          <h4 className="font-medium text-blue-800 mb-2">Very Simple</h4>
                          <p className="text-sm text-gray-900 font-medium">{readabilityContent.textSimplification.simplifiedVersions?.verySimple}</p>
                        </div>
                        <div className="bg-white rounded p-3 border border-gray-200">
                          <h4 className="font-medium text-blue-800 mb-2">Simple</h4>
                          <p className="text-sm text-gray-900 font-medium">{readabilityContent.textSimplification.simplifiedVersions?.simple}</p>
                        </div>
                        <div className="bg-white rounded p-3 border border-gray-200">
                          <h4 className="font-medium text-blue-800 mb-2">Enhanced</h4>
                          <p className="text-sm text-gray-900 font-medium">{readabilityContent.textSimplification.simplifiedVersions?.enhanced}</p>
                        </div>
                        <div className="bg-white rounded p-3 border border-gray-200">
                          <h4 className="font-medium text-blue-800 mb-2">Original</h4>
                          <p className="text-sm text-gray-900 font-medium">{readabilityContent.textSimplification.simplifiedVersions?.original}</p>
                        </div>
                      </div>
                      <div className="bg-white rounded p-3 border border-gray-200">
                        <h4 className="font-medium text-blue-800 mb-2">Readability Scores</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-900 font-medium">
                          <span>Grade Level: {readabilityContent.textSimplification.readabilityScores?.gradeLevel}</span>
                          <span>Difficulty: {readabilityContent.textSimplification.readabilityScores?.difficulty}</span>
                          <span>Flesch-Kincaid: {readabilityContent.textSimplification.readabilityScores?.fleschKincaid}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Sentence Analysis */}
                {readabilityContent.sentenceAnalysis && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-green-900 mb-3">📊 Sentence Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded p-3 border border-gray-200">
                        <h4 className="font-medium text-green-800 mb-2">Sentence Stats</h4>
                        <ul className="text-sm text-gray-900 font-medium space-y-1">
                          <li>Total: {readabilityContent.sentenceAnalysis.sentenceAnalysis?.totalSentences}</li>
                          <li>Avg Length: {readabilityContent.sentenceAnalysis.sentenceAnalysis?.averageLength} words</li>
                          <li>Longest: {readabilityContent.sentenceAnalysis.sentenceAnalysis?.longestSentence} words</li>
                          <li>Shortest: {readabilityContent.sentenceAnalysis.sentenceAnalysis?.shortestSentence} words</li>
                        </ul>
                      </div>
                      <div className="bg-white rounded p-3 border border-gray-200">
                        <h4 className="font-medium text-green-800 mb-2">Word Analysis</h4>
                        <ul className="text-sm text-gray-900 font-medium space-y-1">
                          <li>Total Words: {readabilityContent.sentenceAnalysis.wordAnalysis?.totalWords}</li>
                          <li>Complex Words: {readabilityContent.sentenceAnalysis.wordAnalysis?.complexWords?.join(", ")}</li>
                        </ul>
                      </div>
                      <div className="bg-white rounded p-3 border border-gray-200">
                        <h4 className="font-medium text-green-800 mb-2">Flow Analysis</h4>
                        <ul className="text-sm text-gray-900 font-medium space-y-1">
                          <li>Smooth Transitions: {readabilityContent.sentenceAnalysis.flowAnalysis?.smoothTransitions}</li>
                          <li>Awkward Phrases: {readabilityContent.sentenceAnalysis.flowAnalysis?.awkwardPhrases}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Vocabulary Highlighting */}
                {readabilityContent.vocabularyHighlighting && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-purple-900 mb-3">🔤 Vocabulary Support</h3>
                    <div className="space-y-3">
                      {readabilityContent.vocabularyHighlighting.challengingWords?.map((word, idx: number) => (
                        <div key={idx} className="bg-white rounded p-3 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-purple-800">{word.word}</h4>
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                              {word.difficulty} • {word.syllables} syllables
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 font-medium mb-1">{word.definition}</p>
                          <p className="text-xs text-gray-800 italic">&quot;{word.contextClue}&quot;</p>
                          <p className="text-xs text-gray-700 mt-1">Visual: {word.visualCue}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Reading Pace Guide */}
                {readabilityContent.readingPaceGuide && (
                  <div className="bg-orange-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-orange-900 mb-3">⏱️ Reading Pace Guide</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded p-3 border border-gray-200">
                        <h4 className="font-medium text-orange-800 mb-2">Pace Recommendations</h4>
                        <ul className="text-sm text-gray-900 font-medium space-y-1">
                          <li>Speed: {readabilityContent.readingPaceGuide.paceGuide?.recommendedSpeed}</li>
                          <li>WPM: {readabilityContent.readingPaceGuide.paceGuide?.wordsPerMinute}</li>
                          <li>Time: {readabilityContent.readingPaceGuide.paceGuide?.totalReadingTime}</li>
                        </ul>
                      </div>
                      <div className="bg-white rounded p-3 border border-gray-200">
                        <h4 className="font-medium text-orange-800 mb-2">Pause Points</h4>
                        <div className="space-y-2">
                          {readabilityContent.readingPaceGuide.paceGuide?.pausePoints?.map((pause, idx: number) => (
                            <div key={idx} className="text-xs text-gray-900 font-medium">
                              <strong>{pause.location}:</strong> {pause.reason} ({pause.duration})
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Comprehension Aids */}
                {readabilityContent.comprehensionAids && (
                  <div className="bg-pink-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-pink-900 mb-3">🧠 Comprehension Aids</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded p-3 border border-gray-200">
                        <h4 className="font-medium text-pink-800 mb-2">Question Prompts</h4>
                        <div className="space-y-2">
                          {readabilityContent.comprehensionAids.questionPrompts?.map((prompt, idx: number) => (
                            <div key={idx} className="text-sm">
                              <strong className="text-pink-700">{prompt.type}:</strong>
                              <ul className="ml-4 mt-1 space-y-1">
                                {prompt.questions?.map((q: string, qIdx: number) => (
                                  <li key={qIdx} className="text-gray-900 font-medium">• {q}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white rounded p-3 border border-gray-200">
                        <h4 className="font-medium text-pink-800 mb-2">Summary Guide</h4>
                        <ul className="text-sm text-gray-900 font-medium space-y-1">
                          <li><strong>Character:</strong> {readabilityContent.comprehensionAids.summaryGuide?.mainCharacter}</li>
                          <li><strong>Setting:</strong> {readabilityContent.comprehensionAids.summaryGuide?.setting}</li>
                          <li><strong>Problem:</strong> {readabilityContent.comprehensionAids.summaryGuide?.problem}</li>
                          <li><strong>Solution:</strong> {readabilityContent.comprehensionAids.summaryGuide?.solution}</li>
                          <li><strong>Lesson:</strong> {readabilityContent.comprehensionAids.summaryGuide?.lesson}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Visual Reading Support */}
                {readabilityContent.visualReadingSupport && (
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-indigo-900 mb-3">👁️ Visual Reading Support</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded p-3 border border-gray-200">
                        <h4 className="font-medium text-indigo-800 mb-2">Text Formatting</h4>
                        <ul className="text-sm text-gray-900 font-medium space-y-1">
                          <li>Font: {readabilityContent.visualReadingSupport.textFormatting?.fontFamily}</li>
                          <li>Size: {readabilityContent.visualReadingSupport.textFormatting?.fontSize}</li>
                          <li>Line Height: {readabilityContent.visualReadingSupport.textFormatting?.lineHeight}</li>
                          <li>Letter Spacing: {readabilityContent.visualReadingSupport.textFormatting?.letterSpacing}</li>
                        </ul>
                      </div>
                      <div className="bg-white rounded p-3 border border-gray-200">
                        <h4 className="font-medium text-indigo-800 mb-2">Color Coding</h4>
                        <div className="space-y-1">
                          {readabilityContent.visualReadingSupport.colorCoding && Object.entries(readabilityContent.visualReadingSupport.colorCoding).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                              <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: value as string }}></div>
                              <span className="capitalize">{key}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SidebarProvider>
    </div>
  );
}