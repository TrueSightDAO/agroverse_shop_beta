#!/usr/bin/env python3
"""Blog listing cards: map each post slug to a *source* image, build 640px JPEGs, write blog/index.html.

Source selection: prefer the post's first in-body /assets image (see agentic_ai_context + docs); text-only
posts use curated photos. **Listing URLs** always point at assets/images/blog/listing-640w/{slug}.jpg for
faster loads. Run this script after changing MAP or source files.
"""

import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BLOG = ROOT / "blog/index.html"
LISTING_DIR = ROOT / "assets/images/blog/listing-640w"
LISTING_WEB_PATH = "/assets/images/blog/listing-640w"
MAX_EDGE = 640
JPEG_QUALITY = 80

# Full-resolution (or editorial) source per slug — NOT linked directly from the listing page.
MAP = {
    "brazil-commodity-vs-origin-cacao-food-grade": "/assets/images/partners/cic/gary-emelin-cic-oscar-farm.jpg",
    "bahia-cacao-belt-farms-harvest-guide": "/assets/images/partners/cic/christiano-orlantildes-gary.jpg",
    "cabruca-cacao-biodiversity-brazil": "/assets/images/partners/black-king/matheus-emelin-clara-fernando-farm.jpg",
    "brazil-cacao-processing-flower-to-bar": "/assets/images/partners/black-king/ilheus-warehouse.jpg",
    "single-estate-brazil-cacao-for-brands": "/assets/images/blog-posts/single-estate-vs-single-origin-infographic.png",
    "wholesale-brazilian-cacao-buyer-checklist": "/assets/images/farms/fazenda-santa-ana-itacare.jpg",
    "ceremonial-cacao-brazil-respectful-sourcing": "/assets/images/farms/paulo.jpg",
    "brazil-cacao-genetics-and-flavor": "/assets/images/products/fazenda-santa-ana-product.jpg",
    "brazil-cacao-climate-agroforestry-resilience": "/assets/images/products/la-do-sitio-farm.jpg",
    "brazil-cacao-brand-origin-story-playbook": "/assets/images/products/taste-of-rainforest.jpeg",
    "cacao-minerals-benefits-and-bean-uses-a-deep-dive": "/assets/images/shipments/sao-jorge-matheus-mailan-cacao-pods.jpg",
    "single-estate-vs-single-origin-why-it-matters": "/assets/images/products/oscars-farm.jpeg",
    "the-heart-of-brazilian-cacao-bahia-and-amazon-origins": "/assets/images/blog-posts/The_Heart_of_Brazilian_Cacao__Bahia_and_Amazon_Origins_0e2cde_256b90673cf44a5696a5fbe3bd891c35_mv2.png",
    "unveiling-cacao-bean-flavor-profiles-insights-from-global-tasting-tools-and-brazilian-expertise": "/assets/images/blog-posts/Unveiling_Cacao_Bean_Flavor_Profiles__Insights_from_Global_Tasting_Tools_and_Brazilian_Expertise_0e2cde_8a929faa18c34a7592497e6ba057bafc_mv2.jpg",
    "okanogan-regenerative-cacao-journey": "/assets/images/blog-posts/From_Brazil_to_Your_Table__The_Journey_of_Regenerative_Cacao_0e2cde_cd765a3cf408426eab94428171adbe9e_mv2.jpg",
    "vote-for-the-artwork-on-the-first-series-of-our-2024-limited-edition-paulo-s-farm-cacao-collection": "/assets/images/blog-posts/Vote_for_the_Artwork_on_the_First_Series_of_Our_2024_Limited_Edition_Paulo_s_Farm_Ceremonial_Cacao_Collection__0e2cde_908255537842431aa1e3adbc5b9f4734_mv2.jpg",
    "ceremonial-cacao-and-the-art-of-being-from-biohacking-to-presence": "/assets/images/blog-posts/ceremonial-cacao-and-the-art-of-being-from-biohacking-to-presence_f8e133_31ef832e03114374a683acf5004d8178_mv2.jpg",
    "the-magic-of-terroir-how-place-shapes-the-extraordinary-flavors-of-cacao": "/assets/images/farms/paulo_profile_photo.jpeg",
    "the-connection-between-wildfires-and-climate-change-a-growing-global-crisis": "/assets/images/blog-posts/The_Connection_Between_Wildfires_and_Climate_Change__A_Growing_Global_Crisis_889769_94bd35760cac47259294582c0554c567_mv2.jpg",
    "agroverse-and-the-center-sf-a-partnership-rooted-in-regeneration-and-community": "/assets/images/blog-posts/Agroverse_and_The_Center_SF__A_Partnership_Rooted_in_Regeneration_and_Community_0e2cde_cb17c96a1c724f49a66dbf189d98b8b9_mv2.jpg",
    "trends-driving-deforestation-in-the-amazon-rainforest-and-how-agroforestry-can-reverse-them": "/assets/images/blog-posts/Trends_Driving_Deforestation_in_the_Amazon_Rainforest_and_How_Agroforestry_Can_Reverse_Them_889769_d6f21881f3234f56a02d4ee9b9047afe_mv2.jpg",
    "agroverse-partners-with-green-gulch-zen-monastery-to-offer-regenerative-cacao-nibs-to-marin-county-c": "/assets/images/blog-posts/Agroverse_Partners_with_Green_Gulch_Zen_Monastery_to_Offer_Regenerative_Amazonian_Cacao_Nibs_to_Marin_County_Community_0e2cde_96b5fad668da44baaf02d1a1a48b34e7_mv2.webp",
    "how-stem-cells-regenerate-with-regular-cacao-consumption": "/assets/images/blog-posts/How_Stem_Cells_Regenerate_with_Regular_Cacao_Consumption_889769_aeb44d9d4ebf4a029e1f9f36ed3a6de5_mv2.jpg",
    "agroverse-partners-with-mestre-bico-duro-to-bring-capoeira-fitness-and-cacao-circle-gatherings-to-th": "/assets/images/blog-posts/Agroverse_Partners_with_Mestre_Bico_Duro_to_Bring_Capoeira_Fitness_and_Cacao_Circle_Gatherings_to_the_USA_0e2cde_c446f62f5a2d42f89e4c0285f46b72f9_mv2.png",
    "the-joy-of-cacao-circles-connections-and-community": "/assets/images/blog-posts/The_Joy_of_Cacao_Circles__Connections_and_Community_0e2cde_c4d7b3e098aa4cd8bbaaa60eeb6258eb_mv2.png",
    "understanding-cabruca-a-traditional-agroforestry-practice-for-amazonian-rainforest-conservation": "/assets/images/blog-posts/Understanding_Cabruca__A_Traditional_Agroforestry_Practice_for_Amazonian_Rainforest_Conservation_0e2cde_9b52e8f381594d9e9f909bc0e3eedc89_mv2.jpeg",
}


