import * as ImageManipulator from 'expo-image-manipulator';
import { optimizeImageForUpload } from '../../services/imageOptimizer';

describe('imageOptimizer', () => {
  it('compresses and resizes image using default settings', async () => {
    const result = await optimizeImageForUpload('file:///photos/proof.jpg');

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      'file:///photos/proof.jpg',
      [{ resize: { width: 1200 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
    );

    expect(result.uri).toBe('file://mock-optimized-photo.jpg');
    expect(result.format).toBe('image/jpeg');
  });

  it('honors custom maxWidth and quality options', async () => {
    await optimizeImageForUpload('file:///photos/avatar.jpg', {
      maxWidth: 512,
      quality: 0.85,
    });

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      'file:///photos/avatar.jpg',
      [{ resize: { width: 512 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    );
  });

  it('falls back to source URI gracefully when manipulation throws', async () => {
    (ImageManipulator.manipulateAsync as jest.Mock).mockRejectedValueOnce(
      new Error('Memory allocation failure')
    );

    const result = await optimizeImageForUpload('file:///photos/original.jpg');

    expect(result.uri).toBe('file:///photos/original.jpg');
  });
});

