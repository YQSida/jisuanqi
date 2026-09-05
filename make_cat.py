# -*- coding: utf-8 -*-
"""生成动漫小猫 SVG -> cat.svg"""
S = []
S.append('''<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
<defs>
  <radialGradient id="bg" cx="50%" cy="38%" r="80%">
    <stop offset="0%" stop-color="#FFF8EF"/>
    <stop offset="100%" stop-color="#FFDCE9"/>
  </radialGradient>
  <linearGradient id="fur" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#F9C784"/>
    <stop offset="100%" stop-color="#F2A656"/>
  </linearGradient>
  <linearGradient id="eye" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#0F3D2E"/>
    <stop offset="45%" stop-color="#2E8B57"/>
    <stop offset="100%" stop-color="#9BE7C0"/>
  </linearGradient>
</defs>''')

# 背景
S.append('<rect width="800" height="800" fill="url(#bg)"/>')
S.append('<circle cx="400" cy="430" r="320" fill="#FFFFFF" opacity="0.55"/>')

# 背景装饰：星星与爱心
def star(x, y, r, color):
    return (f'<path d="M{x},{y-r} L{x+r*0.28},{y-r*0.28} L{x+r},{y} L{x+r*0.28},{y+r*0.28} '
            f'L{x},{y+r} L{x-r*0.28},{y+r*0.28} L{x-r},{y} L{x-r*0.28},{y-r*0.28} Z" fill="{color}"/>')
S.append(star(135, 175, 18, "#FFD54F"))
S.append(star(668, 150, 14, "#FFD54F"))
S.append(star(705, 320, 10, "#FFB74D"))
S.append(star(95, 470, 10, "#FFB74D"))
S.append('<path d="M120,300 c-14,-18 -40,-6 -34,14 c4,14 22,24 34,32 c12,-8 30,-18 34,-32 c6,-20 -20,-32 -34,-14 Z" fill="#F48FB1" opacity="0.85"/>')

OUT = '#6B3F1D'  # 轮廓色

# 耳朵（先画，头会盖住耳根）
S.append(f'<polygon points="210,315 255,140 345,300" fill="url(#fur)" stroke="{OUT}" stroke-width="6" stroke-linejoin="round"/>')
S.append(f'<polygon points="590,315 545,140 455,300" fill="url(#fur)" stroke="{OUT}" stroke-width="6" stroke-linejoin="round"/>')
S.append('<polygon points="238,288 258,182 318,286" fill="#F8BBD0"/>')
S.append('<polygon points="562,288 542,182 482,286" fill="#F8BBD0"/>')

# 头
S.append(f'<ellipse cx="400" cy="430" rx="230" ry="200" fill="url(#fur)" stroke="{OUT}" stroke-width="6"/>')

# 额头花纹
S.append('<g stroke="#DE8A3A" stroke-width="11" stroke-linecap="round">'
         '<line x1="368" y1="252" x2="368" y2="302"/>'
         '<line x1="400" y1="244" x2="400" y2="298"/>'
         '<line x1="432" y1="252" x2="432" y2="302"/></g>')

# 眼睛
for cx in (305, 495):
    S.append(f'<ellipse cx="{cx}" cy="445" rx="48" ry="60" fill="url(#eye)" stroke="#3A2313" stroke-width="5"/>')
    S.append(f'<circle cx="{cx-20}" cy="420" r="16" fill="#FFFFFF"/>')
    S.append(f'<circle cx="{cx+18}" cy="468" r="7" fill="#FFFFFF" opacity="0.9"/>')

# 腮红
S.append('<ellipse cx="242" cy="530" rx="34" ry="18" fill="#F58BAE" opacity="0.55"/>')
S.append('<ellipse cx="558" cy="530" rx="34" ry="18" fill="#F58BAE" opacity="0.55"/>')
S.append('<g stroke="#F06292" stroke-width="3" stroke-linecap="round" opacity="0.8">'
         '<line x1="228" y1="520" x2="222" y2="540"/><line x1="246" y1="522" x2="240" y2="542"/>'
         '<line x1="572" y1="520" x2="578" y2="540"/><line x1="554" y1="522" x2="560" y2="542"/></g>')

# 鼻子 + 嘴
S.append(f'<polygon points="384,520 416,520 400,538" fill="#F06292" stroke="#D84C7F" stroke-width="3" stroke-linejoin="round"/>')
S.append(f'<g fill="none" stroke="{OUT}" stroke-width="6" stroke-linecap="round">'
         '<path d="M400,538 L400,554"/>'
         '<path d="M400,554 Q380,580 356,562"/>'
         '<path d="M400,554 Q420,580 444,562"/></g>')

# 胡须
S.append(f'<g fill="none" stroke="#8D5A2B" stroke-width="4" stroke-linecap="round" opacity="0.75">'
         '<path d="M215,495 Q140,485 70,465"/><path d="M218,525 Q145,530 75,535"/>'
         '<path d="M215,555 Q145,575 80,600"/>'
         '<path d="M585,495 Q660,485 730,465"/><path d="M582,525 Q655,530 725,535"/>'
         '<path d="M585,555 Q655,575 720,600"/></g>')

# 爪子
for cx in (300, 500):
    S.append(f'<ellipse cx="{cx}" cy="682" rx="72" ry="56" fill="#FBD9A8" stroke="{OUT}" stroke-width="6"/>')
    S.append(f'<g stroke="{OUT}" stroke-width="4" stroke-linecap="round">'
             f'<line x1="{cx-22}" y1="650" x2="{cx-22}" y2="690"/>'
             f'<line x1="{cx+22}" y1="650" x2="{cx+22}" y2="690"/></g>')

S.append('</svg>')

with open("cat.svg", "w", encoding="utf-8") as f:
    f.write("\n".join(S))
print("cat.svg written")
