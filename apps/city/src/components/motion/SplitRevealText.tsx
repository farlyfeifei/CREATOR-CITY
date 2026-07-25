type Props = {
  text: string;
  className?: string;
};

export function SplitRevealText({ text, className = "" }: Props) {
  return (
    <span className={`split-reveal ${className}`} data-split aria-label={text}>
      {Array.from(text).map((letter, index) => (
        <span className="split-reveal-letter" data-letter aria-hidden="true" key={`${letter}-${index}`}>
          {letter === " " ? "\u00a0" : letter}
        </span>
      ))}
    </span>
  );
}
