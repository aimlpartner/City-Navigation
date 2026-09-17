import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { originName, destName, originLat, originLng, destLat, destLng } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Gemini API key is not configured.",
          guide: null,
          groundingChunks: []
        },
        { status: 200 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });

    const userLat = typeof originLat === "number" ? originLat : 28.4595;
    const userLng = typeof originLng === "number" ? originLng : 77.0266;

    const prompt = `You are an expert, reassuring local transit companion helping a newcomer and introvert travel in Delhi-NCR (Delhi and Gurgaon).
The traveler is starting from: "${originName || 'Current Location in Gurgaon'}"
And their exact destination is: "${destName || 'Ambience Mall, Gurugram'}".

Provide a precise, anxiety-free step-by-step route breakdown so they don't have to ask strangers for directions:
1. First-mile: How to reach the closest metro station from their origin (is it walkable or should they take an auto/cab, typical fare in ₹ INR, which entrance/gate to approach).
2. Metro Leg:
   - Exactly which Metro Line (e.g. Yellow Line or Rapid Metro Gurgaon) and color.
   - Which platform or train direction (e.g. 'Towards Samaypur Badli' or 'Towards Moulsari Avenue').
   - If a transfer is needed (e.g., at Sikanderpur between Yellow Line and Rapid Metro), give explicit walking instructions between platforms without exiting fare gates.
3. Deboarding & Metro Exit Gate:
   - Exactly which station to deboard at.
   - The specific Exit Gate number (e.g. Gate 1, 2, or 3) and what overhead sign to look up at.
4. Last-mile to Destination:
   - Distance from that metro station to "${destName}".
   - How to take a cab or auto from the station exit (where the auto/e-rickshaw stand or Uber pickup bay is located, expected fare range in ₹).
5. Introvert Pro-Tips:
   - How to get tickets digitally without talking to a ticket clerk (e.g. DMRC WhatsApp QR ticket or Paytm).
   - How to avoid crowded interchanges and feel confident.

Keep the advice direct, warm, concise, and structured with clear headings and bullet points.`;

    // As mandated: Use gemini-3.5-flash with googleMaps tool
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: userLat,
              longitude: userLng
            }
          }
        }
      }
    });

    const guideMarkdown = response.text || "";
    
    // Extract grounding chunks as mandated by Google Maps grounding instructions
    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    interface GroundingLink {
      title: string;
      uri: string;
      source?: string;
    }

    const groundingLinks: GroundingLink[] = [];

    // Safely extract maps URLs and place citations
    for (const chunk of rawChunks as any[]) {
      if (chunk?.maps?.uri) {
        groundingLinks.push({
          title: chunk.maps.title || "View on Google Maps",
          uri: chunk.maps.uri,
          source: "Google Maps Place"
        });
      }
      if (chunk?.web?.uri) {
        groundingLinks.push({
          title: chunk.web.title || "Web Reference",
          uri: chunk.web.uri,
          source: "Web Link"
        });
      }
    }

    return NextResponse.json({
      success: true,
      guideMarkdown,
      groundingLinks
    });
  } catch (err: any) {
    console.error("Gemini Maps Grounding API error:", err);

    // Fallback attempt without googleMaps tool or return safe error details
    return NextResponse.json({
      success: false,
      error: err?.message || "Failed to generate AI transit guide",
      guideMarkdown: null,
      groundingLinks: []
    });
  }
}
