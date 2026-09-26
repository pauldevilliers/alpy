#define MyAppName "Alpy Web"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "Alpy"
#define MyAppExeName "AlpyWeb.exe"

[Setup]
AppId={{4A8B8B35-CAD9-45D2-94F4-4BA3DC237FC0}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Programs\AlpyWeb
DefaultGroupName=Alpy Web
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\..\dist
OutputBaseFilename=AlpyWebSetup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\{#MyAppExeName}

[Files]
Source: "..\AlpyWeb\publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Alpy Web"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\Alpy Web"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"; Flags: checkedonce

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Open Alpy Web"; Flags: nowait postinstall skipifsilent
