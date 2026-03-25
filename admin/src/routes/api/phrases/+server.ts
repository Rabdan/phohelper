import { json } from '@sveltejs/kit';
import { getPhrases } from '$lib/db.js';

export async function GET() {
  const phrases = await getPhrases();
  return json(phrases);
}
