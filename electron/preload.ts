import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("pixelStudio", {
  saveImage: (dataUrl: string, documentName: string): Promise<{ saved: boolean }> =>
    ipcRenderer.invoke("image:save-png", dataUrl, documentName),
  onMenuAction: (callback: (action: "new-canvas" | "save-image") => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, action: unknown) => {
      if (action === "new-canvas" || action === "save-image") callback(action);
    };

    ipcRenderer.on("menu:action", listener);
    return () => ipcRenderer.removeListener("menu:action", listener);
  },
});
