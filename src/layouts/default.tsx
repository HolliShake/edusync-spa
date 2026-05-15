import type { ReactNode } from 'react';

type DefaultLayoutProps = {
  children: ReactNode;
};

export default function DefaultLayout({ children }: DefaultLayoutProps) {
  return <div className="bg-background text-foreground">{children}</div>;
}
