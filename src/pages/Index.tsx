import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { AuthForm } from "@/components/auth/AuthForm";
import { AppLayout } from "@/components/layout/AppLayout";
import { LandingPage } from "./LandingPage";
import { PendingApproval } from "@/components/school/PendingApproval";

const StudentDashboard = lazy(() =>
  import("./StudentDashboard").then((m) => ({ default: m.StudentDashboard }))
);
const TeacherDashboard = lazy(() => import("./TeacherDashboard"));
const MentorDashboard = lazy(() => import("./MentorDashboard"));
const SchoolAdminDashboard = lazy(() =>
  import("@/components/school/SchoolAdminDashboard").then((m) => ({
    default: m.SchoolAdminDashboard,
  }))
);

const DashboardFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
  </div>
);

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [membership, setMembership] = useState<{ status: string; school_id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user profile and role when signed in
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setUserProfile(null);
          setUserRole(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else {
        setUserProfile(profileData);
      }

      // Fetch role from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      const resolvedRole = roleError
        ? profileData?.role || 'student'
        : roleData?.role || 'student';
      setUserRole(resolvedRole);

      // School membership gate (teachers must enter via a school portal)
      if (resolvedRole === 'teacher' || resolvedRole === 'student') {
        const { data: memberData } = await supabase
          .from('school_members')
          .select('status, school_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setMembership(memberData ?? null);
      } else {
        setMembership(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = useCallback(() => {
    if (user?.id) {
      setLoading(true);
      fetchUserData(user.id);
    }
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (!user || !session) {
    if (!showAuth) {
      return <LandingPage onGetStarted={() => setShowAuth(true)} />;
    }
    return <AuthForm />;
  }

  // Create a profile object with role for AppLayout
  const profileWithRole = { ...userProfile, role: userRole };

  // Teachers may only work inside an approved school portal
  const teacherBlocked = userRole === 'teacher' && membership?.status !== 'approved';

  const renderDashboard = () => {
    if (teacherBlocked) {
      return (
        <PendingApproval
          role="teacher"
          hasMembership={!!membership}
          onRefresh={refreshUserData}
        />
      );
    }
    if (userRole === 'school_admin') return <SchoolAdminDashboard userProfile={userProfile} />;
    if (userRole === 'mentor') return <MentorDashboard />;
    if (userRole === 'teacher') return <TeacherDashboard />;
    return <StudentDashboard />;
  };

  return (
    <AppLayout user={user} userProfile={profileWithRole}>
      <Suspense fallback={<DashboardFallback />}>{renderDashboard()}</Suspense>
    </AppLayout>
  );
};

export default Index;
