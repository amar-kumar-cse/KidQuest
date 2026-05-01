import React from 'react';
import { ScrollView, View, Text, Linking, StyleSheet } from 'react-native';
import { Button } from '../components/ui/Button';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../hooks/useAuth';

export default function PrivacyPolicy() {
  const router = useRouter();
  const { user } = useAuth();

  const doDelete = async () => {
    Alert.alert('Delete account', 'Are you sure you want to delete your account? This is irreversible.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const functions = getFunctions();
            const fn = httpsCallable(functions, 'deleteAccount');
            const res = await fn({});
            if (res.data?.success) {
              Alert.alert('Account deleted', 'Your account deletion has been processed.');
              router.replace('/');
            } else {
              Alert.alert('Error', 'Account deletion failed.');
            }
          } catch (e) {
            console.warn('deleteAccount failed', e);
            Alert.alert('Error', 'Account deletion failed.');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Privacy Policy (Draft)</Text>
      <Text style={styles.paragraph}>
        KidQuest values your privacy. We store minimal personal information required for account functionality (name, email,
        family linkage). We do not sell personal data. For children, parental consent is required.
      </Text>

      <Text style={styles.subtitle}>Data Deletion</Text>
      <Text style={styles.paragraph}>
        You can request account deletion which will remove your profile, related tasks, notifications and associated storage
        files. Some backups may persist for a limited time for operational reasons. Use the button below to delete your account.
      </Text>

      <View style={{ marginTop: 20 }}>
        <Button onPress={doDelete} label="Delete Account" tone="danger" />
      </View>

      <Text style={[styles.paragraph, { marginTop: 30 }]}>For full policy and legal text, add your legal copy here and host externally if required.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  subtitle: { fontSize: 18, fontWeight: '600', marginTop: 12 },
  paragraph: { fontSize: 14, lineHeight: 20 },
});
