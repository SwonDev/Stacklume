from PIL import Image, ImageDraw, ImageFont
import os

out = os.path.dirname(os.path.abspath(__file__))
W, H = 1920, 1080

navy = (10, 22, 40)
navy_mid = (14, 28, 50)
gold = (212, 168, 83)
white = (232, 234, 240)
gray = (120, 130, 150)
gold_dim = (170, 135, 65)
blue = (59, 130, 246)
green = (16, 185, 129)
amber = (245, 158, 11)
red = (239, 68, 68)

def font(size, bold=False):
    try:
        f = "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"
        return ImageFont.truetype(f, size)
    except:
        return ImageFont.load_default()

def gradient(img):
    draw = ImageDraw.Draw(img)
    w, h = img.size
    for y in range(h):
        t = y / h
        r = int(navy[0] + (navy_mid[0] - navy[0]) * t)
        g = int(navy[1] + (navy_mid[1] - navy[1]) * t)
        b = int(navy[2] + (navy_mid[2] - navy[2]) * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    return draw

def draw_coin(draw, cx, cy, size):
    r = size // 2
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=gold, width=max(3, size//15))
    r2 = int(r * 0.7)
    draw.ellipse([cx-r2, cy-r2, cx+r2, cy+r2], outline=gold_dim, width=max(2, size//25))
    f = font(int(size * 0.45), bold=True)
    bbox = draw.textbbox((0,0), "S", font=f)
    tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    draw.text((cx-tw//2, cy-th//2-bbox[1]), "S", fill=gold, font=f)

def mock_popup(draw, px, py, pw=360, ph=520):
    draw.rounded_rectangle([px, py, px+pw, py+ph], radius=16, fill=(15, 28, 48), outline=(40, 60, 90))
    draw.rounded_rectangle([px, py, px+pw, py+48], radius=16, fill=(20, 38, 65))
    draw.rectangle([px, py+32, px+pw, py+48], fill=(20, 38, 65))
    draw_coin(draw, px+28, py+24, 28)
    draw.text((px+50, py+11), "Stacklume", fill=gold, font=font(17, True))
    fields = ["URL", "Titulo", "Descripcion"]
    fy = py + 65
    for field in fields:
        draw.text((px+18, fy), field, fill=gray, font=font(11))
        draw.rounded_rectangle([px+18, fy+16, px+pw-18, fy+36], radius=6, fill=(25, 45, 75), outline=(40, 60, 90))
        fy += 50
    draw.text((px+18, fy), "Categoria", fill=gray, font=font(11))
    draw.rounded_rectangle([px+18, fy+16, px+pw-18, fy+36], radius=6, fill=(25, 45, 75), outline=(40, 60, 90))
    fy += 55
    draw.text((px+18, fy), "Etiquetas", fill=gray, font=font(11))
    fy += 18
    tags = [("React", blue), ("Frontend", green), ("Docs", (139,92,246))]
    tx = px + 18
    for name, color in tags:
        draw.rounded_rectangle([tx, fy, tx+65, fy+22], radius=11, fill=color)
        draw.text((tx+10, fy+3), name, fill=white, font=font(11))
        tx += 75
    fy += 40
    statuses = [("Bandeja", blue), ("Leyendo", amber), ("Leido", green)]
    sx = px + 18
    for name, color in statuses:
        w = 95
        draw.rounded_rectangle([sx, fy, sx+w, fy+26], radius=6, fill=(25,45,75), outline=color)
        draw.text((sx+12, fy+5), name, fill=color, font=font(11))
        sx += w + 8
    fy += 45
    draw.rounded_rectangle([px+18, fy, px+pw-18, fy+38], radius=8, fill=gold)
    draw.text((px+pw//2-30, fy+8), "Guardar", fill=navy, font=font(16, True))

# FRAME 1: Intro
img = Image.new("RGB", (W, H), navy)
draw = gradient(img)
draw_coin(draw, W//2, H//2-80, 200)
draw.text((W//2-180, H//2+60), "Stacklume", fill=gold, font=font(72, True))
draw.text((W//2-230, H//2+150), "Tu gestor de enlaces inteligente", fill=white, font=font(28))
draw.text((W//2-120, H//2+200), "con IA local", fill=gold_dim, font=font(24))
img.save(os.path.join(out, "frame-01-intro.png"))

# FRAME 2: Extension popup
img = Image.new("RGB", (W, H), navy)
draw = gradient(img)
draw.text((120, 100), "Extension del navegador", fill=gold_dim, font=font(20))
draw.text((120, 140), "Guarda cualquier enlace", fill=gold, font=font(52, True))
draw.text((120, 210), "con un solo clic", fill=gold, font=font(52, True))
draw.text((120, 300), "Captura automaticamente titulo, descripcion,", fill=white, font=font(24))
draw.text((120, 340), "favicon, imagen y metadatos de la pagina.", fill=white, font=font(24))
mock_popup(draw, 900, 100, 380, 540)
img.save(os.path.join(out, "frame-02-popup.png"))

# FRAME 3: Platform detection
img = Image.new("RGB", (W, H), navy)
draw = gradient(img)
draw.text((120, 100), "Deteccion inteligente", fill=gold_dim, font=font(20))
draw.text((120, 140), "Reconoce 15+ plataformas", fill=gold, font=font(52, True))
platforms = [
    ("YouTube", red), ("GitHub", (36,41,46)), ("Steam", (27,40,56)),
    ("Twitter/X", blue), ("Reddit", (255,69,0)), ("npm", (203,56,55)),
    ("Figma", (242,78,30)), ("Spotify", (29,185,84)), ("Medium", (0,171,108)),
    ("LinkedIn", (0,119,181)), ("DEV", (59,73,223)), ("Dribbble", (234,76,137)),
]
for i, (name, color) in enumerate(platforms):
    row, col = i // 4, i % 4
    x, y = 120 + col * 260, 280 + row * 70
    draw.rounded_rectangle([x, y, x+230, y+50], radius=12, fill=color)
    draw.text((x+20, y+12), name, fill=white, font=font(20, True))
img.save(os.path.join(out, "frame-03-platforms.png"))

# FRAME 4: Commands
img = Image.new("RGB", (W, H), navy)
draw = gradient(img)
draw.text((120, 100), "Comandos detectados", fill=gold_dim, font=font(20))
draw.text((120, 140), "npm, pip, cargo, brew...", fill=gold, font=font(52, True))
cmds = ["npm install next@14", "pip install django", "cargo add serde", "brew install ffmpeg",
        "yarn add react", "bun add hono", "gem install rails", "go get golang.org/x/tools"]
for i, cmd in enumerate(cmds):
    row, col = i // 2, i % 2
    x, y = 120 + col * 500, 300 + row * 60
    draw.rounded_rectangle([x, y, x+460, y+44], radius=8, fill=(20, 38, 65), outline=(40,60,90))
    draw.text((x+16, y+10), "> " + cmd, fill=green, font=font(18))
draw.text((120, 580), "Auto-genera URL del registro + titulo del paquete", fill=white, font=font(22))
img.save(os.path.join(out, "frame-04-commands.png"))

# FRAME 5: Organization
img = Image.new("RGB", (W, H), navy)
draw = gradient(img)
draw.text((120, 100), "Organizacion completa", fill=gold_dim, font=font(20))
draw.text((120, 140), "Categorias, tags y estados", fill=gold, font=font(52, True))
tag_data = [("React", blue), ("TypeScript", (49,120,198)), ("Python", (55,118,171)),
            ("Frontend", green), ("Backend", amber), ("DevOps", red),
            ("Tutorial", (139,92,246)), ("Docs", (6,182,212)), ("IA", (168,85,247))]
tx, ty = 120, 300
for name, color in tag_data:
    f = font(20)
    bbox = draw.textbbox((0,0), name, font=f)
    tw = bbox[2]-bbox[0]
    draw.rounded_rectangle([tx, ty, tx+tw+30, ty+38], radius=19, fill=color)
    draw.text((tx+15, ty+7), name, fill=white, font=f)
    tx += tw + 45
    if tx > 900:
        tx = 120
        ty += 55
img.save(os.path.join(out, "frame-05-organization.png"))

# FRAME 6: Save all tabs
img = Image.new("RGB", (W, H), navy)
draw = gradient(img)
draw.text((120, 100), "Productividad", fill=gold_dim, font=font(20))
draw.text((120, 140), "Guarda todas las pestanas", fill=gold, font=font(52, True))
draw.text((120, 220), "de una sola vez", fill=gold, font=font(52, True))
tabs = [("react.dev", "React Documentation"), ("github.com", "SwonDev/Stacklume"),
        ("youtube.com", "Build a Tauri App"), ("developer.mozilla.org", "MDN Web Docs"),
        ("tailwindcss.com", "Installation Guide"), ("docs.python.org", "Python Tutorial")]
for i, (domain, title) in enumerate(tabs):
    y = 340 + i * 55
    draw.rounded_rectangle([120, y, 900, y+42], radius=8, fill=(20,38,65), outline=(40,60,90))
    draw.ellipse([135, y+10, 155, y+30], fill=green)
    draw.text((170, y+10), title, fill=white, font=font(16))
    draw.text((650, y+12), domain, fill=gray, font=font(13))
img.save(os.path.join(out, "frame-06-save-all.png"))

# FRAME 7: Privacy
img = Image.new("RGB", (W, H), navy)
draw = gradient(img)
draw.text((120, 100), "Privacidad total", fill=gold_dim, font=font(20))
draw.text((120, 140), "Tus datos son tuyos", fill=gold, font=font(52, True))
items = [("Datos locales", "Todo se guarda en tu ordenador"), ("Sin telemetria", "No rastreamos datos de uso"),
         ("Sin servidores", "Solo se comunica con tu app local"), ("Codigo abierto", "Disponible en GitHub"),
         ("IA local", "El modelo corre en tu maquina")]
for i, (title, desc) in enumerate(items):
    y = 300 + i * 80
    draw.rounded_rectangle([120, y, 920, y+60], radius=12, fill=(20,38,65))
    draw.ellipse([140, y+14, 172, y+46], fill=green)
    draw.text((190, y+12), title, fill=gold, font=font(20, True))
    draw.text((190, y+36), desc, fill=gray, font=font(15))
img.save(os.path.join(out, "frame-07-privacy.png"))

# FRAME 8: Outro
img = Image.new("RGB", (W, H), navy)
draw = gradient(img)
draw_coin(draw, W//2, H//2-100, 180)
draw.text((W//2-180, H//2+40), "Stacklume", fill=gold, font=font(64, True))
draw.text((W//2-130, H//2+120), "Descarga gratis", fill=white, font=font(28))
draw.text((W//2-220, H//2+170), "github.com/SwonDev/Stacklume", fill=gold_dim, font=font(22))
img.save(os.path.join(out, "frame-08-outro.png"))

print("8 frames generated!")
for f in sorted(os.listdir(out)):
    if f.startswith("frame-"):
        print(f"  {f}")
