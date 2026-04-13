import type { PropsWithChildren } from 'react';

type SectionCardProps = PropsWithChildren<{
  className?: string;
  heading?: string;
  description?: string;
}>;

const joinClassNames = (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' ');

export const SectionCard = ({ children, className, heading, description }: SectionCardProps) => {
  return (
    <article className={joinClassNames('gb-section-card', className)}>
      {(heading || description) && (
        <header className="mb-3">
          {heading && <h2 className="gb-heading text-lg sm:text-xl md:text-2xl">{heading}</h2>}
          {description && <p className="gb-body mt-2 text-base sm:text-lg">{description}</p>}
        </header>
      )}
      {children}
    </article>
  );
};
