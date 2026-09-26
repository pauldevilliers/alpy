#define MyAppName "Alpy"
#define MyAppVersion "0.2.0"
#define MyAppPublisher "Alpy"
#define MyAppExeName "Alpy.exe"

[Setup]
AppId={{A6BA5CF0-4A9B-4FC5-8B75-1F042D4E645A}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Programs\Alpy
DefaultGroupName=Alpy
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\..\dist
OutputBaseFilename=AlpySetup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\{#MyAppExeName}

[Files]
Source: "..\publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Alpy"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\Alpy"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"; Flags: checkedonce

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Open Alpy"; Flags: nowait postinstall skipifsilent
