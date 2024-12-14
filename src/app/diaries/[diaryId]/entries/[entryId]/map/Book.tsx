export function Book({
  leftPageContent,
  rightPageContent,
}: {
  leftPageContent?: React.ReactNode;
  rightPageContent?: React.ReactNode;
}) {
  return (
    <Cover>
      <LeftPage>{leftPageContent}</LeftPage>
      <RightPage>{rightPageContent}</RightPage>
    </Cover>
  );
}

function LeftPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid rounded-bl-lg rounded-tl-lg bg-[#E9E6C9] pl-2">
      <div className="origin-right rounded-bl-lg rounded-tl-lg bg-[#f9f6d9] p-1 transition-all [perspective:800px] [transform-style:preserve-3d] hover:[rotate:y_10deg]">
        {children}
      </div>
    </div>
  );
}

function RightPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid rounded-br-lg rounded-tr-lg bg-[#E9E6C9] pr-2">
      <div className="rounded-br-lg rounded-tr-lg bg-[#f9f6d9] p-1">
        {children}
      </div>
    </div>
  );
}

function Cover({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid h-full min-h-[600px] grid-cols-2 rounded-lg bg-black px-3 py-2 after:absolute after:inset-0 after:bottom-2 after:left-1/2 after:top-2 after:w-[10px] after:-translate-x-1/2 after:bg-[#E9E6C9] after:opacity-50">
      {children}
    </div>
  );
}
