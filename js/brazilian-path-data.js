/**
 * Brazilian Path Data
 * Contains all stops in the Brazilian journey including farms, partners, cooperatives, and experiences
 */
(function() {
    'use strict';
    
    if (window.BRAZILIAN_PATH_DATA) {
        return; // Already loaded
    }
    
    window.BRAZILIAN_PATH_DATA = {
        'founderhaus': {
            name: 'Founderhaus',
            slug: 'founderhaus',
            lat: -27.4305,
            lon: -48.4306,
            location: 'Florianópolis, Brazil',
            type: 'partner',
            url: '../../partners/founderhaus/index.html',
            description: 'Start your journey at Founderhaus, an innovation hub and community space in Florianópolis where entrepreneurs, creators, and innovators gather. As the starting point of the Brazilian Journey, Founderhaus connects the tech and startup ecosystem with regenerative cacao, fostering collaboration and conscious innovation while supporting rainforest restoration.'
        },
        'vivi-jesus-do-deus-itacare': {
            name: 'Vivi\'s Jesus Do Deus Farm',
            slug: 'vivi-jesus-do-deus-itacare',
            lat: -14.324474,
            lon: -39.014201,
            location: 'Itacaré, Bahia, Brazil',
            type: 'farm',
            url: '../../farms/vivi-jesus-do-deus-itacare/index.html',
            description: 'A former cattle ranch transformed into cabruca agroforestry through a divine calling. Vivi, a former policeman and politician, converted degraded grazing land into a thriving cacao forest, demonstrating the power of vision and commitment to healing the land. The farm now produces top-grade, organically grown cacao while supporting a rich ecosystem of native plants and wildlife.'
        },
        'fazenda-santa-ana-bahia': {
            name: 'Fazenda Santa Ana',
            slug: 'fazenda-santa-ana-bahia',
            lat: -14.3225976,
            lon: -39.1061207,
            location: 'Bahia, Brazil',
            type: 'farm',
            url: '../../farms/fazenda-santa-ana-bahia/index.html',
            description: 'A farm with deep roots in Bahia, known for its rich history and vibrant community traditions. Part of the Coopercabruca cooperative, Fazenda Santa Ana contributes to a network of regenerative cacao producers working together to preserve traditional farming methods while ensuring sustainable livelihoods and maintaining quality standards.'
        },
        'fazenda-capelavelha-bahia': {
            name: 'Fazenda Capelavelha',
            slug: 'fazenda-capelavelha-bahia',
            lat: -14.6173663,
            lon: -39.2711487,
            location: 'Bahia, Brazil',
            type: 'farm',
            url: '../../farms/fazenda-capelavelha-bahia/index.html',
            description: 'A women-owned regenerative organic cacao farm dedicated to sustainable agriculture and empowering women in farming. Capelavelha specializes in innovative cacao processing techniques, including caramelized cacao beans, while serving as a model for sustainable agriculture that supports both the land and the community through gender equity in agriculture.'
        },
        'fazenda-sao-jorge-bahia': {
            name: 'Fazenda São Jorge',
            slug: 'fazenda-sao-jorge-bahia',
            lat: -14.6289989,
            lon: -39.4028297,
            location: 'Itajuípe, Bahia, Brazil',
            type: 'farm',
            url: '../../farms/fazenda-sao-jorge-bahia/index.html',
            description: 'A Coopercabruca member farm in Itajuípe practicing cabruca agroforestry—cacao grown under native forest canopy for biodiversity and nuanced flavor. Fazenda São Jorge is the source of Agroverse shipment AGL6, offering mild, nutty cacao with gentle fruit and floral notes, and transparent farm-to-ledger traceability.'
        },
        'fazenda-analuana-bahia': {
            name: 'Fazenda Analuana',
            slug: 'fazenda-analuana-bahia',
            lat: -15.691646,
            lon: -39.295703,
            location: 'Bahia, Brazil',
            type: 'farm',
            url: '../../farms/fazenda-analuana-bahia/index.html',
            description: 'A regenerative cacao farm operated by Ana Luana in Bahia, Brazil, dedicated to sustainable farming practices and producing high-quality cacao products. The farm specializes in producing cacao molasses—a unique product that showcases the versatility of cacao beyond traditional beans and nibs, demonstrating the farm\'s commitment to value-added processing and creating sustainable livelihoods through regenerative cacao farming.'
        },
        'oscar-bahia': {
            name: 'Oscar\'s Farm',
            slug: 'oscar-bahia',
            lat: -14.052624,
            lon: -39.438206,
            location: 'Bahia, Brazil',
            type: 'farm',
            url: '../../farms/oscar-bahia/index.html',
            description: 'Three generations of cacao wisdom on a 100-year-old farm. Oscar\'s grandfather planted trees 80 years ago that are still producing today—a testament to regenerative farming that spans generations. The farm features 80-year-old Criolla trees yielding 900-1000kg/hectare, proving that well-tended native varieties can thrive for over a century.'
        },
        'coopercabruca': {
            name: 'Coopercabruca Cooperative',
            slug: 'coopercabruca',
            lat: -14.4,
            lon: -39.2,
            location: 'Bahia, Brazil',
            type: 'cooperative',
            url: '../../cooperatives/coopercabruca/index.html',
            description: 'Visit Coopercabruca, a cooperative that supports small-scale cacao farmers in Bahia, working together to preserve traditional farming methods while ensuring sustainable livelihoods. The cooperative brings together regenerative cacao producers who share knowledge, maintain quality standards, and support each other. Coopercabruca was instrumental in Agroverse\'s early shipments, establishing the transparency standards and direct relationships that define our commitment to regenerative cacao sourcing.'
        },
        'cic-cacao-innovation-center': {
            name: 'CIC - Centro de Inovação do Cacau',
            slug: 'cic-cacao-innovation-center',
            lat: -14.7946,
            lon: -39.0503,
            location: 'Ilhéus, Bahia, Brazil',
            type: 'partner',
            url: '../../partners/cic-cacao-innovation-center/index.html',
            description: 'Visit the Centro de Inovação do Cacau (CIC)—Cacao Innovation Center—at the UESC campus in Ilhéus. CIC is where Agroverse sources all lab testing for cacao from Brazilian farmers. Their physical-chemical analyses verify heavy metal levels and quality parameters, ensuring compliance with Brazilian ANVISA regulations. Tour the lab, learn about traceability and quality standards, and see the science behind the regenerative cacao that reaches global markets.'
        },
        'black-king-ilheus': {
            name: 'Black King - Ilhéus Warehouse',
            slug: 'black-king-ilheus',
            lat: -14.7992591,
            lon: -39.0331959,
            location: 'Ilhéus, Bahia, Brazil',
            type: 'partner',
            url: '../../partners/black-king-ilheus/index.html',
            description: 'Visit Black King, operated by Matheus Reis, our trusted exporter and warehouse operator in Ilhéus, Bahia. This critical logistics hub handles the consolidation, quality control, and export preparation of regenerative cacao from farms throughout Bahia. As both a business partner and community member, Matheus and Black King represent the collaborative spirit that makes regenerative cacao possible, connecting Bahia\'s rich agricultural heritage with global markets.'
        },
        'itacare-cultural-experiences': {
            name: 'Itacaré Cultural Immersion',
            slug: 'itacare-cultural-experiences',
            lat: -14.324474,
            lon: -39.014201,
            location: 'Itacaré, Bahia, Brazil',
            type: 'experience',
            url: 'experiences/itacare-cultural-immersion/index.html',
            description: 'Immerse yourself in the vibrant culture of Bahia in Itacaré. Experience capoeira lessons at Tribo Bahia by Bico duro, where you\'ll learn this Afro-Brazilian martial art that combines dance, acrobatics, and music. In the evenings, join the street samba sessions that fill the cobblestone streets with rhythm and energy. Don\'t miss the forró dancing—a traditional Brazilian dance style that brings communities together in celebration. Itacaré offers a perfect blend of beach culture, Afro-Brazilian traditions, and the warm hospitality of Bahia.'
        },
        'salvador-colonial-history': {
            name: 'Salvador: Portuguese Colonial History',
            slug: 'salvador-colonial-history',
            lat: -12.9714,
            lon: -38.5014,
            location: 'Salvador, Bahia, Brazil',
            type: 'experience',
            url: 'experiences/salvador-colonial-history/index.html',
            description: 'Explore Salvador, the first capital of Brazil and a UNESCO World Heritage site. Wander through Pelourinho, the historic center with its colorful colonial architecture, baroque churches, and cobblestone streets. Experience the rich Afro-Brazilian culture that permeates every corner of this vibrant city. Visit the São Francisco Church with its stunning gold-covered interior, and learn about the complex history of Portuguese colonization and the African diaspora. Before continuing your journey north, take time to appreciate the cultural fusion that makes Salvador one of Brazil\'s most captivating cities.'
        },
        'jungle-johnny-amazon-tours': {
            name: 'Jungle Johnny Amazon Tours',
            slug: 'jungle-johnny-amazon-tours',
            lat: -3.1190,
            lon: -60.0217,
            location: 'Manaus, Amazon Rainforest, Brazil',
            type: 'experience',
            url: 'experiences/jungle-johnny-amazon-tours/index.html',
            description: 'Embark on an authentic Amazon rainforest adventure with Jungle Johnny Tours, starting from Manaus. Experience the incredible biodiversity of the Amazon as you navigate through flooded forests, spot pink river dolphins, and learn about the medicinal plants that have been used by indigenous communities for centuries. Sleep in jungle lodges, fish for piranhas, and witness the Meeting of the Waters where the dark Rio Negro and the sandy-colored Solimões River flow side by side without mixing. This immersive experience connects you deeply with the Amazon ecosystem that our regenerative cacao farms help protect and restore.'
        },
        'cargo-boat-manaus-leticia': {
            name: 'Cargo Boat Journey: Manaus to Leticia',
            slug: 'cargo-boat-manaus-leticia',
            lat: -4.2153,
            lon: -69.9406,
            location: 'Leticia, Colombia (border with Brazil & Peru)',
            type: 'experience',
            url: 'experiences/cargo-boat-manaus-leticia/index.html',
            description: 'Complete your Amazon journey with an authentic cargo boat trip upriver from Manaus to Leticia, Colombia, located at the border where Brazil, Colombia, and Peru meet. This 7-day journey on the Amazon River offers a unique perspective on river life, passing through remote communities, witnessing the vastness of the rainforest, and experiencing the rhythm of river transportation that has connected Amazonian communities for centuries. Sleep in hammocks on deck, share meals with fellow travelers, and watch the ever-changing landscape of the world\'s greatest river. This slow journey allows for deep reflection on the interconnectedness of the Amazon ecosystem and the importance of regenerative practices that protect this vital region.'
        },
        'paulo-la-do-sitio-para': {
            name: 'Paulo\'s La do Sitio Farm',
            slug: 'paulo-la-do-sitio-para',
            lat: -3.392213,
            lon: -51.85254,
            location: 'Pará, Amazon Rainforest, Brazil',
            type: 'farm',
            url: '../../farms/paulo-la-do-sitio-para/index.html',
            description: 'An award-winning cacao farm in the Amazon Rainforest of Pará. Part of the CEPOTX cooperative, this farm has won multiple regional cacao awards for quality and regenerative practices.'
        },
        'santa-anna-fazenda-para': {
            name: 'Santa Anna Fazenda',
            slug: 'santa-anna-fazenda-para',
            lat: -3.292475,
            lon: -52.57225,
            location: 'Pará, Amazon Rainforest, Brazil',
            type: 'farm',
            url: '../../farms/santa-anna-fazenda-para/index.html',
            description: 'A cacao farm in the Amazon Rainforest of Pará, introduced to Agroverse by Jedielcio of the CEPOTX cooperative. Site visit August 2026 confirmed regenerative agroforestry, on-farm fermentation, and clean drying practices.'
        },
        'rancho-maranta-para': {
            name: 'Rancho Maranta',
            slug: 'rancho-maranta-para',
            lat: -3.29610,
            lon: -52.58316,
            location: 'Altamira, Pará, Amazon Rainforest, Brazil',
            type: 'farm',
            url: '../../farms/rancho-maranta-para/index.html',
            description: 'The family land of Jedielcio of the CEPOTX cooperative in the Amazon Rainforest of Pará. Two plots — one beside the family house where our first ceremonial cacao trees were planted, and a ~5 hectare family plot offered for the next phase of tree planting. Site visit August 2026, GPS-traced and visible on the SunMint impact map.'
        },
        'raimundo-geniza-para': {
            name: 'Sítio Raimundo & Geniza',
            slug: 'raimundo-geniza-para',
            lat: -3.629911,
            lon: -53.652011,
            location: 'Uruará, Pará, Amazon Rainforest, Brazil',
            type: 'farm',
            url: '../../farms/raimundo-geniza-para/index.html',
            description: 'The new family restoration plot of Raimundo & Geniza in Uruará on the Transamazônica corridor of Pará. U-06-07 — 0.32 hectares registered on the SunMint impact map from a GPS-traced site walk (September 2026), planned for restorative cacao agroforestry.'
        },
        'fazenda-santa-rosa-para': {
            name: 'Fazenda Santa Rosa',
            slug: 'fazenda-santa-rosa-para',
            lat: -3.634141,
            lon: -53.669688,
            location: 'Uruará, Pará, Amazon Rainforest, Brazil',
            type: 'farm',
            url: '../../farms/fazenda-santa-rosa-para/index.html',
            description: 'The family cacao land of Antônio and Graça in the Transamazônica corridor of Pará — plot U-06-06, a ≈4.75 hectare property near Uruará. Members of COPOPS (Cooperativa de Produtos Orgânicos de Perpétuo Socorro, Uruará), a member cooperative of the CEPOTX organic cacao network. September 2026 GPS-traced boundary walk registered on the SunMint impact map.'
        },
        'fazenda-cleide-para': {
            name: 'Fazenda Cleide',
            slug: 'fazenda-cleide-para',
            lat: -3.4138,
            lon: -52.6258,
            location: 'Altamira, Pará, Amazon Rainforest, Brazil',
            type: 'farm',
            url: '../../farms/fazenda-cleide-para/index.html',
            description: 'A family cacao farm in the municipality of Altamira, Pará, farmed by Cleide Maris Suk and Marcelo. Part of the CEPOTX cooperative network, organic certified (IBD/NOP via CEPOTX) with site code B-06-108. Agroverse visited 2 July 2024 on an FSVP site visit.'
        },
        'cepotx': {
            name: 'CEPOTX Cooperative',
            slug: 'cepotx',
            lat: -3.2036111,
            lon: -52.2063889,
            location: 'Ac. 01 - Sudam II, Altamira - PA, 68372-061, Brazil',
            type: 'cooperative',
            url: '../../cooperatives/cepotx/index.html',
            description: 'Visit CEPOTX, a cooperative that supports small-scale cacao farmers in Pará, Brazil, located in the heart of the Amazon Rainforest. The cooperative provides essential resources, knowledge sharing, and market access to help member farms maintain the highest standards of quality and sustainability. Through CEPOTX, small-scale farmers gain access to regenerative farming practices, quality control systems, and fair trade opportunities. Member farms like Paulo\'s La do Sitio produce award-winning cacao that reflects the unique terroir of the Amazon Rainforest.'
        }
    };
})();

