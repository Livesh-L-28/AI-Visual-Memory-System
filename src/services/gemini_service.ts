import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { globalMemoryStore } from './memory_store';

export const CANDIDATE_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash'
];

async function generateContentWithFallback(ai: GoogleGenAI, requestPayload: any) {
  let lastError: any = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        ...requestPayload,
        model
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || String(err);
      console.warn(`[Gemini] Model ${model} unavailable (${msg.slice(0, 80)}). Trying fallback model...`);
      const isRetryable =
        msg.includes('404') ||
        msg.includes('503') ||
        msg.includes('429') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('not found') ||
        msg.includes('no longer available');
      if (!isRetryable) {
        throw err;
      }
    }
  }
  throw lastError;
}

let aiClient: GoogleGenAI | null = null;
let currentKey: string | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!aiClient || currentKey !== apiKey) {
    currentKey = apiKey || null;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is missing. AI Chat will fall back to smart local memory reasoning.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || 'DUMMY_KEY',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// Function Declarations for Gemini Function Calling
const searchMemoryTool: FunctionDeclaration = {
  name: 'search_memory',
  description: 'Search the AI Visual Memory Bank for objects using natural language or class names.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'The object or description to search for (e.g. "laptop", "phone", "bottle", "red mug")'
      }
    },
    required: ['query']
  }
};

const getObjectDetailTool: FunctionDeclaration = {
  name: 'get_object_detail',
  description: 'Retrieve detailed information, status, and last seen coordinates for a specific permanent object ID.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      objectId: {
        type: Type.NUMBER,
        description: 'The numeric permanent object ID'
      }
    },
    required: ['objectId']
  }
};

const getRoomStatsTool: FunctionDeclaration = {
  name: 'get_room_stats',
  description: 'Get current system statistics, count of visible and lost objects, and class distributions.',
  parameters: {
    type: Type.OBJECT,
    properties: {}
  }
};

const getDisappearedObjectsTool: FunctionDeclaration = {
  name: 'get_disappeared_objects',
  description: 'Get a list of all objects that are currently missing or lost (disappeared from view).',
  parameters: {
    type: Type.OBJECT,
    properties: {}
  }
};

export function resetGeminiClient(): void {
  aiClient = null;
  currentKey = null;
}

/**
 * Perform AI vision analysis on a captured camera or video frame
 */
