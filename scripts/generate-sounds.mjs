// Sound effects generation script using ElevenLabs API
// Usage: node scripts/generate-sounds.mjs
// Requires: ELEVENLABS_API_KEY in .env

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'public', 'sounds', 'building');

// Load .env manually (no dotenv dependency needed)
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    process.env[key] = value;
  }
}

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error('Missing ELEVENLABS_API_KEY in .env');
  process.exit(1);
}

const SOUNDS = [
  {
    filename: 'brick_place.mp3',
    prompt: 'A fast smooth whoosh sound effect, like an object flying through the air and landing, short and snappy swoosh',
    duration: 0.8,
  },
  {
    filename: 'rotate_object.mp3',
    prompt: 'A quick spinning whoosh, like something rotating fast through the air with a smooth swooshing wind sound',
    duration: 0.7,
  },
  {
    filename: 'move_object.mp3',
    prompt: 'A smooth gliding whoosh, like an object sliding quickly through the air, soft wind swoosh',
    duration: 0.8,
  },
  {
    filename: 'place_object.mp3',
    prompt: 'A fast whoosh followed by a soft landing thud, like something flying in and dropping into place',
    duration: 1.0,
  },
  {
    filename: 'resize_object.mp3',
    prompt: 'A rubber stretching and elastic pulling sound, like a material being stretched out longer with tension, cartoon stretch effect',
    duration: 1.0,
  },
  {
    filename: 'add_floor.mp3',
    prompt: 'A satisfying plastic lego brick snapping and clicking into place, crisp snap click sound, short and punchy',
    duration: 0.6,
  },
  {
    filename: 'change_texture.mp3',
    prompt: 'A quick light whoosh, like a card being flipped or a page turning fast in the wind, short and clean swoosh',
    duration: 0.6,
  },
  {
    filename: 'window_edit.mp3',
    prompt: 'A light airy whoosh, like a curtain being pulled open quickly, soft fast swoosh',
    duration: 0.6,
  },
  {
    filename: 'window_add.mp3',
    prompt: 'A solid block clicking into place with a satisfying snap and a short bam, like a lego brick being pressed down firmly',
    duration: 0.7,
  },
  {
    filename: '../map/city_street.mp3',
    prompt: 'Busy metropolitan city street ambiance with car horns honking, engines rumbling, people chatting, footsteps on pavement, and distant sirens, dense urban downtown atmosphere',
    duration: 5.0,
  },
];

const API_URL = 'https://api.elevenlabs.io/v1/sound-generation';

async function generateSound(sound) {
  const outPath = path.join(OUTPUT_DIR, sound.filename);

  // Skip if already exists
  if (fs.existsSync(outPath)) {
    console.log(`[SKIP] ${sound.filename} already exists`);
    return;
  }

  console.log(`[GEN]  ${sound.filename} — "${sound.prompt}"`);

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': API_KEY,
    },
    body: JSON.stringify({
      text: sound.prompt,
      duration_seconds: sound.duration,
      prompt_influence: 0.5,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[ERR]  ${sound.filename}: ${res.status} — ${err}`);
    return;
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buffer);
  console.log(`[OK]   ${sound.filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  // Ensure output directories exist
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'public', 'sounds', 'map'), { recursive: true });

  console.log(`Generating ${SOUNDS.length} sound effects...\n`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  // Generate sequentially to respect rate limits
  for (const sound of SOUNDS) {
    await generateSound(sound);
    // Small delay between requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
