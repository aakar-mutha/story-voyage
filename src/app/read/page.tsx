"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase, Book } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

function ReadPageContent() {
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageIdx, setPageIdx] = useState(0);
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


  async function shareStory() {
    if (!book) return;
    
    try {
      const shareableLink = `${window.location.origin}/read?id=${book.id}`;
      const shareText = `Check out this amazing story: "${book.title}" - ${book.subtitle}`;
      const shareContent = `${shareText}\n\nRead the full story: ${shareableLink}`;
      
      await navigator.clipboard.writeText(shareContent);
      toast.success("Story link copied to clipboard!");
    } catch (e: unknown) {
      toast.error("Failed to copy link", { description: e instanceof Error ? e.message : "Unknown error" });
    }
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
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Library
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">{book.title}</h1>
              <p className="text-white/70">{book.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-white/70 text-sm">
              Page {pageIdx + 1} of {book.pages.length}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={shareStory}
              className="text-white hover:bg-white/20"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Cover Flow */}
      <div 
        className="h-full flex items-center justify-center pt-20 pb-20"
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
                  className="absolute w-full max-w-lg h-4/5 transition-all duration-500 ease-out cursor-pointer"
                  style={{
                    transform: `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                    opacity,
                    zIndex: isActive ? 10 : 5 - Math.abs(distance),
                  }}
                  onClick={() => {
                    if (isPrev) prevPage();
                    if (isNext) nextPage();
                  }}
                >
                  <div className="w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden">
                    {page.imageUrl && (
                      <div className="h-1/2">
                        <img
                          src={page.imageUrl}
                          alt={`Page ${index + 1}`}
                          className="w-full h-full object-cover"
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
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-6">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={prevPage}
            disabled={pageIdx === 0}
            className="text-white hover:bg-white/20 disabled:opacity-50"
          >
            ← Previous
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="text-white/70 text-sm">
              {pageIdx + 1} / {book.pages.length}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={nextPage}
            disabled={pageIdx === book.pages.length - 1}
            className="text-white hover:bg-white/20 disabled:opacity-50"
          >
            Next →
          </Button>
        </div>
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