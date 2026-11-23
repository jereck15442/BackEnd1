import { env } from '../config/env.js';
import { productRepository } from '../repositories/product.repository.js';
import { checkCompatibility } from './compatibility.service.js';
import { serviceUnavailable } from '../utils/errors.js';

const UNAVAILABLE = 'AI advisor is temporarily unavailable. Please use the product catalog or custom PC builder.';

export async function recommend({ budget, usage }) {
  if (!env.GEMINI_API_KEY) throw serviceUnavailable(UNAVAILABLE);

  const candidates = await productRepository.findCandidates({ budget });
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

  const prompt = `Recommend one compatible PC build for PHP ${budget} for ${usage}.
Return only JSON with: {"components":{"CPU":"product id",...},"explanation":"text"}.
Use only these candidate products: ${JSON.stringify(candidates.map((p) => ({
    id: p._id, name: p.name, category: p.category, price: p.price, stock: p.stock, specifications: p.specifications
  })))}`;

  try {
    const result = await ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: prompt
    });
    const raw = result.text || '';
    const jsonText = raw.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(jsonText);
    const candidateIds = new Set(candidates.map((p) => p._id.toString()));

    for (const id of Object.values(parsed.components || {})) {
      if (!candidateIds.has(String(id))) throw new Error('AI returned a product outside the database candidates');
    }

    const selected = Object.create(null);
    for (const [category, id] of Object.entries(parsed.components || {})) {
      const product = candidates.find((p) => p._id.toString() === String(id));
      if (product) selected[category] = product;
    }

    return {
      components: selected,
      estimatedPrice: Object.values(selected).reduce((sum, product) => sum + product.price, 0),
      compatibility: checkCompatibility(selected),
      explanation: typeof parsed.explanation === 'string' ? parsed.explanation : 'AI recommendation'
    };
  } catch {
    throw serviceUnavailable(UNAVAILABLE);
  }
}
