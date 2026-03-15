import type { Metadata } from 'next';
import LegalMarkdownPage from '@/components/legal/LegalMarkdownPage';

export const metadata: Metadata = {
  title: 'Terms of Service | Orbit Introductions',
  description: 'Orbit Introductions Terms of Service.',
};

export default function TermsPage() {
  return (
    <LegalMarkdownPage
      title="Terms of Service"
      markdownFileName="orbit-terms-of-service.md"
    />
  );
}
