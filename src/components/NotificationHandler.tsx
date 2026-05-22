import { useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';

export default function NotificationHandler() {
  const { user } = useAuth();

  useEffect(() => {
    // Supabase push notifications would require a separate integration (e.g., OneSignal or custom FCM on server)
    // Disabling Firebase FCM for now during migration
    console.log('NotificationHandler: Supabase migration in progress, FCM disabled');
  }, [user]);

  return null;
}
