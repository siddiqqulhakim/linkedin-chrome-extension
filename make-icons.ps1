Add-Type -AssemblyName System.Drawing

function Create-Icon {
    param([int]$size, [string]$path)

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'HighQuality'
    $g.Clear([System.Drawing.Color]::Transparent)

    # Green circle
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(10, 102, 194))
    $margin = [int]($size * 0.1)
    $g.FillEllipse($brush, $margin, $margin, $size - $margin*2, $size - $margin*2)

    # Inner white circle
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $innerMargin = [int]($size * 0.25)
    $g.FillEllipse($whiteBrush, $innerMargin, $innerMargin, $size - $innerMargin*2, $size - $innerMargin*2)

    # 'in' text
    $fontSize = [int]($size * 0.35)
    if ($fontSize -lt 4) { $fontSize = 4 }
    $font = New-Object System.Drawing.Font('Arial', $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(10, 102, 194))
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = 'Center'
    $sf.LineAlignment = 'Center'
    $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $g.DrawString('in', $font, $textBrush, $rect, $sf)

    $g.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created: $path"
}

$base = 'C:\Users\msid9228\WebstormProjects\linkedin-chrome-extension\extension\icons'
Create-Icon -size 16 -path "$base\icon16.png"
Create-Icon -size 48 -path "$base\icon48.png"
Create-Icon -size 128 -path "$base\icon128.png"
Write-Host 'All icons created!'
