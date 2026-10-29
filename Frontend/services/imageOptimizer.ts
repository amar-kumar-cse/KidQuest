import * as ImageManipulator from 'expo-image-manipulator';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 to 1.0 (0.75 recommended)
}

export interface OptimizedImageResult {
  uri: string;
  width: number;
  height: number;
  format: string;
}

/**
 * Compresses and resizes an image before upload.
 * Default config:
 * - Max dimension: 1200px (preserves aspect ratio)
 * - Quality: 0.75 (reduces typical camera 5MB-10MB photo down to ~250KB - 400KB)
 * - Format: JPEG
 */
export async function optimizeImageForUpload(
  sourceUri: string,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  const {
    maxWidth = 1200,
    quality = 0.75,
  } = options;

  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      sourceUri,
      [{ resize: { width: maxWidth } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return {
      uri: manipResult.uri,
      width: manipResult.width,
      height: manipResult.height,
      format: 'image/jpeg',
    };
  } catch (err) {
    console.warn('[imageOptimizer] Optimization failed, falling back to source URI:', err);
    // Fallback: return original URI so upload isn't blocked if manipulator fails on specific OS/simulator
    return {
      uri: sourceUri,
      width: 0,
      height: 0,
      format: 'image/jpeg',
    };
  }
}