export async function analyzeFrameWithGemini(base64Image: string): Promise<{
  detections: { className: string; bbox: { x1: number; y1: number; x2: number; y2: number }; confidence: number; visualFeatures: string }[];
  summary: string;
}> {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'DUMMY_KEY') {
      return {
        detections: [],
        summary: 'Gemini API key is not configured. Please click "Set API Key" to enable real-time vision detection.'
      };
    }

    const ai = getGeminiClient();
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    const response = await generateContentWithFallback(ai, {
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanBase64
          }
        },
        {
          text: `You are a high-precision computer vision object detector. Examine this camera frame carefully and identify real physical objects that are visible in the scene.
Recognized object classes: 'person', 'glasses', 'chair', 'table', 'desk', 'laptop', 'phone', 'bottle', 'mug', 'cup', 'keyboard', 'mouse', 'monitor', 'tv', 'couch', 'fan', 'shelf', 'lamp', 'backpack', 'plant', 'door', 'appliance', etc.

CRITICAL ACCURACY RULES:
1. Detect ONLY physical items that are genuinely present and clearly visible in this specific image.
2. If the camera is pointing at an empty wall, plain door, floor, ceiling, curtain, or blank space with NO distinct items, return an EMPTY detections array: [].
3. NEVER hallucinate, guess, or invent objects that are not in the frame.
4. Bounding box 'bbox' (x1, y1, x2, y2) must be normalized floats from 0.0 to 1.0 (x1=left, y1=top, x2=right, y2=bottom) tightly enclosing the object.
5. className must be clean lowercase words (e.g. "laptop", "bottle").
6. confidence must reflect genuine detection confidence between 0.75 and 0.99.`
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            detections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  className: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  visualFeatures: { type: Type.STRING },
                  bbox: {
                    type: Type.OBJECT,
                    properties: {
                      x1: { type: Type.NUMBER },
                      y1: { type: Type.NUMBER },
                      x2: { type: Type.NUMBER },
                      y2: { type: Type.NUMBER }
                    },
                    required: ['x1', 'y1', 'x2', 'y2']
                  }
                },
                required: ['className', 'confidence', 'visualFeatures', 'bbox']
              }
            }
          },
          required: ['summary', 'detections']
        }
      }
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);

    // Sanitize and normalize bounding box coordinates
    const rawDetections = parsed.detections || [];
    const sanitizedDetections = rawDetections
      .map((d: any) => {
        let bbox = d.bbox;
        let x1 = Number(bbox?.x1 ?? bbox?.left ?? bbox?.xmin ?? 0);
        let y1 = Number(bbox?.y1 ?? bbox?.top ?? bbox?.ymin ?? 0);
        let x2 = Number(bbox?.x2 ?? bbox?.right ?? bbox?.xmax ?? 0);
        let y2 = Number(bbox?.y2 ?? bbox?.bottom ?? bbox?.ymax ?? 0);

        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return null;

        // Convert 0-1000 scale if returned as integers
        if (x1 > 1 || y1 > 1 || x2 > 1 || y2 > 1) {
          x1 /= 1000; y1 /= 1000; x2 /= 1000; y2 /= 1000;
        }

        // Fix swapped coordinates
        if (x1 > x2) [x1, x2] = [x2, x1];
        if (y1 > y2) [y1, y2] = [y2, y1];

        // Ensure box is within [0.0, 1.0]
        x1 = Math.max(0.0, Math.min(0.95, x1));
        y1 = Math.max(0.0, Math.min(0.95, y1));
        x2 = Math.max(x1 + 0.04, Math.min(1.0, x2));
        y2 = Math.max(y1 + 0.04, Math.min(1.0, y2));

        return {
          className: String(d.className || 'object').toLowerCase().trim().replace(/[^a-z0-9_]/g, ''),
          confidence: Math.max(0.75, Math.min(0.99, Number(d.confidence) || 0.90)),
          visualFeatures: String(d.visualFeatures || `${d.className} in frame`),
          bbox: { x1, y1, x2, y2 }
        };
      })
      .filter(Boolean);

    return {
      detections: sanitizedDetections,
      summary: parsed.summary || (sanitizedDetections.length > 0 ? `Identified ${sanitizedDetections.length} objects.` : 'No objects detected in frame.')
    };
  } catch (err: any) {
    console.error('Gemini vision error:', err?.message || err);
    return {
      detections: [],
      summary: `Perception scan complete. ${err?.message ? `(${err.message})` : 'No objects detected.'}`
    };
  }
}

function cleanObject(obj: any) {
  if (!obj) return undefined;
  const { embeddingVector, ...rest } = obj;
  return rest;
}

/**
 * Process a natural language question about visual memory ("Where is my laptop?", "Find the chair", "What disappeared?")
 * Implements tool calling execution loop and intelligent offline spatial reasoning fallback.
 */
