# Export checklist for pixel-perfect handoff

This checklist is the fastest path to exact integration.

## 1) Export one full frame background without dynamic text

Frame size:
- 375x820 (1x)
- 750x1640 (2x, optional but recommended)

File names:
- background-no-text.png
- background-no-text@2x.png

Before export, hide ONLY text that must remain dynamic in app:
- card_name
- card_title
- card_bio
- card_phone
- card_address
- card_website (if used)

Keep visible:
- static decorative shapes
- static icons
- static labels that never change

## 2) Export typography metadata into typography.json

Use the file [typography.json](typography.json) and fill all fields from Figma.

Measurement rules:
- Coordinates must be in frame pixels relative to top-left (x, y, width, height).
- Use the same base frame: 375x820.
- Keep letterSpacing in pixels.
- Keep lineHeight in pixels.

## 3) Fonts

If font is not from Google Fonts, put files into [fonts](fonts):
- preferred: .woff2
- allowed: .ttf or .otf

Important:
- only include fonts with valid web license.

## 4) Figma export settings

PNG:
- scale: 1x and 2x
- no compression artifacts
- no extra transparent padding

SVG (optional):
- disable Outline Text / Convert text to outlines
- verify that text remains as <text>, not converted to <path>

## 5) Final handoff package

Place all files into [design/figma_drop](.) root:
- background-no-text.png
- background-no-text@2x.png (optional)
- typography.json
- fonts/* (only if needed)

## 6) Quick self-check before sending

- background size is exactly 375x820
- no dynamic text is baked into background image
- typography.json has non-zero x/y/width/height/fontSize/lineHeight
- text layer names match fields (card_name, card_title, card_bio, card_phone, card_address, card_website)
