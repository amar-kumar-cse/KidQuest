import { Redirect } from 'expo-router';

export default function Index() {
  // Currently redirecting to login to showcase the UI mockup
  return <Redirect href="/(auth)/login" />;
}
