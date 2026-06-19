import { Chrome, ChromeProps } from "./Chrome";
import { Toaster } from "./Toaster";

export function Shell({
  chrome,
  children,
}: {
  chrome?: ChromeProps;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {chrome && <Chrome {...chrome} />}
      <main className="pa-scroll flex-1 px-5 pb-16 pt-[26px]">
        <div className="mx-auto max-w-[1120px]">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}
