"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { BookOpen, Sparkles, ArrowRight, ArrowLeft, Wand2 } from "lucide-react";
import Link from "next/link";

const STORAGE_KEY = "nano_travel_books_v1";

type Book = {
  id: string;
  title: string;
  subtitle: string;
  city: string;
  dedication: string;
  readingLevel: string;
  narratorPersona: string;
  child: { name: string; age: number; interests: string[] };
  pages: Array<{ text: string; activity?: string; prompt?: string; imageUrl?: string }>;
  glossary: Record<string, string>;
  funFacts: string[];
};

export default function CreatePage() {
  const [city, setCity] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState<number>(8);
  const [interests, setInterests] = useState("");
  const [readingLevel, setReadingLevel] = useState("middle");
  const [narrator, setNarrator] = useState("A friendly world traveler who loves discovering hidden wonders");
  const [pages, setPages] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [generatedBook, setGeneratedBook] = useState<Book | null>(null);

  const steps = [
    { id: 1, title: "Basic Info", description: "Tell us about your child" },
    { id: 2, title: "Details", description: "Add interests and preferences" },
    { id: 3, title: "Style", description: "Customize the storyteller" },
    { id: 4, title: "Generate", description: "Create your magical story" }
  ];

  async function generate() {
    setError(null);
    setLoading(true);
    setCurrentStep(4);
    try {
      console.log("Starting story generation...");
      
      // First test Supabase connection
      const testRes = await fetch("/api/test-supabase");
      const testData = await testRes.json();
      console.log("Supabase test:", testData);
      
      if (!testData.success) {
        throw new Error(`Database connection failed: ${testData.error}`);
      }
      
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          childName: name,
          childAge: age,
          interests: interests.split(",").map(s => s.trim()).filter(Boolean),
          narratorPersona: narrator,
          readingLevel,
          pages,
        }),
      });
      
      console.log("Generate API response status:", res.status);
      const data = await res.json();
      console.log("Generate API response data:", data);
      
      if (!res.ok) throw new Error(data?.error || "Failed to generate");
      const book = data.book as Book;
      
      console.log("Generated book structure:", book);
      console.log("Book child object:", book.child);
      
      // Try to save to localStorage as backup
      try {
        const existingBooks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"books":[]}');
        const updatedBooks = [book, ...existingBooks.books].slice(0, 10); // Keep only 10 most recent
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ books: updatedBooks }));
      } catch (localError) {
        console.warn('Failed to save to localStorage:', localError);
      }
      
      // Ensure book has required structure
      const safeBook = {
        ...book,
        child: book.child || { name: name, age: age, interests: interests.split(",").map(s => s.trim()).filter(Boolean) },
        title: book.title || "Untitled Story",
        subtitle: book.subtitle || `A magical adventure in ${city}`
      };
      
      setGeneratedBook(safeBook);
      toast.success("Story created!", { description: safeBook.title });
    } catch (e: unknown) {
      console.error("Generation error:", e);
      setError(e instanceof Error ? e.message : "Something went wrong");
      toast.error("Failed to create story", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  }

  function nextStep() {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }

  function canProceed() {
    switch (currentStep) {
      case 1: return city && name;
      case 2: return true;
      case 3: return true;
      case 4: return true; // Allow proceeding on step 4
      default: return false;
    }
  }

  if (generatedBook) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="fade-in">
              <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Wand2 className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-5xl font-bold mb-6 gradient-text">
                Your Story is Ready!
              </h1>
              <p className="text-xl text-white/90 mb-8">
                &quot;{generatedBook.title}&quot; has been created for {generatedBook.child?.name || 'your child'}
              </p>
              <div className="flex items-center justify-center gap-4 mb-12">
                <Button asChild size="lg" className="kid-button">
                  <Link href="/">
                    <BookOpen className="w-5 h-5 mr-2" />
                    📚 View in Library
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href={`/read?id=${generatedBook.id}`}>
                    <ArrowRight className="w-5 h-5 mr-2" />
                    Read Now
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-white">
              <BookOpen className="w-8 h-8" />
              🚀 StoryVoyage
            </Link>
            <Button variant="ghost" asChild>
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Library
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold crayon-border ${
                    currentStep >= step.id 
                      ? index === 0 ? 'primary-red' : 
                        index === 1 ? 'primary-yellow' : 
                        index === 2 ? 'primary-green' : 'primary-purple'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step.id}
                  </div>
                  <div className="ml-3">
                    <div className={`text-sm font-medium ${
                      currentStep >= step.id ? 'coloring-book-text' : 'text-gray-600'
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-600">{step.description}</div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      currentStep > step.id ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <Progress value={(currentStep / steps.length) * 100} className="h-2" />
          </div>

          {/* Step Content */}
          <Card className="coloring-book-page card-hover">
            <CardHeader className="text-center pb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl primary-blue crayon-border flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold">Create Your Story</CardTitle>
              <CardDescription className="text-lg">Step {currentStep} of {steps.length}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-lg font-medium">Destination City</Label>
                    <Input 
                      id="city" 
                      value={city} 
                      onChange={e => setCity(e.target.value)} 
                      placeholder="Where will your story take place?" 
                      className="h-14 text-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-lg font-medium">Child&apos;s Name</Label>
                      <Input 
                        id="name" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="Ava" 
                        className="h-14 text-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age" className="text-lg font-medium">Age</Label>
                      <Input 
                        id="age" 
                        type="number" 
                        min={3} 
                        max={12} 
                        value={age} 
                        onChange={e => setAge(parseInt(e.target.value || "8", 10))} 
                        className="h-14 text-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="interests" className="text-lg font-medium">Interests & Hobbies</Label>
                    <Input 
                      id="interests" 
                      value={interests} 
                      onChange={e => setInterests(e.target.value)} 
                      placeholder="animals, trains, drawing, music..." 
                      className="h-14 text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-lg font-medium">Reading Level</Label>
                    <Select value={readingLevel} onValueChange={setReadingLevel}>
                      <SelectTrigger className="h-14 text-lg">
                        <SelectValue placeholder="Choose reading level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="early">Early Reader (3-5 years)</SelectItem>
                        <SelectItem value="middle">Middle Reader (6-8 years)</SelectItem>
                        <SelectItem value="advanced">Advanced Reader (9-12 years)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pages" className="text-lg font-medium">Number of Pages</Label>
                    <Input 
                      id="pages" 
                      type="number" 
                      min={3} 
                      max={5} 
                      value={pages} 
                      onChange={e => setPages(parseInt(e.target.value || "3", 10))} 
                      className="h-14 text-lg"
                    />
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="narrator" className="text-lg font-medium">Storyteller Persona</Label>
                    <Textarea 
                      id="narrator" 
                      value={narrator} 
                      onChange={e => setNarrator(e.target.value)} 
                      placeholder="Describe the voice and personality of your storyteller..."
                      className="min-h-[120px] text-lg"
                    />
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  {loading && (
                    <div className="space-y-6 text-center">
                      <div className="w-16 h-16 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <div>
                        <h3 className="text-2xl font-bold mb-2">Crafting Your Magical Story...</h3>
                        <p className="text-white/90">This may take a moment while we create something special</p>
                      </div>
                      <Progress value={75} className="h-3" />
                    </div>
                  )}
                  
                  {!loading && (
                    <div className="text-center space-y-6">
                      <h3 className="text-2xl font-bold">Ready to Create?</h3>
                      <div className="bg-muted/50 rounded-xl p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div><strong>City:</strong> {city}</div>
                          <div><strong>Child:</strong> {name} ({age})</div>
                          <div><strong>Level:</strong> {readingLevel}</div>
                          <div><strong>Pages:</strong> {pages}</div>
                        </div>
                        {interests && <div><strong>Interests:</strong> {interests}</div>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-6">
                <Button 
                  variant="outline" 
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                
                {currentStep < 4 ? (
                  <Button 
                    onClick={nextStep}
                    disabled={!canProceed()}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    onClick={generate}
                    disabled={loading || !canProceed()}
                    className="kid-button"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Creating...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4" />
                        Create Story
                      </div>
                    )}
                  </Button>
                )}
              </div>

              {error && (
                <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
