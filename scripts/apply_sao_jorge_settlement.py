#!/usr/bin/env python3
"""
Manually apply the São Jorge [REPACKAGING SETTLEMENT EVENT] that Edgar logged
(Telegram Chat Logs row 11274) but whose production processor never ran.

Faithfully reproduces the deterministic settlement writes:
  1. offchain transactions  : -1.649 Cacao Almonds; +25 bars; +229 tea (Gary Teh)
     (offchain asset location recomputes from these by SUM(type,handler))
  2. Currencies metadata     : C=TRUE, E/F/G/H/I/J, M=SKU (bar only)
  3. Telegram Chat Logs col R : PROCESSED:REPACKAGING_SETTLEMENT (dedup guard)

Dry-run by default; pass --apply to write.
"""
import sys
import requests
import gspread
from google.oauth2.service_account import Credentials

MAIN_ID = "1GE7PUq-UT6x2rBN-Q2ksogbWpgyuh2SaxJyG_uEK6PU"
OPS_ID = "1qbZZhf-_7xzmDTriaJVWj6OZshyQsFkdsAV8-pyzASQ"
COMP_URL = ("https://raw.githubusercontent.com/TrueSightDAO/agroverse-inventory/"
            "main/currency-compositions/e963c8ff-4520-4b52-a5c7-3abfaae963fb.json")
LOG_ROW = 11274  # Telegram Chat Logs row for this settlement
HOLDER = "Gary Teh"
DATE = "20260710"

LANDING = "https://www.agroverse.shop/farms/fazenda-sao-jorge-bahia/"
LEDGER = "https://www.truesight.me/agroverse-shipments/agl4"
FARM, STATE, COUNTRY, YEAR = "Fazenda São Jorge", "Bahia", "Brazil", "2024"
SKU_MAP = {"81": "organic-81-dark-chocolate-bar-50g-fazenda-sao-jorge-bahia-2024"}
RID = "e963c8ff-4520-4b52-a5c7-3abfaae963fb"


def resolve_sku(currency):
    for k, v in SKU_MAP.items():
        if k in currency:
            return v
    return None


def main(argv):
    apply = "--apply" in argv
    comp = requests.get(COMP_URL, timeout=30).json()
    inputs, outputs = comp["inputs"], comp["outputs"]

    scope = ['https://spreadsheets.google.com/feeds',
             'https://www.googleapis.com/auth/drive']
    creds = Credentials.from_service_account_file(
        'google-service-account.json', scopes=scope)
    gc = gspread.authorize(creds)
    main_ss = gc.open_by_key(MAIN_ID)
    ops_ss = gc.open_by_key(OPS_ID)

    tx = main_ss.worksheet('offchain transactions')
    cur = main_ss.worksheet('Currencies')
    logs = ops_ss.worksheet('Telegram Chat Logs')

    # ---- Build offchain transactions rows: Date|Desc|Handler|Amount|Type|_|_ ----
    tx_rows = []
    for inp in inputs:
        if inp.get("line_kind") != "from_holder_inventory":
            continue
        tx_rows.append([DATE,
                        "[REPACKAGING SETTLEMENT EVENT] %s input depletion" % RID,
                        HOLDER, -float(inp["quantity"]), inp["currency"], "", ""])
    for o in outputs:
        tx_rows.append([DATE,
                        "[REPACKAGING SETTLEMENT EVENT] %s output" % RID,
                        HOLDER, float(o["units"]), o["suggested_currency"], "", ""])

    print("=== offchain transactions rows to append ===")
    for r in tx_rows:
        print("  ", r[3], "|", r[4][:70])

    # ---- Currencies metadata updates ----
    cur_vals = cur.get_all_values()
    meta_updates = []  # (rownum, {col:val})
    for o in outputs:
        name = o["suggested_currency"]
        rownum = None
        for i, rr in enumerate(cur_vals):
            if rr and rr[0].strip() == name.strip():
                rownum = i + 1
                break
        if not rownum:
            print("  !! Currencies row NOT FOUND for:", name[:60])
            continue
        rr = cur_vals[rownum - 1]

        def empty(idx):
            return len(rr) <= idx or not str(rr[idx]).strip()
        upd = {}
        if empty(2):
            upd[3] = "TRUE"
        if empty(4):
            upd[5] = LANDING
        if empty(5):
            upd[6] = LEDGER
        if empty(6):
            upd[7] = FARM
        if empty(7):
            upd[8] = STATE
        if empty(8):
            upd[9] = COUNTRY
        if empty(9):
            upd[10] = YEAR
        sku = resolve_sku(name)
        if sku and empty(12):
            upd[13] = sku
        meta_updates.append((rownum, name, upd))
        print("=== Currencies row", rownum, name[:55], "===")
        print("   ", {("col" + chr(64 + k)): v for k, v in upd.items()})

    print("=== dedup marker: Telegram Chat Logs row", LOG_ROW,
          "col R -> PROCESSED:REPACKAGING_SETTLEMENT ===")

    if not apply:
        print("\nDRY-RUN. Re-run with --apply to write.")
        return 0

    # ---- Writes ----
    tx.append_rows(tx_rows, value_input_option='USER_ENTERED')
    print("appended", len(tx_rows), "tx rows")
    for rownum, name, upd in meta_updates:
        for col, val in upd.items():
            cur.update_cell(rownum, col, val)
        print("updated Currencies row", rownum)
    logs.update_cell(LOG_ROW, 18, "PROCESSED:REPACKAGING_SETTLEMENT")
    print("marked log row", LOG_ROW, "processed")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
