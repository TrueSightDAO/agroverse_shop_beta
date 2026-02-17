#!/bin/bash

# Script to update all HTML files to use conditional Google Analytics loader
# This replaces the inline Google Analytics code with a script tag that loads js/google-analytics.js

echo "Updating Google Analytics in all HTML files..."

# Find all HTML files
find . -name "*.html" -type f ! -path "./node_modules/*" ! -path "./.git/*" | while read -r file; do
    # Determine the relative path to js/google-analytics.js based on file location
    # Count directory depth
    depth=$(echo "$file" | tr -cd '/' | wc -c)
    
    # Build relative path (go up one level for each directory)
    relative_path=""
    for ((i=1; i<=depth; i++)); do
        relative_path="../$relative_path"
    done
    relative_path="${relative_path}js/google-analytics.js"
    
    # Check if file contains Google Analytics code
    if grep -q "googletagmanager.com/gtag/js" "$file"; then
        echo "Updating: $file"
        
        # Create a temporary file
        temp_file=$(mktemp)
        
        # Replace Google Analytics code with script tag
        # Handle different indentation levels
        sed -E 's|<!-- Google tag \(gtag\.js\) -->|<script src="'"$relative_path"'"></script>|g' "$file" | \
        sed -E '/<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js/d' | \
        sed -E '/window\.dataLayer = window\.dataLayer \|\| \[\];/d' | \
        sed -E '/function gtag\(\)\{dataLayer\.push\(arguments\);\}/d' | \
        sed -E '/gtag\('\''js'\'', new Date\(\)\);/d' | \
        sed -E '/gtag\('\''config'\'', '\''G-S6EP25EHF4'\''\);/d' | \
        sed -E '/<\/script>/d' > "$temp_file"
        
        # Only update if the replacement was successful
        if [ $? -eq 0 ]; then
            mv "$temp_file" "$file"
            echo "  ✓ Updated"
        else
            rm "$temp_file"
            echo "  ✗ Failed"
        fi
    fi
done

echo "Done!"
