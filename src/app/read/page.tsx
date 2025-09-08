"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase, Book } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Maximize, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

function ReadPageContent() {
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageIdx, setPageIdx] = useState(0);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareContent, setShareContent] = useState("");
  const searchParams = useSearchParams();
  const bookId = searchParams.get("id");

  useEffect(() => {
    async function loadBook() {
      if (!bookId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("books")
          .select("*")
          .eq("id", bookId)
          .single();

        if (error) throw error;
        setBook(data);
      } catch (err: unknown) {
        console.error("Error loading book:", err);
        toast.error("Failed to load story", { description: err instanceof Error ? err.message : "Unknown error" });
      } finally {
        setLoading(false);
      }
    }

    loadBook();
  }, [bookId]);

  // Auto-hide swipe hint after 5 seconds
  useEffect(() => {
    if (showSwipeHint) {
      const timer = setTimeout(() => {
        setShowSwipeHint(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSwipeHint]);

  const nextPage = useCallback(() => {
    if (book && pageIdx < book.pages.length - 1) {
      setPageIdx(pageIdx + 1);
    }
  }, [book, pageIdx]);

  const prevPage = useCallback(() => {
    if (pageIdx > 0) {
      setPageIdx(pageIdx - 1);
    }
  }, [pageIdx]);


  async function generateSocialShare() {
    if (!book) return;
    
    setIsGeneratingShare(true);
    try {
      const res = await fetch('/api/social-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: book.id,
          action: "generate_share_image",
          bookData: {
            title: book.title,
            subtitle: book.subtitle,
            city: book.city,
            childName: book.child?.name || "Your Child",
            pages: book.pages.map(page => ({
              text: page.text,
              imageUrl: page.imageUrl
            }))
          }
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate share content");
      
      // Generate shareable link
      const shareableLink = `${window.location.origin}/read?id=${book.id}`;
      
      // Combine share text and link
      const shareContent = `${data.socialText}\n\nRead the full story: ${shareableLink}`;
      
      // Try to copy to clipboard with fallback
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(shareContent);
          toast.success("Share content and link copied to clipboard!");
        } else {
          // Fallback for non-HTTPS or unsupported browsers
          await fallbackCopyTextToClipboard(shareContent);
          toast.success("Share content and link copied to clipboard!");
        }
      } catch (clipboardError) {
        // If clipboard fails, try fallback method
        console.warn('Clipboard copy failed:', clipboardError);
        try {
          await fallbackCopyTextToClipboard(shareContent);
          toast.success("Share content and link copied to clipboard!");
        } catch (fallbackError) {
          console.error('Both clipboard methods failed:', fallbackError);
          toast.error("Could not copy to clipboard. Please copy manually from the alert.");
        }
      }
    } catch (e: unknown) {
      toast.error("Failed to generate share content", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setIsGeneratingShare(false);
    }
  }

  // Function to copy text from modal
  async function copyFromModal() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareContent);
        toast.success("Content copied to clipboard!");
        setShowShareModal(false);
      } else {
        await fallbackCopyTextToClipboard(shareContent);
        toast.success("Content copied to clipboard!");
        setShowShareModal(false);
      }
    } catch (error) {
      console.error('Modal copy failed:', error);
      toast.error("Could not copy to clipboard. Please select and copy manually.");
    }
  }

  // Fallback function for copying text to clipboard
  async function fallbackCopyTextToClipboard(text: string) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    textArea.style.pointerEvents = "none";
    textArea.style.zIndex = "-1";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (!successful) {
        throw new Error('Fallback copy command was unsuccessful');
      }
      console.log('Text copied to clipboard using fallback method');
    } catch (err) {
      console.error('Fallback copy failed:', err);
      // Last resort: show the text in a modal
      setShareContent(text);
      setShowShareModal(true);
    } finally {
      document.body.removeChild(textArea);
    }
  }

  function toggleFullscreen() {
    setIsFullscreen(!isFullscreen);
  }

  // Touch/swipe handlers
  const minSwipeDistance = 50;
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
    // Hide swipe hint when user starts interacting
    if (showSwipeHint) {
      setShowSwipeHint(false);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX);

    if (isLeftSwipe && !isVerticalSwipe) {
      nextPage();
    }
    if (isRightSwipe && !isVerticalSwipe) {
      prevPage();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prevPage();
      else if (e.key === "ArrowRight") nextPage();
      else if (e.key === "Escape") {
        window.history.back();
      }
    }

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [pageIdx, nextPage, prevPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading story...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Story Not Found</h1>
          <p className="text-gray-600 mb-6">The story you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Library
            </Button>
          </Link>
        </div>
      </div>
    );
  }


  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 p-2"
              >
                <ArrowLeft className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Back to Library</span>
              </Button>
            </Link>
            <div className="min-w-0 flex-1 max-w-md sm:max-w-lg">
              <h1 className="text-lg sm:text-2xl font-bold text-white truncate">{book.title}</h1>
              <p className="text-white/70 text-sm sm:text-base line-clamp-2 leading-tight">{book.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Header buttons removed - only showing in bottom navigation */}
          </div>
        </div>
      </div>

      {/* Swipe Instruction */}
      {showSwipeHint && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none animate-fade-in">
          <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse"></div>
                <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
              <span className="text-xs">Swipe to navigate</span>
            </div>
          </div>
        </div>
      )}

      {/* Cover Flow */}
      <div 
        className="h-full flex items-center justify-center pt-20 pb-20 px-4"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="relative w-full max-w-4xl h-full perspective-1000">
          <div className="relative w-full h-full flex items-center justify-center">
            {book.pages.map((page, index) => {
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
                  className="absolute w-full max-w-sm sm:w-[500px] sm:h-[750px] transition-all duration-500 ease-out cursor-pointer"
                  style={{
                    transform: `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                    opacity,
                    zIndex: isActive ? 10 : 5 - Math.abs(distance),
                    transformStyle: 'preserve-3d',
                    backfaceVisibility: 'hidden'
                  }}
                  onClick={() => {
                    if (isPrev) prevPage();
                    if (isNext) nextPage();
                  }}
                >
                  <div className="w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                    {page.imageUrl && (
                      <div className="relative h-72 sm:h-[400px] overflow-hidden flex-shrink-0">
                        <img 
                          src={page.imageUrl} 
                          alt="Illustration" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      </div>
                    )}
                    
                    {/* Text Section - Scrollable on Mobile */}
                    <div className="flex-1 p-3 sm:p-4 flex flex-col justify-start overflow-y-auto min-h-0">
                      <div className="prose prose-sm max-w-none text-center">
                        <p className="text-sm sm:text-base leading-relaxed text-gray-900 font-medium whitespace-pre-wrap">
                          {page.text}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Navigation - 3 Icons */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4 sm:p-6">
        <div className="flex items-center justify-center gap-8 sm:gap-12">
          {/* Page Number */}
          <div className="flex items-center justify-center w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
            <span className="text-white text-sm font-medium">
              {pageIdx + 1}
            </span>
          </div>
          
          {/* Create Your Own */}
          <Link href="/create">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/20 p-3"
              title="Create Your Own Story"
            >
              <Sparkles className="w-6 h-6" />
            </Button>
          </Link>
          
          {/* Share */}
          <Button
            variant="ghost"
            size="sm"
            onClick={generateSocialShare}
            disabled={isGeneratingShare}
            className="text-white/70 hover:text-white hover:bg-white/20 disabled:opacity-50 p-3"
            title="Share Story"
          >
            {isGeneratingShare ? (
              <div className="w-6 h-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Share2 className="w-6 h-6" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Share Content</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShareModal(false)}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                Copy this content to share your story:
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4 max-h-60 overflow-y-auto">
                <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono">
                  {shareContent}
                </pre>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  onClick={copyFromModal}
                  className="flex-1"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Copy to Clipboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard?.writeText(shareContent);
                    toast.success("Content copied!");
                  }}
                  className="flex-1"
                >
                  Select All & Copy
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-center">
        <p className="text-white/60 text-sm">
          Made by{" "}
          <a 
            href="https://www.aakar.dev/?utm_source=storyvoyage&utm_medium=app&utm_campaign=footer" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-white/80 hover:text-white underline transition-colors"
          >
            Aakar
          </a>
        </p>
      </div>
    </div>
  );
}

export default function ReadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/90">Loading story...</p>
        </div>
      </div>
    }>
      <ReadPageContent />
    </Suspense>
  );
}