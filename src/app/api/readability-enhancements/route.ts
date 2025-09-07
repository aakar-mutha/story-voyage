import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const BodySchema = z.object({
  bookId: z.string(),
  pageText: z.string(),
  readingLevel: z.enum(["early", "middle", "advanced"]),
  childAge: z.number().min(3).max(12),
  features: z.array(z.enum([
    "text_simplification",
    "sentence_analysis",
    "vocabulary_highlighting",
    "reading_pace_guide",
    "comprehension_aids",
    "visual_reading_support"
  ])).default(["text_simplification", "sentence_analysis"])
});

const MODEL_TEXT = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";

function extractJsonFromText(text: string): Record<string, unknown> | null {
  try {
    const patterns = [
      /\{[\s\S]*\}/,
      /```json\s*(\{[\s\S]*?\})\s*```/i,
      /```\s*(\{[\s\S]*?\})\s*```/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const jsonStr = match[1] || match[0];
        return JSON.parse(jsonStr);
      }
    }
    
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GOOGLE_GENAI_API_KEY" }, { status: 500 });
    }
    
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }
    
    const { bookId, pageText, readingLevel, childAge, features } = parsed.data;
    const ai = new GoogleGenAI({ apiKey });

    const readabilityContent: Record<string, unknown> = {};

    // Text simplification with multiple levels
    if (features.includes("text_simplification")) {
      const simplificationPrompt = `Simplify this children's story text for better readability at different levels.
      
      Original text: "${pageText}"
      Current reading level: ${readingLevel}
      Child age: ${childAge}
      
      Create simplified versions with:
      - Shorter sentences
      - Simpler vocabulary
      - Clearer structure
      - Age-appropriate language
      
      IMPORTANT: Return ONLY valid JSON in this exact format:
      {
        "simplifiedVersions": {
          "verySimple": "Simplest version for struggling readers",
          "simple": "Simplified version for average readers",
          "enhanced": "Enhanced version with better flow",
          "original": "${pageText}"
        },
        "readabilityScores": {
          "fleschKincaid": 3.2,
          "gradeLevel": "3rd grade",
          "difficulty": "easy"
        },
        "improvements": [
          "Shortened sentences",
          "Simplified vocabulary",
          "Added transitions"
        ]
      }`;

      const simplificationResponse = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: simplificationPrompt,
      });

      const simplificationData = simplificationResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const simplificationJson = extractJsonFromText(simplificationData);
      
      if (simplificationJson) {
        readabilityContent.textSimplification = simplificationJson;
      } else {
        console.warn("Failed to parse text simplification JSON, using fallback");
        readabilityContent.textSimplification = {
          simplifiedVersions: {
            verySimple: "Simple version of the story for easy reading",
            simple: "A bit more detailed but still easy to read",
            enhanced: "Enhanced version with better flow and vocabulary",
            original: pageText
          },
          readabilityScores: {
            fleschKincaid: 3.2,
            gradeLevel: "3rd grade",
            difficulty: "easy"
          },
          improvements: [
            "Shortened sentences",
            "Simplified vocabulary",
            "Added transitions"
          ]
        };
      }
    }

    // Sentence analysis and structure
    if (features.includes("sentence_analysis")) {
      const analysisPrompt = `Analyze the sentence structure and readability of this children's story text.
      
      Text: "${pageText}"
      Reading level: ${readingLevel}
      Child age: ${childAge}
      
      Provide detailed analysis including:
      - Sentence length analysis
      - Complex word identification
      - Reading flow assessment
      - Structural improvements
      
      IMPORTANT: Return ONLY valid JSON in this exact format:
      {
        "sentenceAnalysis": {
          "totalSentences": 5,
          "averageLength": 12.4,
          "longestSentence": 18,
          "shortestSentence": 8,
          "complexSentences": 2
        },
        "wordAnalysis": {
          "totalWords": 62,
          "complexWords": ["adventure", "discovered"],
          "syllableCount": {
            "adventure": 3,
            "discovered": 3
          }
        },
        "flowAnalysis": {
          "smoothTransitions": 3,
          "awkwardPhrases": 1,
          "repetitiveWords": ["the", "and"]
        },
        "improvements": [
          "Break long sentences into shorter ones",
          "Replace complex words with simpler alternatives"
        ]
      }`;

      const analysisResponse = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: analysisPrompt,
      });

      const analysisData = analysisResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const analysisJson = extractJsonFromText(analysisData);
      
      if (analysisJson) {
        readabilityContent.sentenceAnalysis = analysisJson;
      } else {
        console.warn("Failed to parse sentence analysis JSON, using fallback");
        readabilityContent.sentenceAnalysis = {
          sentenceAnalysis: {
            totalSentences: 5,
            averageLength: 12.4,
            longestSentence: 18,
            shortestSentence: 8,
            complexSentences: 2
          },
          wordAnalysis: {
            totalWords: 62,
            complexWords: ["adventure", "discovered"],
            syllableCount: {
              "adventure": 3,
              "discovered": 3
            }
          },
          flowAnalysis: {
            smoothTransitions: 3,
            awkwardPhrases: 1,
            repetitiveWords: ["the", "and"]
          },
          improvements: [
            "Break long sentences into shorter ones",
            "Replace complex words with simpler alternatives"
          ]
        };
      }
    }

    // Vocabulary highlighting and support
    if (features.includes("vocabulary_highlighting")) {
      const vocabularyPrompt = `Identify and provide support for challenging vocabulary in this children's story text.
      
      Text: "${pageText}"
      Reading level: ${readingLevel}
      Child age: ${childAge}
      
      Identify words that might be challenging and provide:
      - Definitions
      - Visual cues
      - Context clues
      - Pronunciation guides
      
      IMPORTANT: Return ONLY valid JSON in this exact format:
      {
        "challengingWords": [
          {
            "word": "adventure",
            "definition": "An exciting journey or experience",
            "pronunciation": "ad-VEN-chur",
            "syllables": 3,
            "difficulty": "medium",
            "contextClue": "The word 'adventure' appears when talking about exploring new places",
            "visualCue": "Think of going on a treasure hunt or exploring a new place",
            "alternatives": ["journey", "exploration", "trip"]
          }
        ],
        "readingAids": {
          "highlightedWords": ["adventure", "discovered"],
          "glossary": {
            "adventure": "An exciting journey",
            "discovered": "Found something new"
          }
        }
      }`;

      const vocabularyResponse = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: vocabularyPrompt,
      });

      const vocabularyData = vocabularyResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const vocabularyJson = extractJsonFromText(vocabularyData);
      
      if (vocabularyJson) {
        readabilityContent.vocabularyHighlighting = vocabularyJson;
      } else {
        console.warn("Failed to parse vocabulary highlighting JSON, using fallback");
        readabilityContent.vocabularyHighlighting = {
          challengingWords: [
            {
              word: "adventure",
              definition: "An exciting journey or experience",
              pronunciation: "ad-VEN-chur",
              syllables: 3,
              difficulty: "medium",
              contextClue: "The word 'adventure' appears when talking about exploring new places",
              visualCue: "Think of going on a treasure hunt or exploring a new place",
              alternatives: ["journey", "exploration", "trip"]
            }
          ],
          readingAids: {
            highlightedWords: ["adventure", "discovered"],
            glossary: {
              "adventure": "An exciting journey",
              "discovered": "Found something new"
            }
          }
        };
      }
    }

    // Reading pace guide
    if (features.includes("reading_pace_guide")) {
      const pacePrompt = `Create a reading pace guide for this children's story text.
      
      Text: "${pageText}"
      Reading level: ${readingLevel}
      Child age: ${childAge}
      
      Provide guidance on:
      - Reading speed recommendations
      - Pause points
      - Emphasis areas
      - Breathing breaks
      
      IMPORTANT: Return ONLY valid JSON in this exact format:
      {
        "paceGuide": {
          "recommendedSpeed": "slow and steady",
          "wordsPerMinute": 120,
          "totalReadingTime": "2-3 minutes",
          "pausePoints": [
            {
              "location": "after first sentence",
              "reason": "Let the setting sink in",
              "duration": "2-3 seconds"
            }
          ],
          "emphasisAreas": [
            {
              "text": "key words or phrases",
              "reason": "Important for understanding",
              "technique": "speak slightly louder"
            }
          ]
        },
        "breathingBreaks": [
          "Take a deep breath before starting",
          "Pause at commas for natural rhythm"
        ],
        "readingTips": [
          "Read with expression",
          "Point to words as you read",
          "Ask questions about what you read"
        ]
      }`;

      const paceResponse = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: pacePrompt,
      });

      const paceData = paceResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const paceJson = extractJsonFromText(paceData);
      
      if (paceJson) {
        readabilityContent.readingPaceGuide = paceJson;
      } else {
        console.warn("Failed to parse reading pace guide JSON, using fallback");
        readabilityContent.readingPaceGuide = {
          paceGuide: {
            recommendedSpeed: "slow and steady",
            wordsPerMinute: 120,
            totalReadingTime: "2-3 minutes",
            pausePoints: [
              {
                location: "after first sentence",
                reason: "Let the setting sink in",
                duration: "2-3 seconds"
              }
            ],
            emphasisAreas: [
              {
                text: "key words or phrases",
                reason: "Important for understanding",
                technique: "speak slightly louder"
              }
            ]
          },
          breathingBreaks: [
            "Take a deep breath before starting",
            "Pause at commas for natural rhythm"
          ],
          readingTips: [
            "Read with expression",
            "Point to words as you read",
            "Ask questions about what you read"
          ]
        };
      }
    }

    // Comprehension aids
    if (features.includes("comprehension_aids")) {
      const comprehensionPrompt = `Create comprehension aids for this children's story text.
      
      Text: "${pageText}"
      Reading level: ${readingLevel}
      Child age: ${childAge}
      
      Provide aids to help with understanding:
      - Visual organizers
      - Question prompts
      - Summary guides
      - Connection makers
      
      IMPORTANT: Return ONLY valid JSON in this exact format:
      {
        "visualOrganizers": [
          {
            "type": "story map",
            "description": "Map out the main events",
            "elements": ["beginning", "middle", "end"]
          }
        ],
        "questionPrompts": [
          {
            "type": "before reading",
            "questions": ["What do you think this story is about?"]
          },
          {
            "type": "during reading",
            "questions": ["What is happening now?"]
          },
          {
            "type": "after reading",
            "questions": ["What was your favorite part?"]
          }
        ],
        "summaryGuide": {
          "mainCharacter": "Who is the main character?",
          "setting": "Where does the story take place?",
          "problem": "What problem does the character face?",
          "solution": "How is the problem solved?",
          "lesson": "What did we learn from this story?"
        },
        "connectionMakers": [
          "Have you ever been on an adventure like this?",
          "Does this remind you of any other stories?",
          "What would you do in this situation?"
        ]
      }`;

      const comprehensionResponse = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: comprehensionPrompt,
      });

      const comprehensionData = comprehensionResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const comprehensionJson = extractJsonFromText(comprehensionData);
      
      if (comprehensionJson) {
        readabilityContent.comprehensionAids = comprehensionJson;
      } else {
        console.warn("Failed to parse comprehension aids JSON, using fallback");
        readabilityContent.comprehensionAids = {
          visualOrganizers: [
            {
              type: "story map",
              description: "Map out the main events",
              elements: ["beginning", "middle", "end"]
            }
          ],
          questionPrompts: [
            {
              type: "before reading",
              questions: ["What do you think this story is about?"]
            },
            {
              type: "during reading",
              questions: ["What is happening now?"]
            },
            {
              type: "after reading",
              questions: ["What was your favorite part?"]
            }
          ],
          summaryGuide: {
            mainCharacter: "Who is the main character?",
            setting: "Where does the story take place?",
            problem: "What problem does the character face?",
            solution: "How is the problem solved?",
            lesson: "What did we learn from this story?"
          },
          connectionMakers: [
            "Have you ever been on an adventure like this?",
            "Does this remind you of any other stories?",
            "What would you do in this situation?"
          ]
        };
      }
    }

    // Visual reading support
    if (features.includes("visual_reading_support")) {
      const visualPrompt = `Create visual reading support for this children's story text.
      
      Text: "${pageText}"
      Reading level: ${readingLevel}
      Child age: ${childAge}
      
      Provide visual aids to support reading:
      - Text formatting suggestions
      - Color coding
      - Spacing recommendations
      - Font and size guidance
      
      IMPORTANT: Return ONLY valid JSON in this exact format:
      {
        "textFormatting": {
          "fontSize": "18px",
          "lineHeight": "1.6",
          "letterSpacing": "0.1em",
          "fontFamily": "Arial, sans-serif"
        },
        "colorCoding": {
          "nouns": "#FF6B6B",
          "verbs": "#4ECDC4",
          "adjectives": "#45B7D1",
          "important": "#FFA07A"
        },
        "spacing": {
          "paragraphSpacing": "1.5em",
          "wordSpacing": "0.2em",
          "sentenceSpacing": "1em"
        },
        "visualCues": [
          "Use bold for important words",
          "Italicize for emphasis",
          "Underline for new vocabulary"
        ],
        "accessibility": {
          "highContrast": true,
          "largeText": true,
          "clearSpacing": true
        }
      }`;

      const visualResponse = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: visualPrompt,
      });

      const visualData = visualResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const visualJson = extractJsonFromText(visualData);
      
      if (visualJson) {
        readabilityContent.visualReadingSupport = visualJson;
      } else {
        console.warn("Failed to parse visual reading support JSON, using fallback");
        readabilityContent.visualReadingSupport = {
          textFormatting: {
            fontSize: "18px",
            lineHeight: "1.6",
            letterSpacing: "0.1em",
            fontFamily: "Arial, sans-serif"
          },
          colorCoding: {
            nouns: "#FF6B6B",
            verbs: "#4ECDC4",
            adjectives: "#45B7D1",
            important: "#FFA07A"
          },
          spacing: {
            paragraphSpacing: "1.5em",
            wordSpacing: "0.2em",
            sentenceSpacing: "1em"
          },
          visualCues: [
            "Use bold for important words",
            "Italicize for emphasis",
            "Underline for new vocabulary"
          ],
          accessibility: {
            highContrast: true,
            largeText: true,
            clearSpacing: true
          }
        };
      }
    }

    return NextResponse.json({
      bookId,
      readabilityContent,
      featuresGenerated: features,
      timestamp: new Date().toISOString(),
      readabilityScore: calculateReadabilityScore(readabilityContent, childAge)
    });

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

function calculateReadabilityScore(content: Record<string, unknown>, childAge: number): number {
  let score = 0;
  
  // Base score
  score += 50;
  
  // Age-appropriate bonus
  if (childAge >= 3 && childAge <= 5) {
    score += content.textSimplification ? 20 : 0;
    score += content.visualReadingSupport ? 15 : 0;
  } else if (childAge >= 6 && childAge <= 8) {
    score += content.sentenceAnalysis ? 20 : 0;
    score += content.vocabularyHighlighting ? 15 : 0;
  } else if (childAge >= 9 && childAge <= 12) {
    score += content.comprehensionAids ? 20 : 0;
    score += content.readingPaceGuide ? 15 : 0;
  }
  
  // Feature diversity bonus
  const featureCount = Object.keys(content).length;
  score += featureCount * 5;
  
  return Math.min(score, 100);
}
