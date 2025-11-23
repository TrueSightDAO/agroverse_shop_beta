/**
 * Legacy URL Redirects Map
 *
 * This file contains mappings from legacy agroverse.shop URLs to new URLs.
 * Auto-generated from legacy_agroverse_shop_URL_Redirects_Export.csv
 *
 * Format:
 *   '/old-url': '/new-url'           - Internal redirect
 *   '/old-url': 'https://external'   - External redirect
 *
 * IMPORTANT:
 * - All paths should start with '/'
 * - Use exact path matches (case-sensitive)
 * - Do not edit manually - regenerate from CSV instead
 */

const LEGACY_REDIRECTS = {
  '/affiliate': 'https://66d670a6-143a-42ce-a094-24df4d0c18be.goaffpro.com',
  '/agl1': 'https://docs.google.com/spreadsheets/d/1iCUDf0ZmWCD5KjzmNVKWEOyBR8JpvfjBIgPok4EMios/edit#gid=0',
  '/agl10': 'https://docs.google.com/spreadsheets/d/13BbbbfcVApCEAjh92o5ATLBxrHxTDDYHOKfQZNl_v7w/edit?gid=1930053694#gid=1930053694',
  '/agl13': 'https://docs.google.com/spreadsheets/d/1w3D0y9iPMu7kR9SuS6WNmIAym6FGUql9vUL2pD_qGR4/edit?gid=2133986329#gid=2133986329',
  '/agl14': 'https://docs.google.com/spreadsheets/d/18ZfEddlEwcNYTc6H0FHtfG948yZ8xCWMY_FmSsIv8cc/edit?gid=129566210#gid=129566210',
  '/agl2': 'https://docs.google.com/spreadsheets/d/1DTTTly1VEGoXc4XGa3F9z1ul1_1Pd9kwer81qhy07n8/edit#gid=1679004028',
  '/agl3': 'https://docs.google.com/spreadsheets/d/1ji-p9z6fMhb0A30lsW2r0hryzJGsDRBgM3vRnn9tCiU/edit?gid=0#gid=0',
  '/agl4': 'https://docs.google.com/spreadsheets/d/1Uo5p3nzWsD6HIw98tCiNYSBmSjXeGkdmopsXpket1Mc/edit?gid=0#gid=0',
  '/agl5': 'https://docs.google.com/spreadsheets/d/1OlKC7XZHXdZ83vAie6CJn4h3mY1CdW07Tkh2vCL_YO4/edit?gid=2133986329#gid=2133986329',
  '/agl6': 'https://docs.google.com/spreadsheets/d/186vHg-baSaT9BlueDYMB58Cq6HIETgf3hu1GaOGAJvE/edit?gid=1930053694#gid=1930053694',
  '/agl7': 'https://docs.google.com/spreadsheets/d/1gJKOXf2qE2LwqtxjS-_1KerrKer20Zi1GTppZpB5n1k/edit?gid=2133986329#gid=2133986329',
  '/agl8': 'https://docs.google.com/spreadsheets/d/1pdI1lMChyD2-3mEaQr8krkzQUeFQ60JMz57IbfO-qLE/edit?gid=2133986329#gid=2133986329',
  '/agl9': 'https://docs.google.com/spreadsheets/d/1ToGXiMZmJnx1XkslDes9Bc7lMosSH4NZuD9setPRiHc/edit?gid=1930053694#gid=1930053694',
  '/blank-1': '/recipe',
  '/cacao-farm-onboarding': 'https://forms.gle/itYHjuKPRJzSciqF9',
  '/community-distributor/agreement': 'https://docs.google.com/document/d/1n3wKmVa-kOjmbVJlfVvskep6rNbOfGGPF1QUTNrUi08/edit?usp=sharing',
  '/community-warehouse-manager/sla': 'https://docs.google.com/document/d/1FA_NpmwbnnCuV0m46UlfjbVdQvdF92594xcwUDu3JvI/edit?tab=t.0',
  '/consignments': 'https://docs.google.com/spreadsheets/d/1GE7PUq-UT6x2rBN-Q2ksogbWpgyuh2SaxJyG_uEK6PU/edit?gid=1401078120#gid=1401078120',
  '/content-schedule': 'https://docs.google.com/spreadsheets/d/1ghZXeMqFq97Vl6yLKrtDmMQdQkd-4EN5yQs34NA_sBQ/edit?gid=1682511679#gid=1682511679',
  '/content-schedule/bot': 'https://github.com/TrueSightDAO/market_research/actions',
  '/general-clean': '/heart-healthy-cocoa-glazed-chinese-style-garlic-eggplant',
  '/general-clean-1': '/keto-cacao-crunch-smoothie',
  '/heart-healthy-cocoa-glazed-chinese-style-garlic-eggplant': '/recipes-3',
  '/keto-cacao-nibs-bomb': '/recipes-2',
  '/onboarded-farms': 'https://docs.google.com/spreadsheets/d/1d2nxU5RIhXD8vQFpT1xKXpRLc70guX-daHUD5Hnrqx8/edit?gid=1320005236#gid=1320005236&resourcekey=',
  '/recipes': '/cacao-espresso',
  '/recipes-1': '/breakfast-cacao-smoothie',
  '/recipes-2': '/cacao-nibs-keto-bombs',
  '/recipes-3': '/cacao-glazed-eggplant',
  // Note: Wildcard patterns /recipes/{title} and /recipes-1/{title} are handled in 404.html
  '/trees-planted': 'https://docs.google.com/spreadsheets/d/1qbZZhf-_7xzmDTriaJVWj6OZshyQsFkdsAV8-pyzASQ/edit?gid=176124122#gid=176124122',
  '/white-paper': 'https://docs.google.com/document/d/1b3JiawnqA1QNpA_XZMH6oNQ9ZVJnLRGtOWzM31YLvJs/edit'
};

// Make it globally available
if (typeof window !== 'undefined') {
  window.LEGACY_REDIRECTS = LEGACY_REDIRECTS;
}