import 'dotenv/config';
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';
const clientPort = process.env.CLIENT_APP_PORT ?? '3343';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366 + 32,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Remove o menu da aplicação
  mainWindow.setMenu(null);
  mainWindow.maximize();

  if (isDev) {
    console.log('🚀 Carregando aplicação em modo desenvolvimento...');
    console.log(`🔌 Porta do cliente: ${clientPort}`);
    mainWindow.loadURL(`http://localhost:${clientPort}`);
  } else {
    console.log('📦 Carregando aplicação em modo produção...');
    mainWindow.loadFile(path.join(__dirname, '../client/index.html'));
  }
}

// // Handlers IPC
// ipcMain.on('close-app', () => {
//   console.log('🛑 Solicitação de fechamento recebida do React');
//   if (mainWindow) {
//     mainWindow.close();
//   }
// });

// ipcMain.on('quit-app', () => {
//   console.log('🛑 Solicitação de encerramento recebida do React');
//   app.quit();
// });

// ipcMain.on('minimize-app', () => {
//   console.log('📉 Minimizando aplicação');
//   if (mainWindow) {
//     mainWindow.minimize();
//   }
// });

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
