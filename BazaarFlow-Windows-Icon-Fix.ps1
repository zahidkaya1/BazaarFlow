$ErrorActionPreference = 'Stop'
Set-Location 'E:\Projeler\BazaarFlow'

Write-Host '1/4 Tauri ikon seti yeniden uretiliyor...'
npm run tauri icon .\BazaarFlow-app-icon.png

Write-Host '2/4 Rust/Tauri cache temizleniyor...'
cargo clean --manifest-path .\src-tauri\Cargo.toml

Write-Host '3/4 Frontend kontrolu...'
npm run lint
npm run build

Write-Host '4/4 Tauri Windows build...'
npm run tauri build

Write-Host 'Tamam. Once src-tauri\target\release\bazaarflow.exe ikonunu kontrol et.'
