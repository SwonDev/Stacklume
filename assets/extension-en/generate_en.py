from PIL import Image, ImageDraw, ImageFont
import os

out = os.path.dirname(os.path.abspath(__file__))
W, H = 1920, 1080
navy = (10, 22, 40); navy_mid = (14, 28, 50); gold = (212, 168, 83)
white = (232, 234, 240); gray = (120, 130, 150); gold_dim = (170, 135, 65)
blue = (59, 130, 246); green = (16, 185, 129); amber = (245, 158, 11); red = (239, 68, 68)

def font(size, bold=False):
    try: return ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf", size)
    except: return ImageFont.load_default()

def gradient(img):
    draw = ImageDraw.Draw(img)
    w, h = img.size
    for y in range(h):
        t = y / h
        draw.line([(0, y), (w, y)], fill=(int(navy[0]+(navy_mid[0]-navy[0])*t), int(navy[1]+(navy_mid[1]-navy[1])*t), int(navy[2]+(navy_mid[2]-navy[2])*t)))
    return draw

def draw_coin(draw, cx, cy, size):
    r = size // 2
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=gold, width=max(3, size//15))
    r2 = int(r * 0.7)
    draw.ellipse([cx-r2, cy-r2, cx+r2, cy+r2], outline=gold_dim, width=max(2, size//25))
    f = font(int(size * 0.45), bold=True)
    bbox = draw.textbbox((0,0), "S", font=f)
    draw.text((cx-(bbox[2]-bbox[0])//2, cy-(bbox[3]-bbox[1])//2-bbox[1]), "S", fill=gold, font=f)

def mock_popup(draw, px, py, pw=360, ph=520):
    draw.rounded_rectangle([px, py, px+pw, py+ph], radius=16, fill=(15,28,48), outline=(40,60,90))
    draw.rounded_rectangle([px, py, px+pw, py+48], radius=16, fill=(20,38,65))
    draw.rectangle([px, py+32, px+pw, py+48], fill=(20,38,65))
    draw_coin(draw, px+28, py+24, 28)
    draw.text((px+50, py+11), "Stacklume", fill=gold, font=font(17, True))
    fy = py + 65
    for field in ["URL", "Title", "Description"]:
        draw.text((px+18, fy), field, fill=gray, font=font(11))
        draw.rounded_rectangle([px+18, fy+16, px+pw-18, fy+36], radius=6, fill=(25,45,75), outline=(40,60,90))
        fy += 50
    draw.text((px+18, fy), "Category", fill=gray, font=font(11))
    draw.rounded_rectangle([px+18, fy+16, px+pw-18, fy+36], radius=6, fill=(25,45,75), outline=(40,60,90))
    fy += 55
    draw.text((px+18, fy), "Tags", fill=gray, font=font(11))
    fy += 18
    tx = px + 18
    for name, color in [("React", blue), ("Frontend", green), ("Docs", (139,92,246))]:
        draw.rounded_rectangle([tx, fy, tx+65, fy+22], radius=11, fill=color)
        draw.text((tx+10, fy+3), name, fill=white, font=font(11))
        tx += 75
    fy += 40
    sx = px + 18
    for name, color in [("Inbox", blue), ("Reading", amber), ("Done", green)]:
        draw.rounded_rectangle([sx, fy, sx+95, fy+26], radius=6, fill=(25,45,75), outline=color)
        draw.text((sx+12, fy+5), name, fill=color, font=font(11))
        sx += 103
    fy += 45
    draw.rounded_rectangle([px+18, fy, px+pw-18, fy+38], radius=8, fill=gold)
    draw.text((px+pw//2-18, fy+8), "Save", fill=navy, font=font(16, True))

# Promo small
img = Image.new("RGB", (440, 280), navy); draw = gradient(img)
draw_coin(draw, 100, 140, 120)
draw.text((175, 85), "Stacklume", fill=gold, font=font(36, True))
draw.text((175, 130), "Save and organize", fill=white, font=font(18))
draw.text((175, 155), "all your links", fill=white, font=font(18))
draw.text((175, 180), "with local AI", fill=gold_dim, font=font(16))
img.save(os.path.join(out, "promo-small-440x280.png")); print("1. promo-small")

# Promo large
img = Image.new("RGB", (1400, 560), navy); draw = gradient(img)
draw_coin(draw, 200, 280, 200)
draw.text((370, 150), "Stacklume", fill=gold, font=font(72, True))
draw.text((370, 240), "Save, organize and classify your links with AI", fill=white, font=font(28))
draw.text((370, 285), "Native extension for your desktop bookmark manager", fill=gold_dim, font=font(22))
for i, feat in enumerate(["Tags", "Categories", "Local AI", "Reader", "Kanban", "Privacy"]):
    px = 370 + i * 140
    draw.rounded_rectangle([px, 340, px+120, 370], radius=12, fill=(18,35,60), outline=gold_dim)
    draw.text((px+15, 345), feat, fill=gold, font=font(16))
img.save(os.path.join(out, "promo-large-1400x560.png")); print("2. promo-large")

# Screenshots
shots = [
    ("Quick Capture", "Save any link", "with a single click", "Automatically captures title, description,\nfavicon, image and page metadata."),
    ("Smart Detection", "Recognizes 15+ platforms", "", "YouTube, GitHub, Steam, Twitter/X, Reddit,\nnpm, Figma, Spotify and more."),
    ("Command Detection", "npm, pip, cargo, brew...", "", "Auto-generates registry URL and package title\nfrom any package manager command."),
    ("Full Organization", "Categories, tags and statuses", "", "Multi-tag selection, reading status tracking,\npersonal notes and reminders."),
    ("Save All Tabs", "Save every open tab", "at once", "One click saves all tabs with their metadata.\nPerfect for research sessions."),
    ("Total Privacy", "Your data stays yours", "", "Everything stored locally on your computer.\nNo telemetry, no tracking, no cloud servers."),
]
for i, (label, t1, t2, desc) in enumerate(shots):
    img = Image.new("RGB", (1280, 800), navy); draw = gradient(img)
    draw.text((80, 60), label, fill=gold_dim, font=font(16))
    draw.text((80, 100), t1, fill=gold, font=font(42, True))
    dy = 165
    if t2: draw.text((80, 155), t2, fill=gold, font=font(42, True)); dy = 225
    for j, line in enumerate(desc.split("\n")): draw.text((80, dy+j*35), line, fill=white, font=font(22))
    mock_popup(draw, 750, 120, 380, 540)
    draw.text((80, 740), "stacklume.app", fill=gold_dim, font=font(18))
    img.save(os.path.join(out, f"screenshot-{i+1}-1280x800.png"))
    img.resize((640, 400), Image.LANCZOS).save(os.path.join(out, f"screenshot-{i+1}-640x400.png"))
    print(f"{i+3}. screenshot-{i+1}")

# Video frames
frames = [
    ("frame-01-intro", lambda d: [draw_coin(d, W//2, H//2-80, 200), d.text((W//2-180, H//2+60), "Stacklume", fill=gold, font=font(72, True)), d.text((W//2-250, H//2+150), "Your intelligent link manager", fill=white, font=font(28)), d.text((W//2-110, H//2+200), "with local AI", fill=gold_dim, font=font(24))]),
    ("frame-02-popup", lambda d: [d.text((120,100), "Browser Extension", fill=gold_dim, font=font(20)), d.text((120,140), "Save any link", fill=gold, font=font(52, True)), d.text((120,210), "with a single click", fill=gold, font=font(52, True)), d.text((120,300), "Automatically captures title, description,", fill=white, font=font(24)), d.text((120,340), "favicon, image and page metadata.", fill=white, font=font(24)), mock_popup(d, 900, 100, 380, 540)]),
]
for name, render_fn in frames:
    img = Image.new("RGB", (W, H), navy); draw = gradient(img); render_fn(draw)
    img.save(os.path.join(out, f"{name}.png")); print(f"  {name}")

# Frame 3-8
img = Image.new("RGB", (W, H), navy); draw = gradient(img)
draw.text((120,100), "Smart Detection", fill=gold_dim, font=font(20))
draw.text((120,140), "Recognizes 15+ platforms", fill=gold, font=font(52, True))
for i, (n, c) in enumerate([("YouTube",red),("GitHub",(36,41,46)),("Steam",(27,40,56)),("Twitter/X",blue),("Reddit",(255,69,0)),("npm",(203,56,55)),("Figma",(242,78,30)),("Spotify",(29,185,84)),("Medium",(0,171,108)),("LinkedIn",(0,119,181)),("DEV",(59,73,223)),("Dribbble",(234,76,137))]):
    x, y = 120+(i%4)*260, 280+(i//4)*70
    draw.rounded_rectangle([x,y,x+230,y+50], radius=12, fill=c); draw.text((x+20,y+12), n, fill=white, font=font(20, True))
img.save(os.path.join(out, "frame-03-platforms.png")); print("  frame-03")

img = Image.new("RGB", (W, H), navy); draw = gradient(img)
draw.text((120,100), "Command Detection", fill=gold_dim, font=font(20))
draw.text((120,140), "npm, pip, cargo, brew...", fill=gold, font=font(52, True))
for i, cmd in enumerate(["npm install next@14","pip install django","cargo add serde","brew install ffmpeg","yarn add react","bun add hono","gem install rails","go get golang.org/x/tools"]):
    x, y = 120+(i%2)*500, 300+(i//2)*60
    draw.rounded_rectangle([x,y,x+460,y+44], radius=8, fill=(20,38,65), outline=(40,60,90))
    draw.text((x+16,y+10), "> "+cmd, fill=green, font=font(18))
draw.text((120,580), "Auto-generates registry URL + package title", fill=white, font=font(22))
img.save(os.path.join(out, "frame-04-commands.png")); print("  frame-04")

img = Image.new("RGB", (W, H), navy); draw = gradient(img)
draw.text((120,100), "Full Organization", fill=gold_dim, font=font(20))
draw.text((120,140), "Categories, tags and statuses", fill=gold, font=font(52, True))
tx, ty = 120, 300
for n, c in [("React",blue),("TypeScript",(49,120,198)),("Python",(55,118,171)),("Frontend",green),("Backend",amber),("DevOps",red),("Tutorial",(139,92,246)),("Docs",(6,182,212)),("AI",(168,85,247))]:
    f = font(20); bbox = draw.textbbox((0,0),n,font=f); tw = bbox[2]-bbox[0]
    draw.rounded_rectangle([tx,ty,tx+tw+30,ty+38], radius=19, fill=c); draw.text((tx+15,ty+7),n,fill=white,font=f)
    tx += tw+45
    if tx > 900: tx=120; ty+=55
img.save(os.path.join(out, "frame-05-organization.png")); print("  frame-05")

img = Image.new("RGB", (W, H), navy); draw = gradient(img)
draw.text((120,100), "Productivity", fill=gold_dim, font=font(20))
draw.text((120,140), "Save all open tabs", fill=gold, font=font(52, True))
draw.text((120,220), "at once", fill=gold, font=font(52, True))
for i, (dom, title) in enumerate([("react.dev","React Documentation"),("github.com","SwonDev/Stacklume"),("youtube.com","Build a Tauri App"),("developer.mozilla.org","MDN Web Docs"),("tailwindcss.com","Installation Guide"),("docs.python.org","Python Tutorial")]):
    y = 340+i*55
    draw.rounded_rectangle([120,y,900,y+42], radius=8, fill=(20,38,65), outline=(40,60,90))
    draw.ellipse([135,y+10,155,y+30], fill=green); draw.text((170,y+10),title,fill=white,font=font(16)); draw.text((650,y+12),dom,fill=gray,font=font(13))
img.save(os.path.join(out, "frame-06-save-all.png")); print("  frame-06")

img = Image.new("RGB", (W, H), navy); draw = gradient(img)
draw.text((120,100), "Total Privacy", fill=gold_dim, font=font(20))
draw.text((120,140), "Your data stays yours", fill=gold, font=font(52, True))
for i, (t, d) in enumerate([("Local storage","Everything saved on your computer"),("No telemetry","We never track your usage"),("No servers","Only communicates with your local app"),("Open source","Available on GitHub"),("Local AI","The AI model runs on your machine")]):
    y = 300+i*80
    draw.rounded_rectangle([120,y,920,y+60], radius=12, fill=(20,38,65))
    draw.ellipse([140,y+14,172,y+46], fill=green); draw.text((190,y+12),t,fill=gold,font=font(20,True)); draw.text((190,y+36),d,fill=gray,font=font(15))
img.save(os.path.join(out, "frame-07-privacy.png")); print("  frame-07")

img = Image.new("RGB", (W, H), navy); draw = gradient(img)
draw_coin(draw, W//2, H//2-100, 180)
draw.text((W//2-180, H//2+40), "Stacklume", fill=gold, font=font(64, True))
draw.text((W//2-130, H//2+120), "Download for free", fill=white, font=font(28))
draw.text((W//2-220, H//2+170), "github.com/SwonDev/Stacklume", fill=gold_dim, font=font(22))
img.save(os.path.join(out, "frame-08-outro.png")); print("  frame-08")

print("\nAll EN assets generated!")
