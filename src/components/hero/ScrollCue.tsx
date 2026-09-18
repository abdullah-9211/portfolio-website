export function ScrollCue() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-2 text-dim sm:bottom-12">
      <span className="font-mono text-[10px] uppercase tracking-[0.3em]">
        Keep scrolling
      </span>
      <span className="scroll-cue-arrow h-3 w-3 rotate-45 border-b-2 border-r-2 border-dim" />
    </div>
  );
}
