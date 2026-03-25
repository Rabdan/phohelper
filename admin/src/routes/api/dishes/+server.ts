import { json } from "@sveltejs/kit";
import { getDishes, createDish, updateDish, deleteDish } from "$lib/db.js";

export async function GET({ url }) {
  const moderated = url.searchParams.get("moderated");
  const dishes = await getDishes(
    moderated === "true" ? true : moderated === "false" ? false : undefined,
  );
  return json(dishes);
}

export async function POST({ request }) {
  const data = await request.json();
  const dish = await createDish(data);
  return json(dish);
}

export async function PUT({ request, url }) {
  const id = Number(url.searchParams.get("id"));
  const data = await request.json();
  await updateDish(id, data);
  return json({ success: true });
}

export async function DELETE({ url }) {
  const id = Number(url.searchParams.get("id"));
  await deleteDish(id);
  return json({ success: true });
}
