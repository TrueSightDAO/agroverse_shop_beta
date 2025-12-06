#!/bin/bash
# Script to fix QR code mobile overflow issue in all shipment pages

cd "$(dirname "$0")"

# Find all shipment index.html files
find shipments -name "index.html" -type f -not -path "shipments/index.html" | while read file; do
    echo "Fixing: $file"
    
    # Check if file already has the mobile QR fix
    if grep -q "QR Code Mobile Responsive Fix" "$file"; then
        echo "  Already fixed, skipping..."
        continue
    fi
    
    # Add the mobile responsive CSS before the closing </style> tag
    sed -i.bak '/^        <\/style>$/i\
        @media (max-width: 768px) {\
            [id^="qr-code-display-"] {\
                padding: 1rem !important;\
                margin-left: 1rem;\
                margin-right: 1rem;\
                max-width: calc(100% - 2rem);\
                box-sizing: border-box;\
                word-wrap: break-word;\
                overflow-wrap: break-word;\
            }\
            \
            [id^="qr-code-display-"] > div:last-child {\
                font-size: 12px !important;\
            }\
            \
            [id^="qr-code-value-"] {\
                font-size: 16px !important;\
                letter-spacing: 1px !important;\
                word-break: break-all;\
                overflow-wrap: break-word;\
                display: inline-block;\
                max-width: 100%;\
            }\
        }\
        \
        @media (max-width: 480px) {\
            [id^="qr-code-display-"] {\
                padding: 0.75rem !important;\
                margin-left: 0.5rem;\
                margin-right: 0.5rem;\
                max-width: calc(100% - 1rem);\
                font-size: 14px !important;\
            }\
            \
            [id^="qr-code-value-"] {\
                font-size: 14px !important;\
                letter-spacing: 0.5px !important;\
            }\
        }\
' "$file"
    
    # Remove backup file
    rm -f "${file}.bak"
    
    echo "  ✓ Fixed"
done

echo "Done!"

