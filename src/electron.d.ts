export {};

declare global {
  interface Window {
    pixelStudio: {
      saveImage(dataUrl: string, documentName: string): Promise<{ saved: boolean }>;
      onMenuAction(callback: (action: "new-canvas" | "save-image") => void): () => void;
    };
  }
}
