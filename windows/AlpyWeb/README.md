# Alpy Web for Windows

This is the native Windows wrapper for the browser-based Alpy Web shell.

It embeds the files from `/alpy-web` into the published application folder and serves them internally to WebView2 through a virtual HTTPS host:

```
https://alpy.local/
```

No Python server, Node server, IIS, Apache or internet connection is required to launch the shell itself.

## Build locally

Requires .NET 8 SDK:

```powershell
dotnet restore windows/AlpyWeb/AlpyWeb.csproj
dotnet publish windows/AlpyWeb/AlpyWeb.csproj -c Release -r win-x64 --self-contained true -o windows/AlpyWeb/publish
```

Run:

```
windows\AlpyWeb\publish\AlpyWeb.exe
```

## Shortcuts

- F11 — fullscreen
- Ctrl+R — reload
- Ctrl+Shift+I — developer tools

## GitHub build artifacts

The workflow `Build Alpy Web Windows App` creates:

- `AlpyWeb-portable` — portable Windows build
- `AlpyWebSetup.exe` — normal one-click Windows installer
