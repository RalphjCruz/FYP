import type { PropsWithChildren } from 'react';

type ScreenContainerProps = PropsWithChildren<{
  className?: string;
  title?: string;
  subtitle?: string;
}>;

const joinClassNames = (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' ');

export const ScreenContainer = ({ children, className, title, subtitle }: ScreenContainerProps) => {
  return (
    <section className={joinClassNames('mx-auto w-full max-w-5xl', className)}>
      {(title || subtitle) && (
        <header className="mb-4">
          {title && <h1 className="gb-heading text-xl sm:text-2xl md:text-3xl">{title}</h1>}
          {subtitle && <p className="gb-body mt-2 text-base sm:text-lg">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
};
