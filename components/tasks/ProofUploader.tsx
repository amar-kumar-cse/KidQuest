import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { storageService } from '../../services/storageService';

interface ProofUploaderProps {
  taskId: string;
  onProofReady: (proofUrl: string, note?: string) => void;
}

export function ProofUploader({ taskId, onProofReady }: ProofUploaderProps) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow photo access in Settings to upload proof.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access in Settings.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!imageUri) {
      Alert.alert('No Photo', 'Please take or select a photo as proof first.');
      return;
    }

    setUploading(true);
    try {
      const url = await storageService.uploadProofPhoto(
        imageUri,
        taskId,
        ({ percentage }) => setUploadProgress(percentage),
      );
      onProofReady(url, note.trim() || undefined);
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message ?? 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View>
      {/* Image preview or picker */}
      {imageUri ? (
        <View className="mb-4 rounded-2xl overflow-hidden">
          <Image
            source={{ uri: imageUri }}
            className="w-full h-48"
            resizeMode="cover"
          />
          <TouchableOpacity
            onPress={() => setImageUri(null)}
            className="absolute top-2 right-2 bg-black/50 rounded-full w-8 h-8 items-center justify-center"
          >
            <Text className="text-white font-bold">✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-row space-x-3 mb-4">
          <TouchableOpacity
            onPress={takePhoto}
            className="flex-1 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-2xl py-6 items-center"
          >
            <Text className="text-3xl mb-1">📷</Text>
            <Text className="text-indigo-600 font-semibold text-sm">Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={pickImage}
            className="flex-1 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl py-6 items-center"
          >
            <Text className="text-3xl mb-1">🖼️</Text>
            <Text className="text-slate-500 font-semibold text-sm">Choose Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Optional note */}
      <TextInput
        placeholder="Add a note (optional)..."
        value={note}
        onChangeText={setNote}
        multiline
        numberOfLines={3}
        className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 mb-4"
        placeholderTextColor="#9CA3AF"
        textAlignVertical="top"
      />

      {/* Upload progress */}
      {uploading && (
        <View className="mb-4">
          <View className="flex-row justify-between mb-1">
            <Text className="text-xs text-slate-500">Uploading...</Text>
            <Text className="text-xs text-indigo-600 font-bold">{uploadProgress}%</Text>
          </View>
          <View className="bg-slate-100 rounded-full h-2">
            <View
              className="bg-indigo-500 rounded-full h-2"
              style={{ width: `${uploadProgress}%` }}
            />
          </View>
        </View>
      )}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={uploading || !imageUri}
        className={`bg-green-500 py-4 rounded-2xl items-center flex-row justify-center ${
          uploading || !imageUri ? 'opacity-50' : ''
        }`}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Text className="text-white font-black text-lg mr-2">🚀</Text>
            <Text className="text-white font-black text-lg">Submit for Review!</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
