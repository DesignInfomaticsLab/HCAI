# HCAI 파비콘
#   쨍한 파란 배경 + 흰 대문자 HCAI
#   글자 전체를 45도 기울여 좌상단에서 우하단으로 흐르게 배치
#   각 크기를 축소가 아니라 그 크기에서 직접 그려 작은 사이즈에서도 또렷하게
#
#   색·굵기·기울기를 바꾸려면 아래 BLUE / FONT / FILL / TILT 만 고치고 다시 실행하세요.
#     powershell -File tools\favicon\make-favicon.ps1 -OutDir assets\img

param([string]$OutDir = ".")

Add-Type -AssemblyName System.Drawing

$BLUE = [System.Drawing.ColorTranslator]::FromHtml("#0055FF")  # 채도를 끝까지 올린 파랑
$FONT = "Pretendard ExtraBold"
$WORD = "HCAI"
$FILL = 0.64     # 대각선 길이 대비 글자가 차지할 비율 (올리면 글자가 모서리에서 잘립니다)
$TILT = 45       # 기울기(도). 좌상단 -> 우하단

function New-Favicon([int]$px, [string]$file) {
  $bmp = New-Object System.Drawing.Bitmap($px, $px)
  $g   = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear($BLUE)
  $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

  $fmt = New-Object System.Drawing.StringFormat ([System.Drawing.StringFormat]::GenericTypographic)
  $fmt.Alignment     = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center

  # "HCAI" 4글자의 가로폭은 대략 글자 크기의 2.55배입니다.
  # 대각선(px * 1.414)의 FILL 만큼 차지하도록 글자 크기를 역산합니다.
  $em = $px * [Math]::Sqrt(2) * $FILL / 2.55

  $font  = New-Object System.Drawing.Font($FONT, [float]$em, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

  # 정사각형 한가운데를 기준으로 회전한 뒤 글자를 얹습니다
  $g.TranslateTransform($px / 2.0, $px / 2.0)
  $g.RotateTransform($TILT)
  $g.DrawString($WORD, $font, $brush, [System.Drawing.PointF]::Empty, $fmt)
  $g.ResetTransform()

  $font.Dispose(); $brush.Dispose(); $fmt.Dispose(); $g.Dispose()
  $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

foreach ($px in @(512, 180, 32, 16)) {
  $f = Join-Path $OutDir ("favicon-{0}.png" -f $px)
  New-Favicon -px $px -file $f
  Write-Output ("  {0,4}px  {1,6} bytes  ->  {2}" -f $px, (Get-Item $f).Length, $f)
}
