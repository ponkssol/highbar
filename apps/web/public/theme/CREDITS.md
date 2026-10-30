# Arena theme assets: sources and licenses

Every asset in this folder (and the inline art in `components/arena.tsx`) is free for commercial use. The look takes cues from colosseum.com (engraved line art, paper and stone texture, hairline frames, mono labels) but no logo, wordmark, photo, illustration, texture or font from that site is used or copied here. Everything below was drawn or generated from scratch.

| Asset | Type and size | Source | Author | License |
|---|---|---|---|---|
| `arcade.svg` | Engraved arena line art (three storeys of arches along a curved bowl, vertical hatching in the openings, faint floor rings), about 55 KB, used as a CSS mask in hero banners at 7 to 10% opacity | Self-made: generated geometry from a small Python script (arch rows on an elliptical curve), no reference image traced | highbar team | Original work, CC0 1.0 (public domain dedication) |
| `stone.webp` | Weathered stone texture, 1600 x 420 grayscale WebP, about 80 KB, mean gray 128 so it blends with soft light, hero banners only | Self-made: procedural noise (fractal value noise, ridged cracks with a light emboss, faint veins), seeded NumPy script | highbar team | Original work, CC0 1.0 |
| `grain.png` | Film grain tile, 192 x 192 RGBA PNG, about 37 KB, white and black specks with low alpha, tiled over the whole app at 4 to 8% opacity | Self-made: seeded Gaussian noise, NumPy script | highbar team | Original work, CC0 1.0 |
| Hairline divider, hero frame, warm washes, rank badges (`components/arena.tsx`, `app/globals.css`) | CSS only (1px hairlines, a small hollow diamond, layered gradients) | Self-made | highbar team | Original work, CC0 1.0 |
| Cinzel font | Webfont, self-hosted at build time via `next/font/google`, headings and rank numerals | https://fonts.google.com/specimen/Cinzel (license: https://github.com/google/fonts/blob/main/ofl/cinzel/OFL.txt) | Natanael Gama and The Cinzel Project Authors (https://github.com/NDISCOVER/Cinzel) | SIL Open Font License 1.1 |
| EB Garamond font | Webfont, self-hosted at build time via `next/font/google`, banner intro text only | https://fonts.google.com/specimen/EB+Garamond (license: https://github.com/google/fonts/blob/main/ofl/ebgaramond/OFL.txt) | Georg Duffner and Octavio Pardo (https://github.com/octaviopardo/EBGaramond12) | SIL Open Font License 1.1 |

Licenses verified on the source pages on 2026-10-30. The OFL allows bundling and commercial use, the fonts are not sold on their own.
The logo (`public/brand/*`) is the project's own brand asset and is not part of this theme pack.
