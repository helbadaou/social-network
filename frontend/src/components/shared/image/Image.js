export default function ImageElem({ src, alt, width, height, className }) {
  if (!src) return;
  const getUrl = () => {
    return "http://localhost:8000/" + src;
  };
  return (
    <img
      src={getUrl(src)}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
}
