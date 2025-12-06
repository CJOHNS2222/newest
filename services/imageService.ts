export async function fetchRecipeImage(recipeTitle: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_CSE_API_KEY;
  const cseId = import.meta.env.VITE_GOOGLE_CSE_ID;
  if (!apiKey || !cseId) return null;
  const query = encodeURIComponent(recipeTitle);
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${query}&searchType=image&num=1`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.items?.[0]?.link || null;
  } catch {
    return null;
  }
}
