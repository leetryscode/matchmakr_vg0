import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardWrapper from '@/components/dashboard/DashboardWrapper';
import DraftProfileEditor from '@/components/dashboard/DraftProfileEditor';
import type { PairingsSignal } from '@/types/pairings';
import type { IntroductionSignal } from '@/types/introductionSignal';

interface PageProps {
  params: { inviteId: string };
}

async function DraftProfilePageContent({ params }: PageProps) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: invite } = await supabase
    .from('invites')
    .select(
      'id, invitee_label, invitee_email, created_at, draft_endorsement, draft_pairings_signal, draft_introduction_signal, draft_photos'
    )
    .eq('id', params.inviteId)
    .eq('inviter_id', user.id)
    .single();

  if (!invite) redirect('/dashboard/matchmakr');

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single();

  const firstName = profile?.name?.split(' ')[0] || '';

  return (
    <DashboardLayout firstName={firstName} userId={user.id} userType="MATCHMAKR">
      <DraftProfileEditor
        invite={{
          id: invite.id,
          invitee_label: invite.invitee_label ?? null,
          invitee_email: invite.invitee_email ?? '',
          draft_endorsement: invite.draft_endorsement ?? null,
          draft_pairings_signal: (invite.draft_pairings_signal as PairingsSignal) ?? null,
          draft_introduction_signal: (invite.draft_introduction_signal as IntroductionSignal) ?? null,
          draft_photos: invite.draft_photos ?? null,
        }}
        userId={user.id}
      />
    </DashboardLayout>
  );
}

export default function DraftProfilePage({ params }: PageProps) {
  return (
    <DashboardWrapper expectedUserType="MATCHMAKR">
      <DraftProfilePageContent params={params} />
    </DashboardWrapper>
  );
}
