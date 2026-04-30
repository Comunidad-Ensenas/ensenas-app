import { db } from '@/db';
import { activityLog, profile } from '@/db/schema';
import { eq } from 'drizzle-orm';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface UserData {
  id: number;
  firstName: string;
  lastName: string | null;
  streakDays: number;
  dailyGoalMinutes: number;
  xpEarnedToday: number;
  currentMinutesToday: number;
  isLeftHanded: boolean;
  learningMotivation: string | null;
  experienceLevel: string | null;
  avatarSkinTone: string | null;
  hapticFeedback: boolean;
  reminderTime: string | null;
  birthdate: string | null;
}

interface UserContextType {
  userData: UserData | null;
  isLoading: boolean;
  refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUserData = async () => {
    try {
      const userProfile = await db.select().from(profile).limit(1);
      
      if (userProfile.length > 0) {
        const user = userProfile[0];
        
        const today = new Date().toISOString().split('T')[0];
        const activity = await db
          .select()
          .from(activityLog)
          .where(eq(activityLog.profileId, user.id));

        const todayActivity = activity.find(a => a.activityDate === today);

        setUserData({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          streakDays: user.currentStreak || 0,
          dailyGoalMinutes: user.dailyGoalMinutes || 5,
          xpEarnedToday: todayActivity?.xpEarned || 0,
          currentMinutesToday: 0,
          isLeftHanded: user.isLeftHanded ?? false,
          learningMotivation: user.learningMotivation,
          experienceLevel: user.experienceLevel,
          avatarSkinTone: user.avatarSkinTone,
          hapticFeedback: user.hapticFeedback ?? true,
          reminderTime: user.reminderTime,
          birthdate: user.birthdate,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUserData();
  }, []);

  return (
    <UserContext.Provider value={{ userData, isLoading, refreshUserData }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserData() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserData debe usarse dentro de un UserProvider');
  }
  return context;
}