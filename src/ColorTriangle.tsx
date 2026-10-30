import { useEffect, useRef } from "react";

type ColorTriangleProps = {
  color: string;
  hue: number;
  onColorChange: (color: string) => void;
  onHueChange: (hue: number) => void;
};

const triangleWidth = 240;
const triangleHeight = 176;

const hueRgb = (hue: number): [number, number, number] => {
  const sector = hue / 60;
  const chroma = 1;
  const secondary = 1 - Math.abs((sector % 2) - 1);
  const colors: [number, number, number][] = [
    [chroma, secondary, 0],
    [secondary, chroma, 0],
    [0, chroma, secondary],
    [0, secondary, chroma],
    [secondary, 0, chroma],
    [chroma, 0, secondary],
  ];
  return colors[Math.min(5, Math.floor(sector))].map((channel) => channel * 255) as [number, number, number];
};

const rgbToHsv = (hex: string): { hue: number; saturation: number; value: number } => {
  const red = parseInt(hex.slice(1, 3), 16) / 255;
  const green = parseInt(hex.slice(3, 5), 16) / 255;
  const blue = parseInt(hex.slice(5, 7), 16) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  let hue = 0;

  if (delta !== 0) {
    if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }

  return {
    hue: (hue + 360) % 360,
    saturation: maximum === 0 ? 0 : delta / maximum,
    value: maximum,
  };
};

const hsvToHex = (hue: number, saturation: number, value: number): string => {
  const [red, green, blue] = hueRgb(hue).map((channel) => channel * saturation * value + 255 * (1 - saturation) * value);
  return `#${[red, green, blue].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
};

function ColorTriangle({ color, hue, onColorChange, onHueChange }: ColorTriangleProps) {
  const triangleRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    onHueChange(rgbToHsv(color).hue);
  }, [color, onHueChange]);

  useEffect(() => {
    const canvas = triangleRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const pixels = context.createImageData(triangleWidth, triangleHeight);
    const [red, green, blue] = hueRgb(hue);
    for (let y = 0; y < triangleHeight; y += 1) {
      const vertical = y / (triangleHeight - 1);
      const left = (triangleWidth / 2) * (1 - vertical);
      const right = triangleWidth - left;
      for (let x = Math.ceil(left); x <= right; x += 1) {
        const horizontal = (x - left) / Math.max(1, right - left);
        const hueWeight = 1 - vertical;
        const whiteWeight = vertical * (1 - horizontal);
        const index = (y * triangleWidth + x) * 4;
        pixels.data[index] = red * hueWeight + 255 * whiteWeight;
        pixels.data[index + 1] = green * hueWeight + 255 * whiteWeight;
        pixels.data[index + 2] = blue * hueWeight + 255 * whiteWeight;
        pixels.data[index + 3] = 255;
      }
    }

    context.putImageData(pixels, 0, 0);
  }, [hue]);

  const pickColor = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(triangleWidth, ((event.clientX - bounds.left) / bounds.width) * triangleWidth));
    const y = Math.max(0, Math.min(triangleHeight - 1, ((event.clientY - bounds.top) / bounds.height) * triangleHeight));
    const vertical = y / (triangleHeight - 1);
    const left = (triangleWidth / 2) * (1 - vertical);
    const right = triangleWidth - left;
    const horizontal = Math.max(0, Math.min(1, (x - left) / Math.max(1, right - left)));
    const saturation = (1 - vertical) / Math.max(0.0001, 1 - vertical * horizontal);
    const value = 1 - vertical * horizontal;
    onColorChange(hsvToHex(hue, saturation, value));
  };

  const current = rgbToHsv(color);
  const markerVertical = 1 - current.saturation * current.value;
  const markerHorizontal = (1 - current.value) / Math.max(0.0001, markerVertical);
  const markerY = markerVertical * triangleHeight;
  const markerX = triangleWidth * ((1 - markerVertical) / 2 + markerHorizontal * markerVertical);

  return (
    <div className="color-triangle-picker">
      <div className="color-triangle-wrap">
        <canvas
          ref={triangleRef}
          className="color-triangle"
          width={triangleWidth}
          height={triangleHeight}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            pickColor(event);
          }}
          onPointerMove={(event) => {
            if (event.buttons === 1) pickColor(event);
          }}
          aria-label="Triângulo de seleção de cores"
        />
        <span className="color-triangle-marker" style={{ left: `${(markerX / triangleWidth) * 100}%`, top: `${(markerY / triangleHeight) * 100}%` }} />
      </div>
      <label className="hue-control">
        <span>MATIZ</span>
        <input
          type="range"
          min="0"
          max="359"
          value={hue}
          onChange={(event) => {
            const nextHue = Number(event.target.value);
            onHueChange(nextHue);
            onColorChange(hsvToHex(nextHue, current.saturation, current.value));
          }}
          aria-label="Matiz"
        />
      </label>
    </div>
  );
}

export default ColorTriangle;
