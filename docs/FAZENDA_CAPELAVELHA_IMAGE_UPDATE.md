# Fazenda Capelavelha Image Update

## Current Status

The farm profile pages are currently using a generic cacao farm image as a placeholder instead of the shipment image (agl10.avif).

## Website Information

**Fazenda Capelavelha Website**: https://www.fazendacapelavelha.com.br/

**About the Farm**:
- Historic cacao farm established in the 19th century
- Located along BA 262 ("Estrada do Chocolate") between Ilhéus and Uruçuca, Bahia
- Revitalized in 2011 after the "witch's broom" crisis
- Known for the "Sprouting Process" - a unique cold fermentation technique
- Offers "Experiência DOCACAO" - a cacao production experience

**Contact**:
- Email: taislorentz@gmail.com
- Phone: (73) 99903-0123
- Address: DOCACAO IND E COM DE CACAU LTDA, Faz Capela Velha – Margem Direita do Rio Mocambo SN Zona Rural, CAIXA POSTAL 18 - URUÇUCA BA, 45680-000

## Files Updated

1. **`/farms/fazenda-capelavelha-bahia/index.html`**:
   - Hero section background image changed from shipment image to generic cacao farm image
   - Meta tags (og:image, twitter:image) still reference shipment image (should be updated when proper image is available)

2. **`/index.html`**:
   - Farmer card image changed from shipment image to generic cacao farm image

## Next Steps

To use a proper farm image from the Fazenda Capelavelha website:

1. Visit https://www.fazendacapelavelha.com.br/
2. Download an appropriate farm image (farm landscape, cacao trees, farm facilities, etc.)
3. Save the image to `/assets/raw/` or an appropriate location
4. Update image references in:
   - `/farms/fazenda-capelavelha-bahia/index.html` (hero section background)
   - `/index.html` (farmer card image)
   - Update meta tags (og:image, twitter:image) in farm page

## Note

The shipment image (agl10.avif) should remain on the AGL10 shipment page as it represents the specific shipment, not the farm itself.

