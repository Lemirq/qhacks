import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface PlacedBuilding {
  id: string;
  lat: number;
  lng: number;
  scale: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
}

interface EnvironmentalReport {
  summary: string;
  buildings: BuildingImpact[];
  overallImpact: OverallImpact;
  recommendations: string[];
}

interface BuildingImpact {
  id: string;
  coordinates: { lat: number; lng: number };
  locationDescription: string;
  environmentalImpact: {
    carbonFootprint: string;
    habitatDisruption: string;
    waterImpact: string;
    airQuality: string;
  };
  societalImpact: {
    trafficIncrease: string;
    noiseLevel: string;
    communityEffect: string;
    economicImpact: string;
  };
  riskLevel: 'low' | 'medium' | 'high';
  mitigationMeasures: string[];
}

interface OverallImpact {
  environmentalScore: number; // 1-100
  societalScore: number; // 1-100
  sustainabilityRating: string;
  totalCarbonTonnes: number;
  treesRequired: number;
}

export async function POST(request: NextRequest) {
  try {
    const { buildings } = await request.json() as { buildings: PlacedBuilding[] };

    if (!buildings || buildings.length === 0) {
      return NextResponse.json({ error: 'No buildings provided for analysis' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Create building details for the prompt
    const buildingDetails = buildings.map((b, i) => `
Building ${i + 1}:
- ID: ${b.id}
- GPS Coordinates: ${b.lat.toFixed(6)}°N, ${b.lng.toFixed(6)}°W
- Scale (approx size multiplier): ${b.scale.x.toFixed(1)}x
- Approximate footprint: ${(b.scale.x * b.scale.z * 100).toFixed(0)} sq meters
`).join('\n');

    const prompt = `You are an environmental and urban planning expert analyzing proposed building developments in Kingston, Ontario, Canada (near Queen's University campus area at coordinates 44.2253°N, 76.4951°W).

PROPOSED BUILDINGS FOR ANALYSIS:
${buildingDetails}

LOCATION CONTEXT:
- Area: Kingston, Ontario, Canada - Historic university town on Lake Ontario
- Nearby landmarks: Queen's University campus, Lake Ontario waterfront
- Climate: Humid continental (Dfb), cold winters, warm summers
- Ecological zone: Great Lakes-St. Lawrence mixed forest region
- Notable wildlife: Migratory birds, urban wildlife corridors

Analyze each building location and provide a comprehensive environmental and societal impact assessment.

You MUST respond with valid JSON in this exact format:
{
  "summary": "2-3 sentence overview of the overall development impact",
  "buildings": [
    {
      "id": "building-id",
      "coordinates": { "lat": 44.225, "lng": -76.495 },
      "locationDescription": "Brief description of the specific location and what currently exists there",
      "environmentalImpact": {
        "carbonFootprint": "Estimated construction and operational carbon impact",
        "habitatDisruption": "Impact on local flora, fauna, and ecosystems",
        "waterImpact": "Effects on drainage, groundwater, Lake Ontario",
        "airQuality": "Construction and long-term air quality effects"
      },
      "societalImpact": {
        "trafficIncrease": "Expected traffic and congestion changes",
        "noiseLevel": "Noise pollution during and after construction",
        "communityEffect": "Impact on nearby residents, students, businesses",
        "economicImpact": "Jobs, property values, local economy effects"
      },
      "riskLevel": "low|medium|high",
      "mitigationMeasures": ["Specific actionable mitigation measure 1", "Measure 2"]
    }
  ],
  "overallImpact": {
    "environmentalScore": 75,
    "societalScore": 68,
    "sustainabilityRating": "B+ (Good with room for improvement)",
    "totalCarbonTonnes": 2500,
    "treesRequired": 150
  },
  "recommendations": [
    "Strategic recommendation 1",
    "Recommendation 2",
    "Recommendation 3"
  ]
}

SCORING GUIDELINES:
- environmentalScore: 100 = no impact, 0 = devastating impact
- societalScore: 100 = highly beneficial, 0 = highly detrimental
- totalCarbonTonnes: Estimate based on building size (typical: 500-1000 tonnes per 1000 sq m)
- treesRequired: Trees needed to offset carbon (avg tree absorbs ~20kg CO2/year, calculate for 10 year offset)

Be specific about the Kingston, Ontario context. Reference real features of the area when relevant (Lake Ontario, Queen's University, downtown Kingston, local parks, transit routes).

Respond ONLY with the JSON object, no additional text.`;

    let result;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (fetchError) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw fetchError;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    if (!result) {
      throw new Error('Failed to get response after retries');
    }

    const response = result.response;
    const text = response.text();

    let report: EnvironmentalReport;
    try {
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      report = JSON.parse(cleanedText);
    } catch {
      console.error('Failed to parse Gemini response:', text);
      return NextResponse.json({
        error: 'Failed to parse AI response',
        rawResponse: text
      }, { status: 500 });
    }

    return NextResponse.json({
      report,
      generatedAt: new Date().toISOString(),
      buildingCount: buildings.length,
    });

  } catch (error) {
    console.error('Environmental report error:', error);
    return NextResponse.json({
      error: 'Failed to generate environmental report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
