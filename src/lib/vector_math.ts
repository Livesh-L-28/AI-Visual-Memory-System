/**
 * Vector similarity math & lightweight FAISS-like index implementation in TypeScript.
 */

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function normalizeVector(vec: number[]): number[] {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm === 0) return vec.map(() => 0);
  return vec.map((v) => v / norm);
}

/**
 * Generate a deterministic pseudo-512-dimensional vector embedding from text or feature tags
 * so semantic matching between textual queries ("laptop", "black phone", "chair") and 
 * visual feature vectors works consistently.
 */
export function generateTextEmbedding(text: string): number[] {
  const DIM = 512;
  const vec = new Array(DIM).fill(0);
  const normalizedText = text.toLowerCase().trim();

  // Keyword hash projection
  for (let i = 0; i < normalizedText.length; i++) {
    const charCode = normalizedText.charCodeAt(i);
    const idx1 = (charCode * 17 + i * 31) % DIM;
    const idx2 = (charCode * 37 + i * 13) % DIM;
    const idx3 = (charCode * 53 + i * 7) % DIM;
    vec[idx1] += Math.sin(charCode + i) * 0.5;
    vec[idx2] += Math.cos(charCode * 2 + i) * 0.5;
    vec[idx3] += Math.tan((charCode % 10) + 1) * 0.2;
  }

  // Pre-defined visual feature clusters for common object classes
  const classMappings: Record<string, number[]> = {
    laptop: [0, 10, 25, 40, 100],
    macbook: [0, 10, 25, 40, 100, 101],
    phone: [1, 11, 26, 41, 102],
    iphone: [1, 11, 26, 41, 102, 103],
    bottle: [2, 12, 27, 42, 104],
    flask: [2, 12, 27, 42, 104, 105],
    chair: [3, 13, 28, 43, 106],
    armchair: [3, 13, 28, 43, 106],
    headphones: [4, 14, 29, 44, 107],
    mug: [5, 15, 30, 45, 108],
    cup: [5, 15, 30, 45, 108],
    mouse: [6, 16, 31, 46, 109],
    keyboard: [7, 17, 32, 47, 110],
    backpack: [8, 18, 33, 48, 111],
    glasses: [9, 19, 34, 49, 112]
  };

  for (const [key, indices] of Object.entries(classMappings)) {
    if (normalizedText.includes(key)) {
      indices.forEach((idx) => {
        vec[idx % DIM] += 1.5;
      });
    }
  }

  return normalizeVector(vec);
}

export interface FaissEntry {
  faissIndexId: number;
  objectId: number;
  vector: number[];
  className: string;
  description: string;
}

export class FaissVectorIndex {
  private entries: FaissEntry[] = [];
  private nextFaissId = 1;

  public add(objectId: number, vector: number[], className: string, description: string): number {
    const existingIndex = this.entries.findIndex((e) => e.objectId === objectId);
    if (existingIndex >= 0) {
      this.entries[existingIndex].vector = normalizeVector(vector);
      this.entries[existingIndex].className = className;
      this.entries[existingIndex].description = description;
      return this.entries[existingIndex].faissIndexId;
    }

    const faissId = this.nextFaissId++;
    this.entries.push({
      faissIndexId: faissId,
      objectId,
      vector: normalizeVector(vector),
      className,
      description
    });
    return faissId;
  }

  public search(queryVector: number[], k: number = 5): { faissEntry: FaissEntry; score: number }[] {
    const normQuery = normalizeVector(queryVector);
    const scored = this.entries.map((entry) => {
      const score = cosineSimilarity(normQuery, entry.vector);
      return { faissEntry: entry, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  }

  public getCount(): number {
    return this.entries.length;
  }

  public clear(): void {
    this.entries = [];
    this.nextFaissId = 1;
  }
}
