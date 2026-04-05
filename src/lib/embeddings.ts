const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";

interface VoyageResponse {
  data: { embedding: number[] }[];
}

export async function getEmbeddings(
  texts: string[],
  inputType: "document" | "query" = "document"
): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not set");

  const batches: string[][] = [];
  for (let i = 0; i < texts.length; i += 128) {
    batches.push(texts.slice(i, i + 128));
  }

  const allEmbeddings: number[][] = [];

  for (const batch of batches) {
    const res = await fetch(VOYAGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "voyage-3",
        input: batch,
        input_type: inputType,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Voyage API error: ${err}`);
    }

    const data: VoyageResponse = await res.json();
    allEmbeddings.push(...data.data.map((d) => d.embedding));
  }

  return allEmbeddings;
}

export async function getEmbedding(
  text: string,
  inputType: "document" | "query" = "document"
): Promise<number[]> {
  const [embedding] = await getEmbeddings([text], inputType);
  return embedding;
}
