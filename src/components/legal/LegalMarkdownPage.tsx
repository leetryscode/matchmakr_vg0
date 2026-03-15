import Link from 'next/link';
import { readFile } from 'fs/promises';
import path from 'path';
import ReactMarkdown from 'react-markdown';

interface LegalMarkdownPageProps {
  title: string;
  markdownFileName: string;
}

export default async function LegalMarkdownPage({ title, markdownFileName }: LegalMarkdownPageProps) {
  const markdownPath = path.join(process.cwd(), 'docs', markdownFileName);
  const markdown = await readFile(markdownPath, 'utf8');

  return (
    <main className="min-h-[100dvh] bg-transparent text-orbit-text px-4 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Link
          href="/"
          className="orbit-btn-ghost w-fit text-orbit-text2 underline font-light hover:text-orbit-text"
        >
          Home
        </Link>

        <section className="orbit-surface-soft orbit-ring rounded-card-lg border border-orbit-border/50 p-5 sm:p-8">
          <h1 className="text-3xl font-light tracking-tight text-orbit-text sm:text-4xl">{title}</h1>
          <article
            className="
              mt-6 space-y-4 text-base leading-7 text-orbit-text2
              [&_h1]:mt-8 [&_h1]:text-3xl [&_h1]:font-light [&_h1]:leading-tight [&_h1]:text-orbit-text
              [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-light [&_h2]:leading-tight [&_h2]:text-orbit-text
              [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-light [&_h3]:leading-tight [&_h3]:text-orbit-text
              [&_p]:m-0
              [&_ul]:list-disc [&_ul]:pl-6
              [&_ol]:list-decimal [&_ol]:pl-6
              [&_li]:mt-1
              [&_a]:text-orbit-gold [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-orbit-text
              [&_hr]:my-6 [&_hr]:border-orbit-border/40
              [&_strong]:font-medium [&_strong]:text-orbit-text
            "
          >
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </article>
        </section>
      </div>
    </main>
  );
}
