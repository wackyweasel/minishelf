
import { env, AutoTokenizer, AutoProcessor, CLIPTextModelWithProjection, CLIPVisionModelWithProjection, RawImage } from '@xenova/transformers';

// Skip local model checks since we're running in browser
env.allowLocalModels = false;
env.useBrowserCache = true;

// Singleton instances to avoid reloading
let tokenizer: any = null;
let textModel: any = null;
let processor: any = null;
let visionModel: any = null;

// Using CLIP ViT-L/14 for better accuracy (larger model, better results)
// Alternative options:
// - 'Xenova/clip-vit-base-patch32' - faster, lower accuracy (original)
// - 'Xenova/clip-vit-large-patch14' - best accuracy, slower
// - 'Xenova/clip-vit-base-patch16' - middle ground
const MODEL_ID = 'Xenova/clip-vit-large-patch14';

export async function generateImageEmbedding(imageUrl: string): Promise<number[]> {
  if (!processor) {
    processor = await AutoProcessor.from_pretrained(MODEL_ID);
  }
  if (!visionModel) {
    // Explicitly specify the model file name to avoid loading issues with quantized models
    // Sometimes the default load path for quantized models can be tricky in browser
    visionModel = await CLIPVisionModelWithProjection.from_pretrained(MODEL_ID, {
      quantized: true,
    });
  }

  // Load image
  const image = await RawImage.fromURL(imageUrl);
  
  // Preprocess image
  const image_inputs = await processor(image);
  
  // Run model
  const { image_embeds } = await visionModel(image_inputs);
  
  // Normalize embeddings
  // The output is a tensor, we need to access data
  // We can manually normalize if needed, but let's see what we get.
  // CLIP embeddings are usually normalized.
  
  return Array.from(image_embeds.data);
}

export async function generateTextEmbedding(text: string): Promise<number[]> {
  if (!tokenizer) {
    tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
  }
  if (!textModel) {
    textModel = await CLIPTextModelWithProjection.from_pretrained(MODEL_ID, {
      quantized: true,
    });
  }

  // Tokenize
  const text_inputs = tokenizer(text, { padding: true, truncation: true });
  
  // Run model
  const { text_embeds } = await textModel(text_inputs);
  
  return Array.from(text_embeds.data);
}

// Cosine similarity
export function cosineSimilarity(a: number[], b: number[]) {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  
  return dotProduct / (magnitudeA * magnitudeB);
}
