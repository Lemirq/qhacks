import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: 'Busy metropolitan city street ambiance with car horns honking, engines rumbling, people chatting, footsteps on pavement, and distant sirens, dense urban downtown atmosphere',
        duration_seconds: 5.0,
        prompt_influence: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs Sound Generation error:', response.status, errorText);
      return NextResponse.json(
        { error: `ElevenLabs API returned ${response.status}: ${errorText}` },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error('Street sound API error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
      },
      { status: 500 }
    );
  }
}
