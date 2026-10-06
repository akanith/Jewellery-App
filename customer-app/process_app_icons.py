import os
from PIL import Image, ImageDraw, ImageOps, ImageEnhance

APP_DIR = os.path.dirname(os.path.abspath(__file__))
MASTER_PATH = os.path.join(APP_DIR, 'assets', 'images', 'App Icon.png')
ASSETS_IMG_DIR = os.path.join(APP_DIR, 'assets', 'images')
RES_DIR = os.path.join(APP_DIR, 'android', 'app', 'src', 'main', 'res')

print(f"Loading master icon from: {MASTER_PATH}")
master_img = Image.open(MASTER_PATH).convert('RGBA')
w, h = master_img.size
print(f"Master image size: {w}x{h}")

# 1. Standard Icon (1024x1024)
icon_1024 = master_img.resize((1024, 1024), Image.Resampling.LANCZOS)
icon_1024.save(os.path.join(ASSETS_IMG_DIR, 'icon.png'), 'PNG')
print("Saved assets/images/icon.png")

# Sample background color from top-center of master image (inside dark red area)
bg_color = master_img.getpixel((w // 2, 100))
print(f"Sampled background color (RGBA): {bg_color}")

# 2. Adaptive Background (1024x1024 full bleed deep red)
bg_1024 = Image.new('RGBA', (1024, 1024), bg_color)
bg_1024.save(os.path.join(ASSETS_IMG_DIR, 'android-icon-background.png'), 'PNG')
print("Saved assets/images/android-icon-background.png")

# 3. Adaptive Foreground (1024x1024 transparent canvas with emblem scaled to 66% safe zone)
# Safe zone diameter is 72dp out of 108dp (~66.7%). So scale master to 684x684 px.
fg_size = 684
fg_scaled = master_img.resize((fg_size, fg_size), Image.Resampling.LANCZOS)

# Create rounded mask or rounded rectangle for inner card if desired, or place full card inside safe zone
# To ensure the outer gold border looks clean inside adaptive masks:
fg_canvas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
offset = (1024 - fg_size) // 2
fg_canvas.paste(fg_scaled, (offset, offset), fg_scaled)
fg_canvas.save(os.path.join(ASSETS_IMG_DIR, 'android-icon-foreground.png'), 'PNG')
print("Saved assets/images/android-icon-foreground.png")

# 4. Adaptive Monochrome (1024x1024)
mono_canvas = Image.new('RGBA', (1024, 1024), (255, 255, 255, 0))
for x in range(1024):
    for y in range(1024):
        r, g, b, a = fg_canvas.getpixel((x, y))
        if a > 20:
            mono_canvas.putpixel((x, y), (255, 255, 255, min(255, a)))

mono_canvas.save(os.path.join(ASSETS_IMG_DIR, 'android-icon-monochrome.png'), 'PNG')
print("Saved assets/images/android-icon-monochrome.png")


# 5. Generate Native Android Mipmap Resources
MIPMAP_DENSITIES = {
    'mipmap-mdpi': {'launcher': 48, 'adaptive': 108},
    'mipmap-hdpi': {'launcher': 72, 'adaptive': 162},
    'mipmap-xhdpi': {'launcher': 96, 'adaptive': 216},
    'mipmap-xxhdpi': {'launcher': 144, 'adaptive': 324},
    'mipmap-xxxhdpi': {'launcher': 192, 'adaptive': 432},
}

def create_round_icon(img):
    w, h = img.size
    mask = Image.new('L', (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, w, h), fill=255)
    result = img.copy()
    result.putalpha(mask)
    return result

for folder, sizes in MIPMAP_DENSITIES.items():
    folder_path = os.path.join(RES_DIR, folder)
    os.makedirs(folder_path, exist_ok=True)
    
    l_size = sizes['launcher']
    a_size = sizes['adaptive']

    # Legacy launcher (ic_launcher.webp & .png)
    l_img = icon_1024.resize((l_size, l_size), Image.Resampling.LANCZOS)
    l_img.save(os.path.join(folder_path, 'ic_launcher.webp'), 'WEBP')
    
    # Legacy round launcher (ic_launcher_round.webp)
    r_img = create_round_icon(l_img)
    r_img.save(os.path.join(folder_path, 'ic_launcher_round.webp'), 'WEBP')

    # Adaptive foreground
    fg_res = fg_canvas.resize((a_size, a_size), Image.Resampling.LANCZOS)
    fg_res.save(os.path.join(folder_path, 'ic_launcher_foreground.webp'), 'WEBP')

    # Adaptive background
    bg_res = bg_1024.resize((a_size, a_size), Image.Resampling.LANCZOS)
    bg_res.save(os.path.join(folder_path, 'ic_launcher_background.webp'), 'WEBP')

    # Adaptive monochrome
    mono_res = mono_canvas.resize((a_size, a_size), Image.Resampling.LANCZOS)
    mono_res.save(os.path.join(folder_path, 'ic_launcher_monochrome.webp'), 'WEBP')

    print(f"Updated native resources in {folder} (launcher: {l_size}px, adaptive: {a_size}px)")

print("\n=== ALL ICON ASSETS GENERATED SUCCESSFULLY ===")
