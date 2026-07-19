import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../../lib/firebase';

export default function QrScanScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getCameraPermissions();
  }, []);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const token = data.trim();
      if (!token) throw new Error('Scanned token is empty.');

      await signInWithCustomToken(auth, token);
      router.replace('/(kid)/mission-board' as any);
    } catch (err: any) {
      Alert.alert(
        'Login Failed',
        err.message || 'Invalid QR code. Please ask your parent to generate a new linking code.',
        [{ text: 'Try Again', onPress: () => setScanned(false) }]
      );
    }
  };

  if (hasPermission === null) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center px-6">
        <Text className="text-slate-200 text-lg text-center font-bold">Requesting camera permission...</Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center px-6">
        <Text className="text-slate-200 text-lg text-center font-bold">
          No access to camera. Please enable camera in your settings.
        </Text>
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="bg-sky-400 py-3 px-6 rounded-xl mt-6"
        >
          <Text className="text-slate-900 font-bold text-base">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="flex-row items-center justify-between px-6 py-4 mt-8">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Text className="text-sky-400 text-lg font-bold">← Back</Text>
        </TouchableOpacity>
        <Text className="text-white text-xl font-black">Scan QR to Play</Text>
        <View className="w-16" />
      </View>

      <View className="flex-1 mx-6 rounded-3xl overflow-hidden border-4 border-sky-400 relative">
        <CameraView
          className="absolute inset-0"
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
        <View className="absolute inset-0 items-center justify-center bg-black/40">
          <View className="w-56 h-56 border-4 border-emerald-500 rounded-3xl bg-transparent" />
        </View>
      </View>

      <View className="p-8 items-center">
        <Text className="text-slate-400 text-center text-sm leading-5">
          Hold your device up to the parent's screen to scan the linking code.
        </Text>
      </View>
    </SafeAreaView>
  );
}
