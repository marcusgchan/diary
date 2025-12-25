import { type CSSProperties } from "react";
import { cn } from "../../utils/cx";

export function Curve({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 31 71"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      xmlSpace="preserve"
      style={{
        fillRule: "evenodd",
        clipRule: "evenodd",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        strokeMiterlimit: "1.5",
      }}
    >
      <g transform="matrix(1,0,0,1,-134.74,-89.7073)">
        <g transform="matrix(0.5,0,0,0.5,-1.8305,5.42878)">
          <path
            d="M273.641,169.057C299.303,169.112 303.702,194.617 303.644,239.142C303.584,285.02 308.092,309.293 333.647,309.227"
            className={className}
            style={{
              fill: "none",
              stroke: "black",
              strokeWidth: "1px",
              ...style,
            }}
          />
        </g>
      </g>
    </svg>
  );
}
