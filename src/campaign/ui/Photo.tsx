import Image from "next/image";
import type { CSSProperties } from "react";

type PhotoProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
  sizes?: string;
  className?: string;
  style?: CSSProperties;
};

/** A photograph in a thin frame, with an optional caption set like a field note. */
export function Photo({ src, alt, width, height, caption, sizes = "(min-width: 900px) 45vw, 92vw", className, style }: PhotoProps) {
  return (
    <figure className={`photo ${className ?? ""}`} style={style}>
      <div className="photo-frame">
        <Image src={src} alt={alt} width={width} height={height} sizes={sizes} />
      </div>
      {caption && <figcaption className="photo-caption">{caption}</figcaption>}
    </figure>
  );
}
