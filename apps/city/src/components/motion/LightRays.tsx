type Props = {
  className?: string;
  tone?: "gold" | "jade" | "ink";
};

export function LightRays({ className = "", tone = "gold" }: Props) {
  return (
    <div className={`light-rays light-rays-${tone} ${className}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
      <span />
    </div>
  );
}
