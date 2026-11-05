import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('build', exist_ok=True)

size = (512, 512)
img = Image.new('RGBA', size, (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Background rounded square / shield
bg_color = (15, 23, 42, 255) # Dark slate
draw.rounded_rectangle([16, 16, 496, 496], radius=96, fill=bg_color, outline=(59, 130, 246, 255), width=12)

# Isometric 3D Voxel Cube in the center
# Top face (green / grass or SQL blue)
center_x = 256
center_y = 230
r = 140

# Top face
top_pts = [
    (center_x, center_y - 100),
    (center_x + 130, center_y - 30),
    (center_x, center_y + 40),
    (center_x - 130, center_y - 30)
]
draw.polygon(top_pts, fill=(16, 185, 129, 255), outline=(5, 150, 105, 255)) # Emerald

# Left face (Dirt / Dark Slate)
left_pts = [
    (center_x - 130, center_y - 30),
    (center_x, center_y + 40),
    (center_x, center_y + 160),
    (center_x - 130, center_y + 90)
]
draw.polygon(left_pts, fill=(30, 41, 59, 255), outline=(15, 23, 42, 255))

# Right face (Database blue)
right_pts = [
    (center_x, center_y + 40),
    (center_x + 130, center_y - 30),
    (center_x + 130, center_y + 90),
    (center_x, center_y + 160)
]
draw.polygon(right_pts, fill=(37, 99, 235, 255), outline=(29, 78, 216, 255))

# Grid lines on top face to evoke voxel / database table
draw.line([(center_x - 65, center_y - 65), (center_x + 65, center_y + 5)], fill=(110, 231, 183, 200), width=4)
draw.line([(center_x + 65, center_y - 65), (center_x - 65, center_y + 5)], fill=(110, 231, 183, 200), width=4)

# Data disks on the right face
draw.ellipse([center_x + 25, center_y + 60, center_x + 105, center_y + 90], outline=(147, 197, 253, 255), width=4)
draw.ellipse([center_x + 25, center_y + 95, center_x + 105, center_y + 125], outline=(147, 197, 253, 255), width=4)

# Text "SQL" at bottom
try:
    font = ImageFont.truetype("arialbd.ttf", 64)
except Exception:
    font = ImageFont.load_default()

bbox = draw.textbbox((0, 0), "SQL CRAFT", font=font)
text_w = bbox[2] - bbox[0]
text_x = (512 - text_w) // 2
draw.text((text_x, 415), "SQL CRAFT", fill=(248, 250, 252, 255), font=font)

# Save PNG
img.save('build/icon.png', format='PNG')

# Save multi-size ICO
ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
img.save('build/icon.ico', format='ICO', sizes=ico_sizes)

print("Icons successfully created in build/")

