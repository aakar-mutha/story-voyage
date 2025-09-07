import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const BodySchema = z.object({
  bookId: z.string(),
  pageText: z.string(),
  imageUrl: z.string().optional(),
  readingLevel: z.enum(["early", "middle", "advanced"]),
  childAge: z.number().min(3).max(12),
  enhancements: z.array(z.enum([
    "animation_effects",
    "interactive_elements",
    "sound_effects",
    "visual_transitions",
    "storytelling_improvements",
    "engagement_features"
  ])).default(["animation_effects", "interactive_elements"])
});

const MODEL_TEXT = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";

function extractJsonFromText(text: string): Record<string, unknown> | null {
  try {
    // Try to find JSON in various formats
    const patterns = [
      /\{[\s\S]*\}/,  // Basic JSON object
      /```json\s*(\{[\s\S]*?\})\s*```/i,  // JSON in code block
      /```\s*(\{[\s\S]*?\})\s*```/i,  // JSON in generic code block
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const jsonStr = match[1] || match[0];
        return JSON.parse(jsonStr);
      }
    }
    
    // Try parsing the entire text as JSON
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
    
    const { bookId, pageText, imageUrl, readingLevel, childAge, enhancements } = parsed.data;
    const ai = new GoogleGenAI({ apiKey });

    const presentationContent: Record<string, unknown> = {};

    // Generate animation effects
    if (enhancements.includes("animation_effects")) {
      const animationPrompt = `Create engaging animation effects for this children's story page.
      
      Page text: "${pageText}"
      Reading level: ${readingLevel}
      Child age: ${childAge}
      
      Suggest:
      - CSS animations and transitions
      - Interactive hover effects
      - Page turn animations
      - Character movements
      - Environmental effects
      
      Return as JSON: {
        "animations": [
          {
            "element": "character",
            "type": "bounce",
            "duration": "2s",
            "trigger": "page_load",
            "description": "Character bounces in from the left"
          }
        ],
        "transitions": {
          "pageEnter": "slideInRight",
          "pageExit": "slideOutLeft",
          "imageLoad": "fadeIn",
          "textReveal": "typewriter"
        },
        "interactiveEffects": {
          "hover": "scale(1.05)",
          "click": "pulse",
          "focus": "glow"
        }
      }`;

      const animationResponse = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: animationPrompt,
      });

      const animationData = animationResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const animationJson = extractJsonFromText(animationData);
      
      if (animationJson) {
        presentationContent.animations = animationJson;
      } else {
        console.warn("Failed to parse animation JSON, using fallback");
        presentationContent.animations = {
          animations: [
            {
              element: "character",
              type: "bounce",
              duration: "2s",
              trigger: "page_load",
              description: "Character bounces in from the left"
            }
          ],
          transitions: {
            pageEnter: "slideInRight",
            pageExit: "slideOutLeft",
            imageLoad: "fadeIn",
            textReveal: "typewriter"
          },
          interactiveEffects: {
            hover: "scale(1.05)",
            click: "pulse",
            focus: "glow"
          }
        };
      }
    }

    // Generate interactive elements
    if (enhancements.includes("interactive_elements")) {
      const interactivePrompt = `Design interactive elements for this children's story page.
      
      Page text: "${pageText}"
      Reading level: ${readingLevel}
      Child age: ${childAge}
      
      Create:
      - Clickable story elements
      - Hidden surprises and easter eggs
      - Mini-games or activities
      - Educational interactions
      - Sound triggers
      
      Return as JSON: {
        "clickableElements": [
          {
            "element": "character",
            "action": "wave",
            "feedback": "Character waves back!",
            "sound": "wave_sound.mp3"
          }
        ],
        "hiddenSurprises": [
          {
            "trigger": "click_on_flower",
            "effect": "flowers_bloom",
            "message": "Beautiful flowers bloom!"
          }
        ],
        "miniGames": [
          {
            "name": "Find the hidden object",
            "description": "Click on the hidden treasure",
            "reward": "sparkle_effect"
          }
        ],
        "educationalInteractions": [
          {
            "element": "word",
            "action": "click_to_define",
            "definition": "A friendly greeting"
          }
        ]
      }`;

      const interactiveResponse = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: interactivePrompt,
      });

      const interactiveData = interactiveResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const interactiveJson = extractJsonFromText(interactiveData);
      
      if (interactiveJson) {
        presentationContent.interactiveElements = interactiveJson;
      } else {
        console.warn("Failed to parse interactive elements JSON, using fallback");
        presentationContent.interactiveElements = {
          clickableElements: [
            {
              element: "character",
              action: "wave",
              feedback: "Character waves back!",
              sound: "wave_sound.mp3"
            }
          ],
          hiddenSurprises: [
            {
              trigger: "click_on_flower",
              effect: "flowers_bloom",
              message: "Beautiful flowers bloom!"
            }
          ],
          miniGames: [
            {
              name: "Find the hidden object",
              description: "Click on the hidden treasure",
              reward: "sparkle_effect"
            }
          ],
          educationalInteractions: [
            {
              element: "word",
              action: "click_to_define",
              definition: "A friendly greeting"
            }
          ]
        };
      }
    }

    // Generate sound effects
    if (enhancements.includes("sound_effects")) {
      const soundPrompt = `Create sound effects and audio cues for this children's story page.
      
      Page text: "${pageText}"
      Reading level: ${readingLevel}
      Child age: ${childAge}
      
      Include:
      - Ambient sounds
      - Character sounds
      - Action sounds
      - Musical cues
      - Reading pace indicators
      
      Return as JSON: {
        "ambientSounds": [
          {
            "sound": "forest_birds",
            "volume": "0.3",
            "loop": true,
            "description": "Gentle bird chirping"
          }
        ],
        "characterSounds": [
          {
            "character": "main_character",
            "sound": "happy_laugh",
            "trigger": "page_load",
            "description": "Character's cheerful laugh"
          }
        ],
        "actionSounds": [
          {
            "action": "page_turn",
            "sound": "page_flip",
            "volume": "0.5",
            "description": "Satisfying page turn sound"
          }
        ],
        "musicalCues": [
          {
            "moment": "story_beginning",
            "music": "adventure_theme",
            "mood": "exciting",
            "description": "Upbeat adventure music"
          }
        ]
      }`;

      const soundResponse = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: soundPrompt,
      });

      const soundData = soundResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const soundJson = extractJsonFromText(soundData);
      
      if (soundJson) {
        presentationContent.soundEffects = soundJson;
      } else {
        console.warn("Failed to parse sound effects JSON, using fallback");
        presentationContent.soundEffects = {
          ambientSounds: [
            {
              sound: "forest_birds",
              volume: "0.3",
              loop: true,
              description: "Gentle bird chirping"
            }
          ],
          characterSounds: [
            {
              character: "main_character",
              sound: "happy_laugh",
              trigger: "page_load",
              description: "Character's cheerful laugh"
            }
          ],
          actionSounds: [
            {
              action: "page_turn",
              sound: "page_flip",
              volume: "0.5",
              description: "Satisfying page turn sound"
            }
          ],
          musicalCues: [
            {
              moment: "story_beginning",
              music: "adventure_theme",
              mood: "exciting",
              description: "Upbeat adventure music"
            }
          ]
        };
      }
    }

    // Generate visual transitions
    if (enhancements.includes("visual_transitions")) {
      const transitionPrompt = `Design smooth visual transitions for this children's story page.
      
      Page text: "${pageText}"
      Reading level: ${readingLevel}
      Child age: ${childAge}
      
      Create:
      - Page transition effects
      - Image loading animations
      - Text reveal animations
      - Scene change effects
      - Focus transitions
      
      Return as JSON: {
        "pageTransitions": {
          "enter": {
            "type": "slide_in",
            "direction": "right",
            "duration": "0.5s",
            "easing": "ease-out"
          },
          "exit": {
            "type": "fade_out",
            "duration": "0.3s",
            "easing": "ease-in"
          }
        },
        "imageTransitions": {
          "load": "fade_in_scale",
          "hover": "slight_zoom",
          "click": "bounce"
        },
        "textTransitions": {
          "reveal": "typewriter",
          "highlight": "glow",
          "emphasis": "pulse"
        },
        "sceneChanges": {
          "fadeToBlack": "0.5s",
          "crossfade": "1s",
          "wipe": "0.8s"
        }
      }`;

      const transitionResponse = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: transitionPrompt,
      });

      const transitionData = transitionResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const transitionJson = extractJsonFromText(transitionData);
      
      if (transitionJson) {
        presentationContent.visualTransitions = transitionJson;
      } else {
        console.warn("Failed to parse visual transitions JSON, using fallback");
        presentationContent.visualTransitions = {
          pageTransitions: {
            enter: {
              type: "slide_in",
              direction: "right",
              duration: "0.5s",
              easing: "ease-out"
            },
            exit: {
              type: "fade_out",
              duration: "0.3s",
              easing: "ease-in"
            }
          },
          imageTransitions: {
            load: "fade_in_scale",
            hover: "slight_zoom",
            click: "bounce"
          },
          textTransitions: {
            reveal: "typewriter",
            highlight: "glow",
            emphasis: "pulse"
          },
          sceneChanges: {
            fadeToBlack: "0.5s",
            crossfade: "1s",
            wipe: "0.8s"
          }
        };
      }
    }

    // Generate storytelling improvements
    if (enhancements.includes("storytelling_improvements")) {
      const storytellingPrompt = `Enhance the storytelling experience for this children's story page.
      
      Page text: "${pageText}"
      Reading level: ${readingLevel}
      Child age: ${childAge}
      
      Suggest:
      - Narrative pacing improvements
      - Emotional engagement techniques
      - Character development moments
      - Plot advancement strategies
      - Reader engagement tactics
      
      Return as JSON: {
        "pacing": {
          "slowMoments": ["character_thoughts", "environmental_details"],
          "fastMoments": ["action_scenes", "dialogue"],
          "pausePoints": ["after_important_revelations", "before_cliffhangers"]
        },
        "emotionalEngagement": {
          "happyMoments": ["character_success", "beautiful_scenery"],
          "sadMoments": ["character_challenges", "loss"],
          "excitingMoments": ["adventure_begins", "discovery"]
        },
        "characterDevelopment": {
          "growthMoments": ["learning_something_new", "overcoming_fear"],
          "relationshipMoments": ["making_friends", "helping_others"],
          "personalityReveals": ["brave_actions", "kind_gestures"]
        },
        "readerEngagement": {
          "questions": ["What would you do?", "Can you guess what happens next?"],
          "predictions": ["What do you think will happen?", "How do you think this ends?"],
          "connections": ["Have you ever felt this way?", "Does this remind you of anything?"]
        }
      }`;

      const storytellingResponse = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: storytellingPrompt,
      });

      const storytellingData = storytellingResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const storytellingJson = extractJsonFromText(storytellingData);
      
      if (storytellingJson) {
        presentationContent.storytellingImprovements = storytellingJson;
      } else {
        console.warn("Failed to parse storytelling improvements JSON, using fallback");
        presentationContent.storytellingImprovements = {
          pacing: {
            slowMoments: ["character_thoughts", "environmental_details"],
            fastMoments: ["action_scenes", "dialogue"],
            pausePoints: ["after_important_revelations", "before_cliffhangers"]
          },
          emotionalEngagement: {
            happyMoments: ["character_success", "beautiful_scenery"],
            sadMoments: ["character_challenges", "loss"],
            excitingMoments: ["adventure_begins", "discovery"]
          },
          characterDevelopment: {
            growthMoments: ["learning_something_new", "overcoming_fear"],
            relationshipMoments: ["making_friends", "helping_others"],
            personalityReveals: ["brave_actions", "kind_gestures"]
          },
          readerEngagement: {
            questions: ["What would you do?", "Can you guess what happens next?"],
            predictions: ["What do you think will happen?", "How do you think this ends?"],
            connections: ["Have you ever felt this way?", "Does this remind you of anything?"]
          }
        };
      }
    }

    return NextResponse.json({
      bookId,
      presentationContent,
      enhancementsGenerated: enhancements,
      timestamp: new Date().toISOString(),
      engagementScore: calculateEngagementScore(presentationContent, childAge)
    });

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

function calculateEngagementScore(content: Record<string, unknown>, childAge: number): number {
  let score = 0;
  
  // Base score
  score += 50;
  
  // Age-appropriate bonus
  if (childAge >= 3 && childAge <= 5) {
    score += content.animations ? 20 : 0;
    score += content.interactiveElements ? 15 : 0;
  } else if (childAge >= 6 && childAge <= 8) {
    score += content.interactiveElements ? 25 : 0;
    score += content.soundEffects ? 15 : 0;
  } else if (childAge >= 9 && childAge <= 12) {
    score += content.storytellingImprovements ? 20 : 0;
    score += content.visualTransitions ? 15 : 0;
  }
  
  // Feature diversity bonus
  const featureCount = Object.keys(content).length;
  score += featureCount * 5;
  
  return Math.min(score, 100);
}
