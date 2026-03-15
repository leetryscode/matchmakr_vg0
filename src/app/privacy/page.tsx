import type { Metadata } from 'next';
import LegalMarkdownPage from '@/components/legal/LegalMarkdownPage';

export const metadata: Metadata = {
  title: 'Privacy Policy | Orbit Introductions',
  description: 'Orbit Introductions Privacy Policy.',
};

export default function PrivacyPage() {
  return (
    <LegalMarkdownPage
      title="Privacy Policy"
      markdownFileName="orbit-privacy-policy.md"
    />
  );
}
