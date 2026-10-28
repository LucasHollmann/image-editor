import { app, BrowserWindow, dialog, ipcMain, Menu } from "electron";
import { writeFile } from "node:fs/promises";
import path from "node:path";

ipcMain.handle(
  "image:save-png",
  async (event, dataUrl: unknown, documentName: unknown): Promise<{ saved: boolean }> => {
    if (typeof dataUrl !== "string") {
      throw new TypeError("Os dados da imagem são inválidos.");
    }

    const pngMatch = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!pngMatch) {
      throw new TypeError("O formato da imagem não é PNG válido.");
    }

    const safeName =
      typeof documentName === "string"
        ? path.basename(documentName).replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
        : "imagem";
    const defaultName = safeName.toLowerCase().endsWith(".png") ? safeName : `${safeName}.png`;
    const ownerWindow = BrowserWindow.fromWebContents(event.sender);
    const options = {
      title: "Salvar imagem",
      defaultPath: defaultName,
      filters: [{ name: "Imagem PNG", extensions: ["png"] }],
    };
    const result = ownerWindow
      ? await dialog.showSaveDialog(ownerWindow, options)
      : await dialog.showSaveDialog(options);

    if (result.canceled || !result.filePath) return { saved: false };

    await writeFile(result.filePath, Buffer.from(pngMatch[1], "base64"));
    return { saved: true };
  },
);

const createApplicationMenu = (): void => {
  const fileMenu: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Novo canvas",
      accelerator: "CmdOrCtrl+N",
      click: () => BrowserWindow.getFocusedWindow()?.webContents.send("menu:action", "new-canvas"),
    },
    { type: "separator" },
    {
      label: "Salvar imagem...",
      accelerator: "CmdOrCtrl+S",
      click: () => BrowserWindow.getFocusedWindow()?.webContents.send("menu:action", "save-image"),
    },
  ];

  const template: Electron.MenuItemConstructorOptions[] = [
    { label: "Arquivo", submenu: fileMenu },
    {
      label: "Exibir",
      submenu: [
        {
          label: "Ferramentas do desenvolvedor",
          accelerator: "CmdOrCtrl+Shift+I",
          role: "toggleDevTools",
        },
      ],
    },
  ];

  if (process.platform === "darwin") {
    template.unshift({
      label: app.name,
      submenu: [{ role: "quit" }],
    });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

const createWindow = (): void => {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#111318",
    title: "Pixel Studio",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(path.join(__dirname, "../dist/index.html"));
  }
};

app.whenReady().then(() => {
  createApplicationMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
