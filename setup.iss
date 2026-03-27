[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName=VCF转换器
AppVersion=1.0.0
AppPublisher=鲲穹AI
AppPublisherURL=https://kunqiongai.com
DefaultDirName={autopf}\VCF转换器
DefaultGroupName=VCF转换器
AllowNoIcons=yes
OutputDir=release
OutputBaseFilename=VCF转换器-安装版
SetupIconFile=public\vcf-logo.ico
UninstallDisplayIcon={app}\vcf-logo.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
DisableProgramGroupPage=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "release\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "public\vcf-logo.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\VCF转换器"; Filename: "{app}\VCF转换器.exe"; IconFilename: "{app}\vcf-logo.ico"
Name: "{group}\{cm:UninstallProgram,VCF转换器}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\VCF转换器"; Filename: "{app}\VCF转换器.exe"; IconFilename: "{app}\vcf-logo.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\VCF转换器.exe"; Description: "{cm:LaunchProgram,VCF转换器}"; Flags: nowait postinstall skipifsilent
