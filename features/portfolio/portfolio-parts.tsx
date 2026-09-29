export function TextBlocks({ text }: { text: string }) {
  return (
    <>
      {text?.split('\n\n').map((p, i) => (
        <p className="text-block" key={i}>
          {p}
        </p>
      ))}
    </>
  );
}
