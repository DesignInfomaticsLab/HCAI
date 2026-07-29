# HCAI 파비콘
#   파란 배경(#2F7BFF) + 흰 대문자 HCAI
#   좌상단 -> 우하단 대각선으로 한 글자씩 배치
#   각 크기를 축소가 아니라 그 크기에서 직접 그려 작은 사이즈에서도 또렷하게

param([string]$OutDir = ".")

Add-Type -AssemblyName System.Drawing

$BLUE    = [System.Drawing.ColorTranslator]::FromHtml("#2F7BFF")
$letters = @("H", "C", "A", "I")

function New-Favicon([int]$px, [string]$file) {
  $bmp = New-Object System.Drawing.Bitmap($px, $px)
  $g   = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear($BLUE)
  $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $em     = $px * 0.36     # 글자 크기
  $margin = $px * 0.20     # 대각선 양 끝 여백
  $font   = New-Object System.Drawing.Font("Pretendard ExtraBold", $em, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $brush  = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment     = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center

  $near = $margin
  $far  = $px - $margin

  for ($i = 0; $i -lt $letters.Count; $i++) {
    $t  = $i / ($letters.Count - 1)
    $cx = $near + ($far - $near) * $t
    # 대문자는 라인박스 위쪽에 몰려 있어 중앙정렬하면 살짝 떠 보입니다. 조금 내려 보정.
    $cy = $near + ($far - $near) * $t + $em * 0.06
    $g.DrawString($letters[$i], $font, $brush, (New-Object System.Drawing.PointF($cx, $cy)), $fmt)
  }

  $font.Dispose(); $brush.Dispose(); $fmt.Dispose(); $g.Dispose()
  $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

foreach ($px in @(512, 180, 32, 16)) {
  $f = Join-Path $OutDir ("hcai-favicon-{0}.png" -f $px)
  New-Favicon -px $px -file $f
  Write-Output ("  {0,4}px  {1,6} bytes" -f $px, (Get-Item $f).Length)
}
