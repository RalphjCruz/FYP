import type { PropsWithChildren } from 'react';

type GameBoyFrameProps = PropsWithChildren<{
  className?: string;
  screenClassName?: string;
}>;

const joinClassNames = (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' ');

export const GameBoyFrame = ({ children, className, screenClassName }: GameBoyFrameProps) => {
  return (
    <div className="gb-page-bg px-3 py-4 sm:px-5 md:px-8">
      <main className={joinClassNames('mx-auto flex w-full max-w-5xl items-center justify-center', className)}>
        <div className="gb-device-frame">
          <div className={joinClassNames('gb-screen-shell', screenClassName)}>{children}</div>
        </div>
      </main>
    </div>
  );
};