def _sips_dims(path: Path) -> tuple[int, int]:
    out = subprocess.check_output(
        ["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(path)],
        text=True,
    )
    w = h = 0
    for line in out.splitlines():
        if "pixelWidth" in line:
            w = int(line.split(":")[-1].strip())
        if "pixelHeight" in line:
            h = int(line.split(":")[-1].strip())
    return w, h


def build_listing_jpeg(slug: str, source_rel: str) -> tuple[int, int]:
    src = ROOT / source_rel.lstrip("/")
    if not src.exists():
        raise SystemExit(f"Missing source for {slug}: {source_rel}")
    LISTING_DIR.mkdir(parents=True, exist_ok=True)
    out = LISTING_DIR / f"{slug}.jpg"
    subprocess.run(
        [
            "sips",
            "-Z",
            str(MAX_EDGE),
            "-s",
            "format",
            "jpeg",
            "-s",
            "formatOptions",
            str(JPEG_QUALITY),
            str(src),
            "--out",
            str(out),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return _sips_dims(out)


def replace_card_img(html: str, slug: str, listing_src: str, width: int, height: int) -> str:
    marker = f'href="/post/{slug}/"'
    i = html.find(marker)
    if i == -1:
        raise ValueError(f"Missing link: {slug}")
    j = html.find("<img", i)
    k = html.find(">", j)
    if j == -1 or k == -1 or k - j > 2000:
        raise ValueError(f"Missing img near link: {slug}")
    old = html[j : k + 1]
    alt_m = re.search(r'alt="([^"]*)"', old)
    alt = alt_m.group(1) if alt_m else ""
    new_tag = (
        f'<img src="{listing_src}" alt="{alt}" class="blog-card-image" '
        f'width="{width}" height="{height}" loading="lazy" decoding="async">'
    )
    return html[:j] + new_tag + html[k + 1 :]


def main():
    dims: dict[str, tuple[int, int]] = {}
    for slug, src_rel in MAP.items():
        dims[slug] = build_listing_jpeg(slug, src_rel)

    html = BLOG.read_text(encoding="utf-8")
    for slug in MAP:
        w, h = dims[slug]
        listing_src = f"{LISTING_WEB_PATH}/{slug}.jpg"
        html = replace_card_img(html, slug, listing_src, w, h)

    thumbs = re.findall(
        r'src="(/assets/images/blog/listing-640w/[^"]+\.jpg)"[^>]*class="blog-card-image"',
        html,
    )
    if len(thumbs) != len(MAP):
        raise SystemExit(f"Expected {len(MAP)} listing thumbnails, found {len(thumbs)}")
    if len(set(thumbs)) != len(thumbs):
        raise SystemExit("Duplicate listing thumbnail URLs")

    hashes = []
    for slug in MAP:
        p = LISTING_DIR / f"{slug}.jpg"
        h = subprocess.check_output(["md5", "-q", str(p)], text=True).strip()
        hashes.append(h)
    if len(hashes) != len(set(hashes)):
        raise SystemExit("Duplicate MD5 among generated listing JPEGs (identical images)")

    BLOG.write_text(html, encoding="utf-8")
    print(f"Wrote {len(MAP)} JPEGs under {LISTING_DIR} and updated {BLOG}")


if __name__ == "__main__":
    main()