export async function chatWithVisualMemory(
  userQuery: string,
  history: { role: string; content: string }[] = []
): Promise<{ answer: string; searchResults?: any[]; referencedObject?: any }> {
  const normQuery = userQuery.toLowerCase().trim();

  // If Gemini API Key is available, invoke Gemini with function calling
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = getGeminiClient();
      const allObjects = globalMemoryStore.getAllObjects();
      const stats = globalMemoryStore.getStats();

      const systemInstruction = `You are the AI Visual Memory Navigation Assistant.
You track physical objects in real-time, maintain permanent IDs (#OBJ-X), monitor 2D room map coordinates (in meters), track zones (e.g. Workstation Desk, Lounge Seating), and monitor visibility status ('visible' vs 'lost').
When answering user questions like:
- "Where is my laptop?" -> Give the exact room coordinates, zone, status, and last seen time.
- "What disappeared?" / "Which objects are missing?" -> List all objects whose status is 'lost'.
- "How many chairs are in the room?" -> Count objects accurately.
- "What moved recently?" -> Check observation history and trajectories.
Always be concise, precise, direct, and helpful. Mention object IDs (e.g. #OBJ-7) and zones.`;

      // Perform initial search to attach context
      const searchRes = globalMemoryStore.searchMemory(userQuery);

      const response = await generateContentWithFallback(ai, {
        contents: [
          {
            text: `User Query: "${userQuery}"
Context Memory Store (Active Objects):
${JSON.stringify(
  allObjects.slice(0, 15).map((o) => ({
    id: o.id,
    className: o.className,
    status: o.status,
    zone: o.zone,
    x: o.lastLocationX,
    y: o.lastLocationY,
    lastSeen: o.lastSeen,
    description: o.description
  })),
  null,
  2
)}
System Stats: ${JSON.stringify(stats)}`
          }
        ],
        config: {
          systemInstruction,
          tools: [
            {
              functionDeclarations: [
                searchMemoryTool,
                getObjectDetailTool,
                getRoomStatsTool,
                getDisappearedObjectsTool
              ]
            }
          ]
        }
      });

      // Handle function calls if model requested any
      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          if (call.name === 'get_disappeared_objects') {
            const lost = allObjects.filter((o) => o.status === 'lost');
            return {
              answer: `I found ${lost.length} missing/lost objects:\n` +
                lost.map((o) => `• **${o.className}** (#OBJ-${o.id}) in ${o.zone || 'Room'} (last seen ${new Date(o.lastSeen).toLocaleTimeString()})`).join('\n'),
              searchResults: lost.map((o) => ({ object: cleanObject(o), similarityScore: 1.0, matchReason: 'Status: lost' })),
              referencedObject: cleanObject(lost[0])
            };
          } else if (call.name === 'search_memory') {
            const q = (call.args as any)?.query || userQuery;
            const res = globalMemoryStore.searchMemory(q);
            if (res.length > 0) {
              const top = res[0].object;
              return {
                answer: `I located your **${top.className}** (#OBJ-${top.id}). It is ${top.status === 'visible' ? 'currently visible' : 'marked lost'} in **${top.zone || 'Room'}** at coordinates (${top.lastLocationX}m, ${top.lastLocationY}m).`,
                searchResults: res.map((r) => ({ ...r, object: cleanObject(r.object) })),
                referencedObject: cleanObject(top)
              };
            }
          } else if (call.name === 'get_room_stats') {
            return {
              answer: `Current Visual Memory Stats:\n• Visible objects: **${stats.visibleObjects}**\n• Lost objects: **${stats.lostObjects}**\n• Total unique items: **${stats.totalObjects}**\n• System FPS: **${stats.fps}**`,
              searchResults: []
            };
          }
        }
      }

      const answer = response.text || `I searched the visual memory bank for "${userQuery}".`;
      return {
        answer,
        searchResults: searchRes.map((r) => ({ ...r, object: cleanObject(r.object) })),
        referencedObject: cleanObject(searchRes[0]?.object)
      };
    } catch (err: any) {
      console.warn('Gemini chat error, falling back to smart local reasoning:', err?.message || err);
    }
  }

  // ==================== SMART LOCAL REASONING FALLBACK ====================
  const allObjects = globalMemoryStore.getAllObjects();

  // 1. "What disappeared?" / "Which objects are missing?" / "Lost objects"
  if (normQuery.includes('disappear') || normQuery.includes('lost') || normQuery.includes('missing') || normQuery.includes('gone')) {
    const lostObjs = allObjects.filter((o) => o.status === 'lost');
    if (lostObjs.length === 0) {
      return {
        answer: 'All registered physical objects are currently visible and accounted for in the room!',
        searchResults: []
      };
    }

    const list = lostObjs
      .map(
        (o) =>
          `• **${o.className}** (#OBJ-${o.id}) - Last confirmed at (X: ${o.lastLocationX}m, Y: ${o.lastLocationY}m) in *${o.zone || 'Room'}* at ${new Date(o.lastSeen).toLocaleTimeString()}`
      )
      .join('\n');

    return {
      answer: `Currently, **${lostObjs.length} object(s)** are missing from view:\n\n${list}\n\nTheir last known coordinates have been preserved in the spatial memory bank.`,
      searchResults: lostObjs.map((o) => ({ object: cleanObject(o), similarityScore: 1.0, matchReason: 'Status is lost' })),
      referencedObject: cleanObject(lostObjs[0])
    };
  }

  // 2. Count queries: "How many [class] in the room?"
  const countMatch = normQuery.match(/how many\s+([a-z]+)/i);
  if (countMatch) {
    const rawClass = countMatch[1].replace(/s$/, ''); // un-pluralize
    const matches = allObjects.filter((o) => o.className.toLowerCase().includes(rawClass));
    if (matches.length > 0) {
      const visible = matches.filter((o) => o.status === 'visible').length;
      return {
        answer: `There are **${matches.length} ${rawClass}(s)** registered in memory (${visible} currently visible, ${matches.length - visible} lost).\n` +
          matches.map((m) => `• #OBJ-${m.id}: (${m.lastLocationX}m, ${m.lastLocationY}m) in ${m.zone || 'Room'} [${m.status}]`).join('\n'),
        searchResults: matches.map((m) => ({ object: cleanObject(m), similarityScore: 1.0, matchReason: `Count query match` }))
      };
    }
  }

  // 3. Zone queries: "What is in [zone]?"
  const zones = ['workstation', 'lounge', 'storage', 'media', 'table', 'desk'];
  for (const z of zones) {
    if (normQuery.includes(z)) {
      const inZone = allObjects.filter((o) => (o.zone || '').toLowerCase().includes(z));
      if (inZone.length > 0) {
        return {
          answer: `In the **${z.toUpperCase()}** area, I found ${inZone.length} object(s):\n\n` +
            inZone.map((o) => `• **${o.className}** (#OBJ-${o.id}) - ${o.status === 'visible' ? 'Visible' : 'Lost'} at (${o.lastLocationX}m, ${o.lastLocationY}m)`).join('\n'),
          searchResults: inZone.map((o) => ({ object: cleanObject(o), similarityScore: 0.95, matchReason: `Located in ${z}` })),
          referencedObject: cleanObject(inZone[0])
        };
      }
    }
  }

  // 4. General search for specific item: "Where is my laptop?"
  const searchRes = globalMemoryStore.searchMemory(userQuery);
  if (searchRes.length > 0) {
    const top = searchRes[0].object;
    const isVis = top.status === 'visible';
    const statusText = isVis
      ? `currently **visible** in the **${top.zone || 'Main Room'}**`
      : `marked **lost** (last seen ${new Date(top.lastSeen).toLocaleTimeString()} in **${top.zone || 'Main Room'}**)`;

    return {
      answer: `I located your **${top.className}** (#OBJ-${top.id}). It is ${statusText} at floor plan coordinates **(X: ${top.lastLocationX}m, Y: ${top.lastLocationY}m)** with ${Math.round(top.recentConfidence * 100)}% detection confidence.${top.description ? `\n\n*Note:* ${top.description}` : ''}`,
      searchResults: searchRes.map((r) => ({ ...r, object: cleanObject(r.object) })),
      referencedObject: cleanObject(top)
    };
  }

  return {
    answer: `I searched the visual memory bank for "${userQuery}", but could not find a matching object. You can scan the area with the live camera or manually register it in the Memory Bank tab!`,
    searchResults: []
  };
}
